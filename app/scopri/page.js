"use client";

import { paletteAggiornata } from "@/lib/stagioni";

import { useEffect, useState } from "react";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { BRAND, COLORS_OF_YEAR } from "@/lib/data";
import { apiFetch, getUser } from "@/lib/session";

export default function Scopri() {
  const [saved, setSaved] = useState([]);
  const [palette, setPalette] = useState([]);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("dress:session") || "null");
      if (s?.result?.palette) {
        setPalette(paletteAggiornata(s.result));
      }
    } catch {}
    try {
      const items = JSON.parse(localStorage.getItem("dress:savedItems") || "[]");
      setSaved(items.slice(0, 6));
    } catch {}
    // Se c'è una sessione attiva, i dati del profilo hanno la precedenza.
    (async function trySync() {
      try {
        const user = await getUser();
        if (!user) return;
        setSignedIn(true);
        const { profile } = await apiFetch('/api/profile/get');
        // Anche qui la palette si riprende dalla stagione: quella salvata sul
        // profilo è ferma al giorno dell'analisi.
        if (profile?.palette) {
          setPalette(paletteAggiornata({ season: profile.dati?.season, palette: profile.palette }));
        }
        if (profile?.saved_outfits?.length) setSaved(profile.saved_outfits.slice(0, 6));
      } catch (e) {
        /* offline o sessione scaduta: restano i dati locali */
      }
    })();
  }, []);

  function colorMatches(hex) {
    if (!hex) return false;
    const h = hex.toLowerCase();
    return palette.some((p) => (p.hex || "").toLowerCase() === h);
  }

  async function saveToCloud() {
    if (!palette?.length) {
      alert('Nessuna palette da salvare.');
      return;
    }
    if (!signedIn) {
      alert('Per salvare la palette serve un account: iscriviti da "Inizia".');
      return;
    }
    try {
      await apiFetch('/api/profile/save', { method: 'POST', body: { palette } });
      alert('Palette salvata sul tuo account.');
    } catch (e) {
      alert(e.code === 'EMAIL_NOT_CONFIRMED'
        ? "Conferma prima l'email: trovi il link nella mail che ti abbiamo mandato."
        : 'Non sono riuscito a salvare: ' + e.message);
    }
  }

  return (
    <div>
      <section className="wrap" style={{ paddingTop: "clamp(28px, 6vw, 80px)", paddingBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <BrandMark />
            <div>
              <div style={{ fontSize: 13, color: "var(--greige)", letterSpacing: "0.12em" }}>PERSONAL STYLING</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{BRAND}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/dashboard" className="btn">Apri Dashboard</Link>
            <Link href="/start" className="btn ghost">Nuova analisi</Link>
            <button className="btn" onClick={saveToCloud}>Salva su cloud</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 18, marginTop: 28, alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <h1 className="h1">Vestirsi bene non è questione di gusto.<br />È questione di sapere quali sono i tuoi colori.</h1>
            <p className="muted" style={{ maxWidth: "46ch" }}>
              Dress guarda una tua foto e trova i colori che ti stanno meglio. Poi cerca fra
              oltre 68.000 capi veri, di negozi veri, quelli di quei colori — nella tua taglia
              e dentro il tuo budget. In pochi secondi, senza uscire dall’app.
            </p>

            <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
              <Link href="/start" className="btn">Scopri il tuo stile</Link>
              <Link href="/dashboard" className="btn ghost">I miei preferiti</Link>
            </div>
          </div>

          <aside style={{ width: 320 }}>
            <div className="card" style={{ padding: 16 }}>
              <div className="eyebrow">Palette corrente</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {palette.length ? palette.map((c, i) => (
                  <div key={i} style={{ width: 40, height: 40, borderRadius: 8, background: c.hex, border: '1px solid rgba(0,0,0,0.08)' }} title={`${c.name} ${c.hex}`} />
                )) : <div className="muted">Nessuna palette ancora — crea una analisi</div>}
              </div>
            </div>

            <div className="card" style={{ padding: 12, marginTop: 12 }}>
              <div className="eyebrow">Colori dell'anno</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {COLORS_OF_YEAR.map((c) => (
                  <div key={c.hex} style={{ width: 64, textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 8, margin: '0 auto', background: c.hex, boxShadow: colorMatches(c.hex) ? '0 0 0 3px rgba(0,0,0,0.06) inset' : undefined }} />
                    <div style={{ fontSize: 12, marginTop: 6 }}>{c.name.split(' ')[0]}</div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <hr className="thread" />

      <section className="wrap" style={{ paddingTop: 36 }}>
        <div className="section-title">
          <p className="eyebrow">Perché funziona</p>
          <span className="muted">Nessun quiz, nessuna teoria: capi che puoi comprare</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
          <div className="card" style={{ padding: 20 }}>
            <div className="eyebrow">Palette personale</div>
            <p className="muted">Dodici colori scelti sulla luce del tuo viso, non su un questionario.</p>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div className="eyebrow">Outfit</div>
            <p className="muted">Combinazioni pratiche con link per acquistare o trovare usato.</p>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div className="eyebrow">Offerte & preferiti</div>
            <p className="muted">Segna i tuoi retailer preferiti e ricevi suggerimenti mirati.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
