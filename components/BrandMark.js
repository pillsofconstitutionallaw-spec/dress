import { BRAND } from "@/lib/data";

// Il marchio: una "D" piena disegnata come geometria, seguita dal resto della
// parola. Piena e non a contorno perché con il filo sottile la lettera pesava
// meno del testo accanto, e l'occhio le leggeva come due cose diverse.
//
// Coordinate: altezza della maiuscola da y=8 a y=44, parola sulla stessa
// linea di base. La stessa forma è l'icona sulla schermata home.
const D_PIENA =
  "M10 8 L24 8 A18 18 0 0 1 24 44 L10 44 Z" + // sagoma esterna
  " M20 17 L24 17 A9 9 0 0 1 24 35 L20 35 Z"; // occhiello interno

export default function BrandMark({ small = false }) {
  return (
    <svg
      viewBox="0 0 160 52"
      width={small ? 108 : 172}
      height={small ? 35 : 56}
      role="img"
      aria-label={BRAND}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      <title>{BRAND}</title>
      <path d={D_PIENA} fill="currentColor" fillRule="evenodd" />
      <text
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
