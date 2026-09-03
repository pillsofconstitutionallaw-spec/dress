"use client";

import { useEffect, useState } from "react";
import CapiTrovati from "@/components/CapiTrovati";
import { FAST_FASHION_NOTE } from "@/lib/data";

// Gli sconti veri, presi dal catalogo. Nessuna offerta scritta a mano:
// il prezzo è quello di adesso sul sito del negozio.
export default function Offerte() {
  const [capi, setCapi] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  // «Non ci sono sconti» e «non ho potuto chiedere» sono due cose diverse, e
  // la prima è un'affermazione sul mondo: se la diciamo quando non abbiamo
  // chiesto, è falsa. Vedi il messaggio in fondo.
  const [guasto, setGuasto] = useState(false);
  const [tentativo, setTentativo] = useState(0);
  // Lo stile scelto nell'analisi, e la possibilità di metterlo da parte: un
  // feed di sconti troppo stretto è un feed vuoto, e chi cerca un affare a
  // volte lo vuole anche fuori dal suo stile.
  const [stile, setStile] = useState("");
  const [filtra, setFiltra] = useState(true);
  const [stileApplicato, setStileApplicato] = useState(null);
  const [quantiDelloStile, setQuantiDelloStile] = useState(null);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("dress:session") || "null");
      if (s?.result?.stileScelto) setStile(s.result.stileScelto);
    } catch {
      /* nessuna sessione */
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    setCaricamento(true);
    // Il sesso dichiarato nel questionario filtra anche gli sconti.
    let genere = "";
    try {
      const sesso = JSON.parse(localStorage.getItem("dress:session") || "null")?.profile?.sex;
      if (sesso === "female") genere = "donna";
      else if (sesso === "male") genere = "uomo";
    } catch {
      /* nessuna sessione */
    }
    const q = new URLSearchParams();
    if (genere) q.set("genere", genere);
    if (stile && filtra) q.set("stile", stile);
    fetch(`/api/offerte${q.toString() ? `?${q}` : ""}`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d) => {
        if (!vivo) return;
        setGuasto(false);
        setCapi(d.capi || []);
        setStileApplicato(d.stile || null);
        setQuantiDelloStile(d.quantiDelloStile ?? null);
      })
      .catch(() => vivo && setGuasto(true))
      .finally(() => vivo && setCaricamento(false));
    return () => {
      vivo = false;
    };
  }, [stile, filtra, tentativo]);

  return (
    <div className="wrap" style={{ paddingTop: 40, paddingBottom: 40, maxWidth: 720 }}>
      <h1 className="h2">In sconto adesso</h1>
      <p className="muted" style={{ maxWidth: "44ch" }}>
        Capi che i negozi hanno ribassato di almeno il 10%. Prezzo pieno e prezzo di adesso, come
        stanno sul loro sito in questo momento.
      </p>

      {stile ? (
        <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button className={filtra ? "btn" : "btn ghost"} onClick={() => setFiltra((f) => !f)} style={{ padding: "6px 14px", fontSize: 13 }}>
            {filtra ? `Solo ${stile} ✓` : `Solo ${stile}`}
          </button>
          {filtra && !caricamento && !stileApplicato ? (
            <span className="muted" style={{ fontSize: 13 }}>
              {quantiDelloStile === 0
                ? `Nessun capo ${stile} in sconto adesso: sotto ci sono tutti gli altri.`
                : `Solo ${quantiDelloStile} capi ${stile} in sconto: te li mostro dentro tutto il resto.`}
            </span>
          ) : null}
        </div>
      ) : null}

      <div style={{ marginTop: 26 }}>
        <CapiTrovati capi={capi} caricamento={caricamento} />
      </div>

      {/* Qui c'era un messaggio solo, e diceva che nessun negozio ha
          ribassi. Quando la richiesta falliva usciva quello — cioè un fatto
          sul mondo, dichiarato senza averlo guardato, e falso: in catalogo i
          capi ribassati sono quasi trentamila. Un consiglio sbagliato lo si
          scopre provando; una notizia sbagliata no, la si crede. */}
      {!caricamento && guasto ? (
        <p className="muted" style={{ marginTop: 20 }}>
          Non siamo riusciti a chiedere al catalogo quali sono gli sconti di adesso.
          Non vuol dire che non ce ne siano: vuol dire che non lo sappiamo.
          {" "}
          <button type="button" className="btn-app chiaro" style={{ marginTop: 14, display: "flex" }}
            onClick={() => { setGuasto(false); setCaricamento(true); setTentativo((n) => n + 1); }}>
            Riprova
          </button>
        </p>
      ) : null}

      {!caricamento && !guasto && capi.length === 0 && (
        <p className="muted" style={{ marginTop: 20 }}>
          In questo momento nessuno dei negozi in catalogo ha ribassi. Ricontrolla fra qualche
          giorno: il catalogo si aggiorna ogni notte.
        </p>
      )}

      <div className="card" style={{ padding: 18, marginTop: 34 }}>
        <p className="muted" style={{ fontSize: 14, margin: 0, lineHeight: 1.55 }}>{FAST_FASHION_NOTE}</p>
      </div>
    </div>
  );
}
