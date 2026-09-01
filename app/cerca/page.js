"use client";

import { paletteAggiornata } from "@/lib/stagioni";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { NEGOZI, fasciaDaBudget, negoziPerGenere, urlNeiNegozi, urlShopping } from "@/lib/ricerca";
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
      if (s?.result?.palette?.length) setPalette(paletteAggiornata(s.result));
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
  //
  // Che capo cerchi e di che colore adesso arrivano fin qui. Prima le due
  // caselle servivano solo a comporre i link verso Google: si sceglieva "blu
  // navy", i capi sotto restavano gli stessi, e sembrava che la scelta non
  // contasse niente — infatti non contava.
  useEffect(() => {
    if (!palette.length) return;
    let vivo = true;
    setCercando(true);
    // Si scrive una lettera alla volta: senza una pausa partirebbe una
    // ricerca per ogni tasto premuto.
    const quando = setTimeout(async () => {
      try {
        const res = await fetch("/api/capi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            palette, min, max, genere,
            stile: stile || null,
            capo: capo.trim() || null,
            colore: colore || null,
            escludiFast, quanti: 48,
          }),
        });
        const dati = await res.json();
        if (vivo && dati?.ok) setCapi(dati.capi || []);
      } catch {
        /* resta la ricerca su Google */
      }
      if (vivo) setCercando(false);
    }, capo ? 400 : 0);
    return () => {
      vivo = false;
      clearTimeout(quando);
    };
  }, [palette, min, max, genere, stile, capo, colore, escludiFast]);

  // Anche la ricerca fuori tiene conto di chi sei: prima il tasto diceva
  // "cerca nei 48 negozi scelti" e ce li infilava tutti, Kocca e Pinko
  // compresi, che di roba da uomo non ne hanno. E alla ricerca su Google la
  // parola "uomo" non arrivava proprio.
  const negoziAmmessi = useMemo(
    () => negoziPerGenere(NEGOZI, genere).filter((n) => (escludiFast ? !n.fast : true)),
    [escludiFast, genere],
  );

  const linkShopping = urlShopping({ capo, colore, taglia, genere, min, max });
  const linkNegozi = urlNeiNegozi({
    capo,
    colore,
    taglia,
    genere,
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

        <div>
          <span className="label" style={{ display: "block", marginBottom: 8 }}>Per chi</span>
          <div className="chips">
            {[["uomo", "Uomo"], ["donna", "Donna"], ["", "Tutti"]].map(([id, nome]) => (
              <button key={id || "tutti"} type="button" className="chip" onClick={() => setGenere(id)}
                style={{ cursor: "pointer", background: genere === id ? "var(--ink)" : undefined, color: genere === id ? "var(--paper)" : undefined, borderColor: genere === id ? "var(--ink)" : undefined }}>
                {nome}
              </button>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.45 }}>
            Parte da come ti sei presentato nel profilo. Restano fuori i capi dell&apos;altro sesso e
            quelli da bambino — anche quando il negozio non lo scrive: una gonna la riconosciamo dal
            nome. Le sneaker, gli zaini e i berretti restano, perché non sono di nessun sesso.
          </p>
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
          <Link href="/start">Fai l’analisi colori</Link> e qui troverai i tuoi colori già pronti.
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
              {colore ? `Tutto il ${colore.toLowerCase()}` : stile ? `${stile}, nei tuoi colori` : "Dalla tua palette"}
            </h2>
            {capi.length ? <span className="muted" style={{ fontSize: 13 }}>{capi.length} capi</span> : null}
          </div>
          <CapiTrovati capi={capi} caricamento={cercando} />
          <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
            Sono capi veri, con il prezzo di adesso, presi dai cataloghi dei negozi.
            {[
              capo.trim() ? `che c'entrano con «${capo.trim()}»` : null,
              colore ? `del tuo ${colore.toLowerCase()}` : null,
              stile ? `di stile ${stile}` : null,
              genere ? `da ${genere}` : null,
            ].filter(Boolean).length
              ? ` Filtrati: ${[
                  capo.trim() ? `«${capo.trim()}»` : null,
                  colore ? colore.toLowerCase() : null,
                  stile || null,
                  genere || null,
                ].filter(Boolean).join(" · ")}.`
              : " Ordinati per quanto il colore corrisponde ai tuoi."}
          </p>
        </section>
      )}

      {palette.length > 0 && !cercando && capi.length === 0 && (
        <p className="muted" style={{ marginTop: 30 }}>
          {capo.trim()
            ? `In catalogo non c’è niente che somigli a «${capo.trim()}» dentro questi filtri. Prova con una parola più generica — “giubbino” invece di “giubbino North Face” — oppure cercalo fuori con i tasti qui sotto.`
            : colore
              ? `Di ${colore.toLowerCase()} non c’è niente dentro questa fascia di prezzo. Prova un altro colore della tua palette, o allarga il prezzo.`
              : "In catalogo non c’è ancora niente dei tuoi colori dentro questa fascia di prezzo. Prova ad allargarla, oppure cerca fuori con i tasti qui sotto."}
        </p>
      )}

      {/* Ultima riga, e piccola. Cercare fuori è quello che si fa quando qui
          non si è trovato niente: va in fondo, in una riga. Prima erano due
          tasti grossi seguiti dall'elenco di quarantotto domini — nomi da
          leggere invece che capi da guardare, e quello che ogni negozio ha
          davvero si scopre solo vedendolo, non leggendone l'indirizzo. */}
      <p className="muted" style={{ marginTop: 36, paddingTop: 18, borderTop: "1px solid var(--line)", fontSize: 13, lineHeight: 1.65 }}>
        {capo.trim() || colore ? (
          <>
            Non l&apos;hai trovato qui?{" "}
            {linkNegozi ? (
              <a href={linkNegozi} target="_blank" rel="noopener noreferrer">
                Cercalo nei {negoziAmmessi.length} negozi scelti
              </a>
            ) : null}
            {linkNegozi && linkShopping ? ", oppure " : null}
            {linkShopping ? (
              <a href={linkShopping} target="_blank" rel="noopener noreferrer">confronta i prezzi su Google</a>
            ) : null}
            .
            {genere ? ` La ricerca fuori parte già “da ${genere}”, e i negozi che vendono solo all’altro sesso restano fuori.` : ""}
          </>
        ) : (
          "Scrivi che capo cerchi: qui sopra trovi quello che c’è in catalogo, e in fondo il link per cercarlo fuori."
        )}
      </p>

    </div>
  );
}
