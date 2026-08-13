"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { NEGOZI, fasciaDaBudget, urlNeiNegozi, urlShopping } from "@/lib/ricerca";
import CapiTrovati from "@/components/CapiTrovati";

export default function Cerca() {
  const [capo, setCapo] = useState("");
  const [colore, setColore] = useState("");
  const [taglia, setTaglia] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [escludiFast, setEscludiFast] = useState(true);
  const [palette, setPalette] = useState([]);
  const [capi, setCapi] = useState([]);
  const [cercando, setCercando] = useState(false);
  const [genere, setGenere] = useState("");
  const [stile, setStile] = useState("");
  const [stiliDisponibili, setStiliDisponibili] = useState([]);
  const [tagli, setTagli] = useState([]);

  // Se si arriva da un capo suggerito ("mocassini in pelle marrone"), la
  // casella è già compilata: il consiglio deve portare da qualche parte.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("capo");
    if (q) setCapo(q);
  }, []);

  // Cosa si porta adesso, contato sul catalogo.
  useEffect(() => {
    fetch("/api/tendenze")
      .then((r) => r.json())
      .then((d) => setTagli(d.tagli || []))
      .catch(() => {});
  }, []);

  // La palette e il budget arrivano dall'analisi già fatta, se c'è.
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("dress:session") || "null");
      if (s?.result?.palette?.length) setPalette(s.result.palette);
      if (s?.result?.stili?.length) setStiliDisponibili(s.result.stili.map((x) => x.nome));
      if (s?.result?.stileScelto) setStile(s.result.stileScelto);
      const sesso = s?.profile?.sex;
      if (sesso === "female") setGenere("donna");
      else if (sesso === "male") setGenere("uomo");
      if (s?.budget) {
        const f = fasciaDaBudget(s.budget);
        setMin(String(f.min));
        setMax(String(f.max));
      }
    } catch {
      /* nessuna sessione salvata */
    }
  }, []);

  // I capi veri del catalogo: si cercano da soli appena c'è la palette.
  useEffect(() => {
    if (!palette.length) return;
    let vivo = true;
    setCercando(true);
    (async () => {
      try {
        const res = await fetch("/api/capi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ palette, min, max, genere, stile: stile || null, escludiFast, quanti: 48 }),
        });
        const dati = await res.json();
        if (vivo && dati?.ok) setCapi(dati.capi || []);
      } catch {
        /* resta la ricerca su Google */
      }
      if (vivo) setCercando(false);
    })();
    return () => {
      vivo = false;
    };
  }, [palette, min, max, genere, stile, escludiFast]);

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
            placeholder="es. giubbino North Face, jeans baggy chiaro, décolleté nere"
          />
          <span className="muted" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
            Scrivi anche una marca precisa: se in catalogo non c’è, i tasti in fondo la cercano
            fuori, ristretta ai negozi scelti.
          </span>
        </label>

        {tagli.length ? (
          <div>
            <span className="label" style={{ display: "block", marginBottom: 8 }}>
              Cosa si porta adesso
            </span>
            <div className="chips">
              {tagli.slice(0, 8).map((t) => (
                <button
                  key={t.taglio}
                  type="button"
                  className="chip"
                  onClick={() => setCapo((c) => (c.toLowerCase().includes(t.taglio.toLowerCase()) ? c : `${c} ${t.taglio}`.trim()))}
                  style={{ cursor: "pointer" }}
                >
                  {t.taglio}
                  <span className="muted" style={{ marginLeft: 6, fontSize: 11 }}>{t.quanti}</span>
                </button>
              ))}
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              Non è un’opinione: è quanti capi di quel taglio i negozi hanno in vendita
              in questo momento, contati sul catalogo.
            </p>
          </div>
        ) : null}

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

      {stiliDisponibili.length ? (
        <div style={{ marginTop: 26 }}>
          <span className="label" style={{ display: "block", marginBottom: 8 }}>Filtra per stile</span>
          <div className="chips">
            <button type="button" className="chip" onClick={() => setStile("")}
              style={{ cursor: "pointer", background: stile ? undefined : "var(--ink)", color: stile ? undefined : "var(--paper)" }}>
              Tutti
            </button>
            {stiliDisponibili.map((n) => (
              <button key={n} type="button" className="chip" onClick={() => setStile(n === stile ? "" : n)}
                style={{ cursor: "pointer", background: n === stile ? "var(--ink)" : undefined, color: n === stile ? "var(--paper)" : undefined }}>
                {n}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {(cercando || capi.length > 0) && (
        <section style={{ marginTop: 34 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <h2 className="h3" style={{ margin: 0 }}>
              {stile ? `${stile}, nei tuoi colori` : "Dalla tua palette"}
            </h2>
            {capi.length ? <span className="muted" style={{ fontSize: 13 }}>{capi.length} capi</span> : null}
          </div>
          <CapiTrovati capi={capi} caricamento={cercando} />
          <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
            Sono capi veri, con il prezzo di adesso, presi dai cataloghi dei negozi. Ordinati per
            quanto il colore corrisponde ai tuoi.
          </p>
        </section>
      )}

      {palette.length > 0 && !cercando && capi.length === 0 && (
        <p className="muted" style={{ marginTop: 30 }}>
          In catalogo non c’è ancora niente dei tuoi colori dentro questa fascia di prezzo. Prova ad
          allargarla, oppure cerca fuori con i tasti qui sotto.
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
        <h2 className="h4">Se qui non c’è, cerchiamo fuori</h2>
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
