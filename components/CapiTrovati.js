"use client";

import { AVVISO_NOME_MARCHIO, nomeDelMarchio } from "@/lib/testiProdotto";
import { usaPreferiti } from "@/lib/preferiti";

// I capi del catalogo, quelli veri, con prezzo e link al negozio.
export default function CapiTrovati({ capi = [], caricamento = false }) {
  const { preferito, alterna } = usaPreferiti();

  if (caricamento) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ height: 96, background: "var(--stone)", opacity: 1 - i * 0.18 }} />
        ))}
      </div>
    );
  }

  if (!capi.length) return null;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {capi.map((capo) => {
        const nomeLoro = nomeDelMarchio(capo.titolo);
        const sconto = capo.prezzo_pieno && capo.prezzo_pieno > capo.prezzo;

        return (
          <a
            key={capo.id}
            href={capo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="entra-morbido"
            style={{
              display: "grid",
              gridTemplateColumns: "84px 1fr",
              gap: 14,
              padding: 10,
              background: "var(--paper)",
              border: "1px solid var(--line)",
              textDecoration: "none",
              color: "inherit",
              alignItems: "center",
            }}
          >
            <div style={{ position: "relative", width: 84, height: 106 }}>
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  overflow: "hidden",
                  background: capo.colore_hex || "var(--stone)",
                }}
              >
                {capo.immagine ? (
                  <img src={capo.immagine} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : null}
              </div>

              <button
                type="button"
                aria-label={preferito(capo.id) ? "Togli dai preferiti" : "Salva nei preferiti"}
                aria-pressed={preferito(capo.id)}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); alterna(capo); }}
                style={{
                  position: "absolute", top: -6, right: -6,
                  width: 32, height: 32, border: "1px solid var(--line)", background: "var(--paper)",
                  display: "grid", placeItems: "center", cursor: "pointer", padding: 0,
                  boxShadow: "0 2px 8px rgba(20,18,16,0.10)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24"
                  fill={preferito(capo.id) ? "var(--ink)" : "none"}
                  stroke={preferito(capo.id) ? "var(--ink)" : "var(--greige)"}
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 20s-7-4.4-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.8C19 15.6 12 20 12 20z" />
                </svg>
              </button>
            </div>

            <div style={{ display: "grid", gap: 5, minWidth: 0 }}>
              <span className="eyebrow" style={{ fontSize: 10 }}>{capo.negozio}</span>

              <span style={{ fontSize: 15, lineHeight: 1.3, fontWeight: 500 }}>{capo.titolo}</span>

              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <strong style={{ fontSize: 16 }}>{Number(capo.prezzo).toFixed(2).replace(".", ",")} €</strong>
                {sconto ? (
                  <span className="muted" style={{ fontSize: 13, textDecoration: "line-through" }}>
                    {Number(capo.prezzo_pieno).toFixed(2).replace(".", ",")} €
                  </span>
                ) : null}
              </div>

              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                {capo.colore_hex ? (
                  <span
                    aria-hidden="true"
                    style={{ width: 12, height: 12, background: capo.colore_hex, border: "1px solid var(--line)" }}
                  />
                ) : null}
                <span className="muted" style={{ fontSize: 12 }}>
                  {capo.colore_palette ? `il tuo ${capo.colore_palette.toLowerCase()}` : capo.colore_nome || ""}
                </span>
                {capo.qualita ? (
                  <span className="muted" style={{ fontSize: 12 }}>· tessuto {capo.qualita}/100</span>
                ) : null}
                {capo.fast_fashion ? (
                  <span style={{ fontSize: 11, color: "var(--signal)" }}>· fast fashion</span>
                ) : null}
              </div>

              {/* I nomi dei capi li scrivono i negozi: se usano parole sul corpo,
                  lo diciamo invece di riscriverle o di farle passare per nostre. */}
              {nomeLoro ? (
                <span className="muted" style={{ fontSize: 11, lineHeight: 1.4 }}>{AVVISO_NOME_MARCHIO}</span>
              ) : null}
            </div>
          </a>
        );
      })}
    </div>
  );
}
