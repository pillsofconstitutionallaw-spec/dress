import { BRAND } from "@/lib/data";

export default function BrandMark({ small = false }) {
  const height = small ? 32 : 44;
  const width = small ? 100 : 160;
  const restX = small ? 56 : 76;

  return (
    <svg
      className="brand-svg"
      viewBox={`0 0 ${width} ${height}`}
      width={small ? 92 : 160}
      height={height}
      role="img"
      aria-label={BRAND}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{BRAND}</title>
      <g className="logo-group" transform={`translate(0,0)`}>
        {/* Vertical stem */}
        <path
          className="logo-d"
          d={`M14 6 L14 ${height - 8} M14 6 C 44 6, ${width - 28} ${Math.round(height / 2.2)}, 44 ${height - 8} C ${width - 28} ${height - 12}, 44 ${height - 6}, 14 ${height - 8}`}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>

      <text
        className="rest"
        x={restX}
        y={height - 10}
        fontFamily="Outfit, system-ui, sans-serif"
        fontWeight="600"
        fontSize={small ? 12 : 18}
      >
        ress
      </text>
    </svg>
  );
}
