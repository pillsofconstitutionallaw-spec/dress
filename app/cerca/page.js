"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { NEGOZI, fasciaDaBudget, urlNeiNegozi, urlShopping } from "@/lib/ricerca";

export default function Cerca() {
  const [capo, setCapo] = useState("");
  const [colore, setColore] = useState("");
  const [taglia, setTaglia] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [escludiFast, setEscludiFast] = useState(true);
  const [palette, setPalette] = useState([]);

  // La palette e il budget arrivano dall'analisi già fatta, se c'è.
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("dress:session") || "null");
      if (s?.result?.palette?.length) setPalette(s.result.palette);
      if (s?.budget) {
        const f = fasciaDaBudget(s.budget);
        setMin(String(f.min));
        setMax(String(f.max));
      }
    } catch {
      /* nessuna sessione salvata */
    }
  }, []);

  const negoziAmmessi = useMemo(
    () => NEGOZI.filter((n) => (escludiFast ? !n.fast : true)),
    [escludiFast],
  );

  const linkShopping = urlShopping({ capo, colore, taglia, min, max });
  const linkNegozi = urlNeiNegozi({
    capo,
    colore,
    taglia,
    negozi: negoziAmmessi.map((n) => n.dominio),
  });

  return (
    <div className="wrap" style={{ paddingTop: 48, paddingBottom: 48, maxWidth: 760 }}>
      <h1 className="h2">Cerca un capo</h1>
      <p className="muted" style={{ maxWidth: "48ch" }}>
        Descrivi quello che cerchi come lo diresti a voce. Ci pensiamo noi a trasformarlo in una
        ricerca precisa, dentro la tua fascia di prezzo e solo nei negozi che abbiamo scelto.
      </p>

      <div style={{ display: "grid", gap: 16, marginTop: 28 }}>
        <label className="field">
          <span className="label">Che capo cerchi</span>
          <input
            className="control"
            value={capo}
            onChange={(e) => setCapo(e.target.value)}
            placeholder="es. jeans baggy fit chiaro"
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <label className="field">
            <span className="label">Colore</span>
            {palette.length ? (
              <select className="control" value={colore} onChange={(e) => setColore(e.target.value)}>
                <option value="">Qualsiasi</option>
                {palette.map((c) => (
                  <option key={c.hex} value={c.name}>{c.name}</option>
                ))}
              </select>
            ) : (
              <input
                className="control"
                value={colore}
                onChange={(e) => setColore(e.target.value)}
                placeholder="es. blu notte"
              />
            )}
          </label>

          <label className="field">
            <span className="label">Taglia</span>
            <input
              className="control"
              value={taglia}
              onChange={(e) => setTaglia(e.target.value)}
              placeholder="es. 44"
            />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <label className="field">
            <span className="label">Prezzo minimo (€)</span>
            <input className="control" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} placeholder="—" />
          </label>
          <label className="field">
            <span className="label">Prezzo massimo (€)</span>
            <input className="control" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value)} placeholder="es. 80" />
          </label>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input type="checkbox" checked={escludiFast} onChange={(e) => setEscludiFast(e.target.checked)} />
          <span className="muted">Escludi il fast fashion dalla ricerca</span>
        </label>
      </div>

      {palette.length ? (
        <p className="muted" style={{ fontSize: 13, marginTop: 18 }}>
          I colori proposti sono quelli della tua palette. Attenzione però: Google cerca <em>parole</em>,
          non colori. Due capi chiamati “{palette[0].name}” possono essere tonalità diverse — la
          corrispondenza esatta arriverà col catalogo.
        </p>
      ) : (
        <p className="muted" style={{ fontSize: 13, marginTop: 18 }}>
          <Link href="/start">Fai l’analisi colori</Link> e qui troverai i tuoi cinque colori già pronti.
        </p>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
        <a
          className="btn"
          href={linkNegozi || undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!linkNegozi}
          style={!linkNegozi ? { pointerEvents: "none", opacity: 0.4 } : undefined}
        >
          Cerca nei {negoziAmmessi.length} negozi scelti
        </a>
        <a
          className="btn ghost"
          href={linkShopping || undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!linkShopping}
          style={!linkShopping ? { pointerEvents: "none", opacity: 0.4 } : undefined}
        >
          Confronta i prezzi ovunque
        </a>
      </div>

      {!capo ? (
        <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>Scrivi almeno che capo cerchi.</p>
      ) : null}

      <section style={{ marginTop: 40, borderTop: "1px solid var(--line)", paddingTop: 24 }}>
        <h2 className="h4">Dove stiamo cercando</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {NEGOZI.map((n) => {
            const attivo = negoziAmmessi.includes(n);
            return (
              <span
                key={n.dominio}
                className="eyebrow"
                style={{
                  border: "1px solid var(--line)",
                  padding: "6px 10px",
                  opacity: attivo ? 1 : 0.35,
                  textDecoration: attivo ? "none" : "line-through",
                }}
              >
                {n.nome}{n.fast ? " · fast" : ""}
              </span>
            );
          })}
        </div>
      </section>
    </div>
  );
}
