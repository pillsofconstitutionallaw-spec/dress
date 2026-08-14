"use client";

import { DOMANDE } from "@/lib/testArmocromia";

// Le domande dell'armocromista, poste come le porrebbe lui: una alla volta,
// con la spiegazione di dove guardare. Si può saltare — ma saltandole
// l'analisi torna a dipendere dalla luce della stanza in cui hai scattato.
export default function TestArmocromia({ risposte = {}, onRisposta, compatto = false }) {
  return (
    <div style={{ display: "grid", gap: compatto ? 18 : 26 }}>
      {DOMANDE.map((d) => (
        <div key={d.id} style={{ display: "grid", gap: 8 }}>
          <strong style={{ fontSize: 15, lineHeight: 1.35 }}>{d.domanda}</strong>
          <span className="muted" style={{ fontSize: 12.5, lineHeight: 1.45 }}>{d.aiuto}</span>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 2 }}>
            {d.risposte.map((r) => {
              const scelta = risposte[d.id] === r.valore;
              return (
                <button
                  key={r.testo}
                  type="button"
                  onClick={() => onRisposta(d.id, scelta ? null : r.valore)}
                  className="chip"
                  style={{
                    cursor: "pointer",
                    background: scelta ? "var(--ink)" : undefined,
                    color: scelta ? "var(--paper)" : undefined,
                    borderColor: scelta ? "var(--ink)" : undefined,
                  }}
                >
                  {r.testo}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
