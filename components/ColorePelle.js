"use client";

import { TONI_PELLE } from "@/lib/pelle";

// Il colore della pelle, scelto guardandolo.
//
// Un elenco a tendina con scritto "oliva", "chiara", "scura" non funziona:
// sono parole con cui ci si descrive, non colori che si confrontano. Chi ha
// la pelle rosa tenue si dice oliva perché oliva è la casella di chi non è
// né bianchissimo né scuro, e da lì esce una palette sbagliata.
//
// Col campioncino accanto la domanda cambia: non "come ti definisci" ma
// "quale di questi è il tuo braccio". A quella si risponde guardando.
export default function ColorePelle({ valore, onCambia, compatto = false }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <p className="muted" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.45 }}>
        Appoggia il polso o l&apos;interno dell&apos;avambraccio accanto allo schermo, vicino a una
        finestra: è lì che la pelle è meno abbronzata e il colore vero si vede. Scegli il
        quadratino più vicino, non il nome che ti somiglia di più.
      </p>

      <div
        role="radiogroup"
        aria-label="Colore della pelle"
        style={{
          display: "grid",
          gap: 8,
          gridTemplateColumns: `repeat(auto-fit, minmax(${compatto ? 150 : 168}px, 1fr))`,
        }}
      >
        {TONI_PELLE.map((t) => {
          const scelto = valore === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={scelto}
              onClick={() => onCambia(scelto ? "" : t.id)}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: 10,
                alignItems: "center",
                textAlign: "left",
                cursor: "pointer",
                background: scelto ? "var(--stone)" : "var(--paper)",
                border: scelto ? "2px solid var(--ink)" : "1px solid var(--line)",
                // Il bordo che si ispessisce sposterebbe il testo di un pixel:
                // si toglie a chi non è scelto lo spazio che l'altro prende.
                padding: scelto ? 9 : 10,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: compatto ? 34 : 42,
                  height: compatto ? 34 : 42,
                  background: t.hex,
                  // Un bordo sottilissimo: senza, i toni chiarissimi
                  // sparirebbero contro la carta e sembrerebbero vuoti.
                  border: "1px solid rgba(0,0,0,0.14)",
                  display: "block",
                }}
              />
              <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                <strong style={{ fontSize: 13.5, lineHeight: 1.2 }}>{t.nome}</strong>
                {compatto ? null : (
                  <span className="muted" style={{ fontSize: 11.5, lineHeight: 1.35 }}>{t.detta}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="muted"
        onClick={() => onCambia("")}
        style={{
          justifySelf: "start", background: "none", border: "none", padding: 0,
          fontSize: 12.5, textDecoration: "underline", cursor: "pointer", color: "var(--greige)",
        }}
      >
        Nessuno mi somiglia, salta
      </button>
    </div>
  );
}
