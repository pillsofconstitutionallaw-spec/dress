"use client";

import { DOMANDE_TAGLIA } from "@/lib/taglie";

// Le tre taglie, a tasti. Si tocca quella che si porta; toccandola di nuovo
// si toglie, perché ognuna delle tre si può lasciare vuota.
export default function SceltaTaglie({ valori = {}, onCambia }) {
  return (
    <div style={{ display: "grid", gap: 22 }}>
      {DOMANDE_TAGLIA.map((d) => (
        <div key={d.id}>
          <p style={{ margin: "0 0 10px", fontSize: 15 }}>
            <strong>{d.nome}</strong> <span className="muted" style={{ fontSize: 13 }}>· {d.detta}</span>
          </p>
          <div className="scelte" role="group" aria-label={`Taglia ${d.nome.toLowerCase()}`}>
            {d.scala.map((t) => {
              const scelta = valori[d.id] === t;
              return (
                <button
                  key={t}
                  type="button"
                  className="scelta piccola"
                  aria-pressed={scelta}
                  onClick={() => onCambia(d.id, scelta ? "" : t)}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
