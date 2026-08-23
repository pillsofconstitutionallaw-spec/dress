"use client";

import Link from "next/link";
import { usaPreferiti } from "@/lib/preferiti";

// Un completo: i capi in ordine di ruolo, con il totale e la possibilità di
// cambiare ogni pezzo.
export default function OutfitPeriodo({ completo }) {
  const { preferito, alterna } = usaPreferiti();
  if (!completo) return null;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {completo.capi.map((c) => (
        <div
          key={c.id}
          style={{
            display: "grid",
            gridTemplateColumns: "72px 1fr auto",
            gap: 12,
            alignItems: "center",
            padding: 10,
            border: "1px solid var(--line)",
            background: "var(--paper)",
          }}
        >
          <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>
            <div style={{ width: 72, height: 90, overflow: "hidden", background: c.colore_hex || "var(--stone)" }}>
              {c.immagine ? <img src={c.immagine} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
            </div>
          </a>

          <div style={{ display: "grid", gap: 3, minWidth: 0 }}>
            <span className="eyebrow" style={{ fontSize: 10 }}>{c.ruoloEtichetta}</span>
            <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none", fontSize: 14, lineHeight: 1.3, fontWeight: 500 }}>
              {c.titolo}
            </a>
            <span className="muted" style={{ fontSize: 12 }}>
              {c.marca || c.negozio} · {Number(c.prezzo).toFixed(2).replace(".", ",")} €
            </span>
          </div>

          <div style={{ display: "grid", gap: 6, justifyItems: "center" }}>
            <button
              type="button"
              aria-label={preferito(c.id) ? "Togli dai preferiti" : "Salva nei preferiti"}
              onClick={() => alterna(c)}
              style={{ background: "none", border: 0, padding: 4, cursor: "pointer", lineHeight: 0 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24"
                fill={preferito(c.id) ? "var(--ink)" : "none"}
                stroke={preferito(c.id) ? "var(--ink)" : "var(--greige)"}
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20s-7-4.4-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.8C19 15.6 12 20 12 20z" />
              </svg>
            </button>

            {/* Cambiare un pezzo è la cosa che si vuole fare più spesso:
                il completo è un punto di partenza, non una sentenza. */}
            <Link
              href={`/cerca?capo=${encodeURIComponent(c.ruoloEtichetta.toLowerCase())}`}
              className="muted"
              style={{ fontSize: 11, textDecoration: "underline" }}
            >
              cambia
            </Link>
          </div>
        </div>
      ))}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 6 }}>
        <span className="muted" style={{ fontSize: 13 }}>
          {completo.completo ? `${completo.capi.length} pezzi` : `Manca: ${completo.mancano.join(", ")}`}
        </span>
        <strong style={{ fontSize: 16 }}>{Math.round(completo.totale)} €</strong>
      </div>
    </div>
  );
}
