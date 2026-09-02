"use client";

/**
 * «Sto cercando».
 *
 * La ricerca per palette dura fra i tre e i sette secondi — settantottomila
 * capi contro dodici colori — e per tutto quel tempo l'app mostrava
 * rettangoli grigi fermi. Fermi non dicono «aspetta», dicono «rotto».
 *
 * I tre quadratini si accendono a turno e la frase dice cosa sta succedendo.
 * La frase conta più dei quadratini: «cerco nel catalogo» è un'informazione,
 * un'animazione da sola è solo un'animazione.
 */
export default function Attesa({ testo = "Cerco nel catalogo…" }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "2px 0 10px" }}
    >
      <span className="rotella" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="muted" style={{ fontSize: 13 }}>{testo}</span>
    </div>
  );
}
