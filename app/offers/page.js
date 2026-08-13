"use client";

import { useEffect, useState } from "react";
import CapiTrovati from "@/components/CapiTrovati";
import { FAST_FASHION_NOTE } from "@/lib/data";

// Gli sconti veri, presi dal catalogo. Nessuna offerta scritta a mano:
// il prezzo è quello di adesso sul sito del negozio.
export default function Offerte() {
  const [capi, setCapi] = useState([]);
  const [caricamento, setCaricamento] = useState(true);

  useEffect(() => {
    let vivo = true;
    // Il sesso dichiarato nel questionario filtra anche gli sconti.
    let genere = "";
    try {
      const sesso = JSON.parse(localStorage.getItem("dress:session") || "null")?.profile?.sex;
      if (sesso === "female") genere = "donna";
      else if (sesso === "male") genere = "uomo";
    } catch {
      /* nessuna sessione */
    }
    fetch(`/api/offerte${genere ? `?genere=${genere}` : ""}`)
      .then((r) => r.json())
      .then((d) => vivo && setCapi(d.capi || []))
      .catch(() => {})
      .finally(() => vivo && setCaricamento(false));
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <div className="wrap" style={{ paddingTop: 40, paddingBottom: 40, maxWidth: 720 }}>
      <h1 className="h2">In sconto adesso</h1>
      <p className="muted" style={{ maxWidth: "44ch" }}>
        Capi che i negozi hanno ribassato di almeno il 10%. Prezzo pieno e prezzo di adesso, come
        stanno sul loro sito in questo momento.
      </p>

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
