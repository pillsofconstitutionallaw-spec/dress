"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// L'annuncio pronto da incollare su Vinted.
//
// La scheda di rivendita c'era già, ma per usarla bisognava ricopiarla a mano
// nel telefono guardando lo schermo. Qui titolo e descrizione stanno divisi
// come li chiede Vinted, ognuno col suo tasto: si copia, si incolla, è fatta.

// navigator.clipboard non esiste ovunque (Safari vecchi, pagine non in https):
// se manca si passa dalla textarea nascosta, che funziona da vent'anni.
async function copiaTesto(testo) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(testo);
      return true;
    }
  } catch {
    /* si prova l'altra strada */
  }
  try {
    const area = document.createElement("textarea");
    area.value = testo;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const fatto = document.execCommand("copy");
    document.body.removeChild(area);
    return fatto;
  } catch {
    return false;
  }
}

function BottoneCopia({ testo, cosa }) {
  const [stato, setStato] = useState("");
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copia = useCallback(async () => {
    const fatto = await copiaTesto(testo);
    setStato(fatto ? "fatto" : "errore");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStato(""), 2000);
  }, [testo]);

  return (
    <button
      type="button"
      className="btn ghost"
      onClick={copia}
      aria-label={`Copia ${cosa}`}
      style={{ padding: "6px 14px", fontSize: 13, minWidth: 104 }}
    >
      {stato === "fatto" ? "Copiato ✓" : stato === "errore" ? "Copia a mano" : "Copia"}
    </button>
  );
}

function Riga({ etichetta, testo, cosa, children }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
        <p className="eyebrow" style={{ margin: 0 }}>{etichetta}</p>
        <BottoneCopia testo={testo} cosa={cosa} />
      </div>
      {children}
    </div>
  );
}

export default function AnnuncioVinted({ annuncio, compatto = false }) {
  const titolo = annuncio?.vintedTitle;
  const descrizione = annuncio?.vintedDescription;
  if (!titolo && !descrizione) return null;

  return (
    <div
      className="card"
      style={{
        padding: compatto ? 16 : "clamp(18px,3vw,26px)",
        marginTop: 16,
        display: "grid",
        gap: 16,
      }}
    >
      <div>
        <p className="eyebrow" style={{ margin: 0 }}>Annuncio pronto per Vinted</p>
        <p className="muted" style={{ margin: "6px 0 0", fontSize: 13 }}>
          Copia i due campi e incollali nell&apos;inserzione. Rileggi prima di pubblicare: la foto non dice
          tutto, e la taglia la sai solo tu.
        </p>
      </div>

      {titolo ? (
        <Riga etichetta="Titolo" testo={titolo} cosa="il titolo">
          <p style={{ margin: 0, fontSize: 16, fontWeight: 500, lineHeight: 1.4 }}>{titolo}</p>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 12 }}>
            {titolo.length}/100 caratteri
          </p>
        </Riga>
      ) : null}

      {descrizione ? (
        <Riga etichetta="Descrizione" testo={descrizione} cosa="la descrizione">
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{descrizione}</p>
        </Riga>
      ) : null}

      {annuncio?.priceRange && annuncio.priceRange !== "—" ? (
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Prezzo indicativo per l&apos;usato: <strong style={{ color: "var(--ink)" }}>{annuncio.priceRange}</strong>
        </p>
      ) : null}

      {annuncio?.vintedUrl ? (
        <a className="btn" href={annuncio.vintedUrl} target="_blank" rel="noopener noreferrer" style={{ justifySelf: "start" }}>
          Apri Vinted e pubblica →
        </a>
      ) : null}
    </div>
  );
}
