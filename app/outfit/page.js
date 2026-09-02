"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import OutfitPeriodo from "@/components/OutfitPeriodo";
import { periodoCorrente } from "@/lib/periodiAnno";
import { paletteAggiornata, paletteDelPeriodo } from "@/lib/stagioni";
import { spiegaStile } from "@/lib/data";
import Attesa from "@/components/Attesa";

// I quattro completi dell'anno, dello stile scelto, nei propri colori.
export default function Outfit() {
  const [palette, setPalette] = useState([]);
  const [stile, setStile] = useState("");
  const [stiliDisponibili, setStiliDisponibili] = useState([]);
  const [genere, setGenere] = useState("");
  const [budget, setBudget] = useState("");
  const [forma, setForma] = useState("");
  const [altezza, setAltezza] = useState("");
  const [completi, setCompleti] = useState([]);
  const [periodo, setPeriodo] = useState(periodoCorrente());
  const [caricamento, setCaricamento] = useState(true);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("dress:session") || "null");
      if (s?.result?.palette?.length) setPalette(paletteAggiornata(s.result));
      if (s?.result?.stili?.length) setStiliDisponibili(s.result.stili.map((x) => x.nome));
      if (s?.result?.stileScelto) setStile(s.result.stileScelto);
      else if (s?.result?.stili?.[0]) setStile(s.result.stili[0].nome);
      if (s?.budget) setBudget(s.budget);
      if (s?.profile?.forma) setForma(s.profile.forma);
      if (s?.profile?.height) setAltezza(s.profile.height);
      const sesso = s?.profile?.sex;
      if (sesso === "female") setGenere("donna");
      else if (sesso === "male") setGenere("uomo");
    } catch {
      /* nessuna analisi fatta */
    }
  }, []);

  useEffect(() => {
    if (!palette.length) {
      setCaricamento(false);
      return;
    }
    let vivo = true;
    const chiave = `dress:completi:${stile}|${genere}|${forma}|${altezza}|${budget}|${palette.map((c) => c.hex).join("")}`;

    // Se questi completi li abbiamo già calcolati, si mostrano subito e si
    // aggiornano dietro. Ricalcolarli da capo ogni volta che si torna sulla
    // schermata sono due secondi e mezzo di attesa per la stessa risposta.
    try {
      const salvati = JSON.parse(sessionStorage.getItem(chiave) || "null");
      if (salvati?.length) {
        setCompleti(salvati);
        setCaricamento(false);
      } else {
        setCaricamento(true);
      }
    } catch {
      setCaricamento(true);
    }

    fetch("/api/outfit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        palette,
        stile: stile || null,
        genere: genere || null,
        forma: forma || null,
        altezza: altezza || null,
        max: budget ? Math.round(Number(String(budget).replace(/\D/g, "")) * 1.6) : null,
        escludiFast: true,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!vivo || !d.completi?.length) return;
        setCompleti(d.completi);
        try {
          sessionStorage.setItem(chiave, JSON.stringify(d.completi));
        } catch {
          /* memoria piena: pazienza, si ricalcola */
        }
      })
      .catch(() => {})
      .finally(() => vivo && setCaricamento(false));
    return () => {
      vivo = false;
    };
  }, [palette, stile, genere, budget, forma, altezza]);

  const attuale = useMemo(() => completi.find((c) => c.periodo === periodo), [completi, periodo]);
  const coloriPeriodo = useMemo(() => paletteDelPeriodo(palette, periodo), [palette, periodo]);

  if (!palette.length && !caricamento) {
    return (
      <div className="wrap" style={{ paddingTop: 60, paddingBottom: 40, maxWidth: 520 }}>
        <h1 className="h2">I tuoi completi</h1>
        <p className="muted">
          Prima serve l’analisi: senza i tuoi colori non sapremmo che completi metterti insieme.
        </p>
        <Link href="/start" className="btn-app" style={{ marginTop: 20, display: "flex" }}>Fai l’analisi</Link>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ paddingTop: 32, paddingBottom: 40, maxWidth: 640 }}>
      <h1 className="h2" style={{ marginBottom: 4 }}>I tuoi completi</h1>
      <p className="muted" style={{ fontSize: 14 }}>
        Uno per periodo dell’anno, dello stile che hai scelto, nei tuoi colori.
      </p>

      {/* lo stile */}
      {stiliDisponibili.length > 1 ? (
        <div style={{ marginTop: 22 }}>
          <span className="label" style={{ display: "block", marginBottom: 8 }}>Stile</span>
          <div className="chips">
            {stiliDisponibili.map((n) => (
              <button key={n} type="button" className="chip" onClick={() => setStile(n)}
                style={{ cursor: "pointer", background: n === stile ? "var(--ink)" : undefined, color: n === stile ? "var(--paper)" : undefined }}>
                {n}
              </button>
            ))}
          </div>
          {spiegaStile(stile) ? (
            <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>{spiegaStile(stile)}</p>
          ) : null}
        </div>
      ) : null}

      {/* il periodo */}
      <div style={{ marginTop: 26, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {completi.map((c) => (
          <button
            key={c.periodo}
            type="button"
            onClick={() => setPeriodo(c.periodo)}
            style={{
              padding: "12px 4px",
              border: "1px solid " + (c.periodo === periodo ? "var(--ink)" : "var(--line)"),
              background: c.periodo === periodo ? "var(--ink)" : "var(--paper)",
              color: c.periodo === periodo ? "var(--paper)" : "var(--ink)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {c.nome}
          </button>
        ))}
      </div>

      {attuale ? (
        <>
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>{attuale.mesi}</p>

          {/* i colori da portare avanti in questo periodo */}
          {coloriPeriodo.ordine.length ? (
            <div style={{ marginTop: 18, padding: 14, background: "var(--stone)" }}>
              {/* La palette è di dodici colori: qui vanno a capo, e sbiadiscono
                  appena per dire l'ordine senza far sparire gli ultimi. */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {coloriPeriodo.ordine.map((c, i) => (
                  <div key={c.hex + i} title={`${c.name} · ${c.hex}`}
                    style={{ width: 30, height: 30, background: c.hex, border: "1px solid rgba(0,0,0,0.08)", opacity: Math.max(0.62, 1 - i * 0.05) }} />
                ))}
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5 }}>{coloriPeriodo.nota}</p>
            </div>
          ) : null}

          <div style={{ marginTop: 20 }}>
            {caricamento ? (
              <div>
                <Attesa testo="Compongo il completo…" />
                <div style={{ display: "grid", gap: 10 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="in-attesa" style={{ height: 110, opacity: 1 - i * 0.18 }} />
                  ))}
                </div>
              </div>
            ) : (
              <OutfitPeriodo completo={attuale} />
            )}
          </div>

          {/* aggiungere qualcosa di preciso: la marca che vuoi tu */}
          <div style={{ marginTop: 26, padding: 16, border: "1px dashed var(--line)" }}>
            <strong style={{ fontSize: 14 }}>Vuoi metterci qualcosa di preciso?</strong>
            <p className="muted" style={{ fontSize: 13, margin: "6px 0 12px" }}>
              Cerca un capo per marca o modello — “giubbino North Face”, “stivali Dr. Martens”.
              Se è in catalogo lo trovi con i tuoi colori; se non c’è, lo cerchiamo nei negozi scelti.
            </p>
            <Link href="/cerca" className="btn-app chiaro">Cerca un capo</Link>
          </div>
        </>
      ) : caricamento ? null : (
        <p className="muted" style={{ marginTop: 24 }}>
          Non siamo riusciti a comporre i completi. Prova a togliere il filtro sullo stile.
        </p>
      )}
    </div>
  );
}
