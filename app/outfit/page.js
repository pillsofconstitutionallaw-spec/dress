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
  // «Non ci siamo riusciti» e «non ha risposto» sono due cose diverse, e
  // vanno dette diverse: vedi il messaggio in fondo.
  const [guasto, setGuasto] = useState(false);
  const [tentativo, setTentativo] = useState(0);
  // La richiesta scritta a parole: la frase, cosa ne abbiamo capito, e se
  // stiamo ancora leggendola.
  const [frase, setFrase] = useState("");
  const [capito, setCapito] = useState(null);
  const [leggendo, setLeggendo] = useState(false);

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
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d) => {
        if (!vivo) return;
        setGuasto(false);
        if (!d.completi?.length) return;
        setCompleti(d.completi);
        try {
          sessionStorage.setItem(chiave, JSON.stringify(d.completi));
        } catch {
          /* memoria piena: pazienza, si ricalcola */
        }
      })
      .catch(() => vivo && setGuasto(true))
      .finally(() => vivo && setCaricamento(false));
    return () => {
      vivo = false;
    };
  }, [palette, stile, genere, budget, forma, altezza, tentativo]);

  // Si manda la frase a chi la sa leggere, e quello che torna si APPLICA ai
  // comandi che stanno già in pagina: lo stile, il periodo, il budget. Così
  // chi ha scritto vede dove è finita la sua richiesta e può correggerla a
  // mano, invece di trovarsi dei capi e non sapere perché.
  async function chiedi(e) {
    e?.preventDefault?.();
    const testo = frase.trim();
    if (!testo || leggendo) return;
    setLeggendo(true);
    setCapito(null);
    try {
      const res = await fetch("/api/chiedi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frase: testo }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.ok) throw new Error("no");
      setCapito(d);
      const r = d.richiesta || {};
      if (r.stile) {
        setStile(r.stile);
        setStiliDisponibili((elenco) => (elenco.includes(r.stile) ? elenco : [r.stile, ...elenco]));
      }
      if (r.periodo) setPeriodo(r.periodo);
      if (r.genere) setGenere(r.genere);
      if (r.budget) setBudget(String(r.budget));
    } catch {
      // Stessa regola del resto della pagina: «non ha funzionato» si dice,
      // non si lascia indovinare.
      setCapito({ capito: false, perche: "Non sono riuscito a leggere la richiesta. Riprova fra un momento." });
    }
    setLeggendo(false);
  }

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

      {/* chiedere a parole */}
      <form onSubmit={chiedi} style={{ marginTop: 22 }}>
        <label className="label" style={{ display: "block", marginBottom: 8 }} htmlFor="frase">
          Oppure chiedi a parole
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            id="frase"
            className="control"
            style={{ flex: "1 1 220px", minWidth: 0 }}
            value={frase}
            onChange={(e) => setFrase(e.target.value)}
            placeholder="es. un outfit per un colloquio"
            maxLength={400}
          />
          <button type="submit" className="btn-app" disabled={leggendo || !frase.trim()}>
            {leggendo ? "Leggo…" : "Chiedi"}
          </button>
        </div>
        {capito ? (
          <p className="muted" style={{ fontSize: 13, marginTop: 10, marginBottom: 0 }}>
            {capito.capito
              ? `Ho capito: ${[
                  capito.richiesta?.occasione,
                  capito.richiesta?.stile ? `stile ${capito.richiesta.stile}` : null,
                  capito.richiesta?.periodo,
                  capito.richiesta?.genere,
                  capito.richiesta?.budget ? `fino a ${capito.richiesta.budget} €` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}. Se ho capito male, correggi qui sotto.`
              : capito.perche}
          </p>
        ) : null}
      </form>

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
      ) : caricamento ? null : guasto ? (
        <>
          {/* Qui prima c'era il messaggio sullo stile, che per questo caso è
              un consiglio inutile: se il catalogo non ha risposto, togliere
              un filtro non cambia niente. Chi legge fa la cosa sbagliata e
              ci riprova convinto di aver capito. */}
          <p className="muted" style={{ marginTop: 24 }}>
            Il catalogo non ha risposto. Non è colpa di quello che hai scelto:
            capita, e di solito basta riprovare.
          </p>
          <button type="button" className="btn-app" style={{ marginTop: 16 }}
            onClick={() => { setGuasto(false); setCaricamento(true); setTentativo((n) => n + 1); }}>
            Riprova
          </button>
        </>
      ) : (
        <p className="muted" style={{ marginTop: 24 }}>
          Non siamo riusciti a comporre i completi. Prova a togliere il filtro sullo stile.
        </p>
      )}
    </div>
  );
}
