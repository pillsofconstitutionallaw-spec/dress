import { BRAND } from "@/lib/data";

export default function BrandMark({ small = false }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: small ? 8 : 10 }}>
      <span
        aria-hidden="true"
        style={{
          width: small ? 22 : 28,
          height: small ? 22 : 28,
          borderRadius: "50%",
          border: "1.5px solid currentColor",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: small ? 8 : 10,
            height: small ? 8 : 10,
            borderRadius: "50%",
            background: "currentColor",
            opacity: 0.85,
          }}
        />
      </span>
      <span className="display" style={{ fontSize: small ? 15 : 18, letterSpacing: "0.32em", textTransform: "uppercase", fontWeight: 600 }}>
        {BRAND}
      </span>
    </span>
  );
}
