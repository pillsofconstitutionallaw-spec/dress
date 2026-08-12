import { BRAND } from "@/lib/data";

// Il marchio: una "D" disegnata con asta e mezzo cerchio, seguita dal resto
// della parola. La lettera è geometria pura, non un carattere tipografico,
// così resta identica ovunque — anche dove i font non si caricano — ed è la
// stessa forma dell'icona sulla schermata home.
//
// Coordinate: altezza della maiuscola da y=8 a y=44; la parola poggia sulla
// stessa linea di base.
export default function BrandMark({ small = false }) {
  const width = small ? 104 : 168;
  const height = small ? 32 : 52;

  return (
    <svg
      viewBox="0 0 140 52"
      width={width}
      height={height}
      role="img"
      aria-label={BRAND}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", overflow: "visible" }}
    >
      <title>{BRAND}</title>
      <g fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round">
        {/* asta della D */}
        <path d="M10 8 L10 44" />
        {/* pancia della D: mezzo cerchio leggermente più stretto di un semicerchio */}
        <path d="M10 8 A 16 18 0 0 1 10 44" />
      </g>
      <text
        x="34"
        y="44"
        fontFamily="Outfit, system-ui, -apple-system, sans-serif"
        fontSize="50"
        fontWeight="300"
        letterSpacing="-1"
        fill="currentColor"
      >
        ress
      </text>
    </svg>
  );
}
