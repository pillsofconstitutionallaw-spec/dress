import { BRAND } from "@/lib/data";

// Il marchio: una "D" nera piena, seguita dal resto della parola.
// Piena e non a contorno perché col filo sottile la lettera pesava meno del
// testo accanto, e l'occhio le leggeva come due cose diverse messe vicine.
//
// Con animato={true} la lettera si scopre da sinistra e la parola la segue:
// è il momento in cui l'app si apre, l'unica animazione che si concede.
// Sagoma piena, senza occhiello: è la stessa forma dell'icona sulla
// schermata home, così il marchio e l'icona sono la stessa cosa.
const D_PIENA = "M10 8 L24 8 A18 18 0 0 1 24 44 L10 44 Z";

export default function BrandMark({ small = false, animato = false, grande = false }) {
  const larghezza = grande ? 248 : small ? 108 : 172;
  const altezza = grande ? 80 : small ? 35 : 56;

  return (
    <svg
      viewBox="0 0 160 52"
      width={larghezza}
      height={altezza}
      role="img"
      aria-label={BRAND}
      xmlns="http://www.w3.org/2000/svg"
      className={animato ? "marchio marchio-animato" : "marchio"}
      style={{ display: "block", color: "var(--ink)" }}
    >
      <title>{BRAND}</title>
      <path className="marchio-d" d={D_PIENA} fill="currentColor" />
      <text
        className="marchio-parola"
        x="50"
        y="44"
        fontFamily="Outfit, system-ui, -apple-system, sans-serif"
        fontSize="50"
        fontWeight="400"
        letterSpacing="-1"
        fill="currentColor"
      >
        ress
      </text>
    </svg>
  );
}
