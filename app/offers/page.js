"use client";

import { useEffect, useState } from "react";
import CapiTrovati from "@/components/CapiTrovati";
import { FAST_FASHION_NOTE } from "@/lib/data";

// Gli sconti veri, presi dal catalogo. Nessuna offerta scritta a mano:
// il prezzo è quello di adesso sul sito del negozio.
export default function Offerte() {
  const [capi, setCapi] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
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
      .then((r) => r.json())
      .then((d) => {
        if (!vivo) return;
        setCapi(d.capi || []);
        setStileApplicato(d.stile || null);
        setQuantiDelloStile(d.quantiDelloStile ?? null);
      })
      .catch(() => {})
      .finally(() => vivo && setCaricamento(false));
    return () => {
      vivo = false;
    };
  }, [stile, filtra]);

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

      {!caricamento && capi.length === 0 && (
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
