import { BRAND } from "@/lib/data";

export default function BrandMark({ small = false }) {
  const height = small ? 28 : 44;
  const width = small ? 110 : 180;

  return (
    <svg viewBox="0 0 180 44" width={small ? 110 : 180} height={height} role="img" aria-label={BRAND} xmlns="http://www.w3.org/2000/svg">
      <title>{BRAND}</title>
      <defs>
        <linearGradient id="g1" x1="0" x2="1">
          <stop offset="0%" stopColor="#000" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#222" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <g transform="translate(8,4)">
        <path d="M8 36 C8 20, 20 8, 40 8 C60 8, 64 24, 64 36 C64 40, 60 44, 52 44 C44 44, 40 40, 40 36" fill="none" stroke="url(#g1)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M40 8 C56 8, 68 16, 72 28" fill="none" stroke="url(#g1)" strokeWidth="3" strokeLinecap="round" />
        <text x="86" y="30" fontFamily="Outfit, system-ui, sans-serif" fontWeight="700" fontSize="20" fill="url(#g1)">ress</text>
      </g>
    </svg>
  );
}
