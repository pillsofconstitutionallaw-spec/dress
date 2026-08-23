"use client";

import { useState } from "react";

// Il drappeggio, con la tua foto.
//
// È il gesto vero dell'armocromista: appoggia due teli sotto il viso e ti fa
// guardare la differenza. Chiedere "ti sta meglio l'oro o l'argento?" era una
// domanda circolare — chi lo sapesse non avrebbe bisogno dell'app. Chiedere
// "quale di queste due immagini ti piace di più" invece funziona, perché la
// differenza si vede anche senza saperla spiegare.
//
// Ogni coppia mette a confronto un caldo e un freddo della stessa intensità:
// se una delle due ti spegne il viso, si nota.

export const COPPIE = [
  {
    id: "metallo",
    titolo: "Quale ti illumina di più il viso?",
    aiuto: "Guarda gli occhi e la pelle sotto il mento, non il colore in sé.",
    caldo: { nome: "Oro", hex: "#C9A227" },
    freddo: { nome: "Argento", hex: "#B7BFC6" },
  },
  {
    id: "bianco",
    titolo: "E adesso?",
    aiuto: "Uno dei due ti pulisce il viso, l'altro lo ingrigisce.",
    caldo: { nome: "Panna", hex: "#F2E4C9" },
    freddo: { nome: "Bianco ottico", hex: "#F7F9FB" },
  },
  {
    id: "rosa",
    titolo: "Ultima coppia",
    aiuto: "Cerca quello che ti dà colore invece di toglierlo.",
    caldo: { nome: "Pesca", hex: "#E9A178" },
    freddo: { nome: "Rosa freddo", hex: "#D99BB0" },
  },
];

function Telo({ foto, colore, scelto, onScegli, etichetta }) {
  return (
    <button
      type="button"
      onClick={onScegli}
      aria-pressed={scelto}
      style={{
        display: "grid",
        gap: 0,
        padding: 0,
        border: scelto ? "2px solid var(--ink)" : "1px solid var(--line)",
        overflow: "hidden",
        background: "var(--paper)",
        cursor: "pointer",
        width: "100%",
      }}
    >
      {/* il viso */}
      <div style={{ width: "100%", aspectRatio: "1 / 1", overflow: "hidden", background: "var(--stone)" }}>
        {foto ? (
          <img
            src={foto}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%" }}
          />
        ) : null}
      </div>

      {/* il telo, appoggiato sotto */}
      <div style={{ height: 64, background: colore.hex }} />

      <span
        style={{
          fontSize: 12,
          padding: "8px 4px",
          color: scelto ? "var(--ink)" : "var(--greige)",
          fontWeight: scelto ? 600 : 400,
        }}
      >
        {scelto ? "✓ " : ""}{etichetta}
      </span>
    </button>
  );
}

export default function Drappeggio({ foto, scelte = {}, onScelta }) {
  const [indice, setIndice] = useState(0);
  const coppia = COPPIE[indice];

  if (!foto) {
    return (
      <p className="muted" style={{ fontSize: 13 }}>
        Per il drappeggio serve la foto del viso: è quella che si guarda cambiando telo.
      </p>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div>
        <strong style={{ fontSize: 15 }}>{coppia.titolo}</strong>
        <p className="muted" style={{ fontSize: 12.5, margin: "4px 0 0", lineHeight: 1.45 }}>{coppia.aiuto}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Telo
          foto={foto}
          colore={coppia.caldo}
          etichetta={coppia.caldo.nome}
          scelto={scelte[coppia.id] === 1}
          onScegli={() => onScelta(coppia.id, scelte[coppia.id] === 1 ? null : 1)}
        />
        <Telo
          foto={foto}
          colore={coppia.freddo}
          etichetta={coppia.freddo.nome}
          scelto={scelte[coppia.id] === -1}
          onScegli={() => onScelta(coppia.id, scelte[coppia.id] === -1 ? null : -1)}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <button
          type="button"
          className="muted"
          onClick={() => setIndice((i) => Math.max(0, i - 1))}
          disabled={indice === 0}
          style={{ background: "none", border: 0, fontSize: 13, padding: 8, cursor: "pointer", opacity: indice === 0 ? 0.35 : 1 }}
        >
          Indietro
        </button>

        <span className="muted" style={{ fontSize: 12 }}>{indice + 1} di {COPPIE.length}</span>

        <button
          type="button"
          className="muted"
          onClick={() => setIndice((i) => Math.min(COPPIE.length - 1, i + 1))}
          disabled={indice === COPPIE.length - 1}
          style={{ background: "none", border: 0, fontSize: 13, padding: 8, cursor: "pointer", opacity: indice === COPPIE.length - 1 ? 0.35 : 1 }}
        >
          Avanti
        </button>
      </div>

      <p className="muted" style={{ fontSize: 12, margin: 0 }}>
        Se non vedi differenza, saltala: vuol dire che su di te quel confronto non è decisivo,
        ed è un'informazione anche quella.
      </p>
    </div>
  );
}
