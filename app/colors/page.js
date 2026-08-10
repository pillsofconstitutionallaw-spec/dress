import { COLORS_OF_YEAR } from "@/lib/data";

export const metadata = { title: "Colori dell'anno" };

export default function Colors() {
  return (
    <div className="wrap" style={{ paddingTop: 56, paddingBottom: 20 }}>
      <p className="eyebrow">Selezione della stagione</p>
      <h1 className="h1" style={{ fontSize: "clamp(34px, 6vw, 64px)", marginTop: 16, marginBottom: 12 }}>Colori dell'anno</h1>
      <p className="lead" style={{ marginBottom: 44 }}>
        I toni che stanno definendo la stagione. Usali come guida per gli accenti,
        non come regola: la tua palette personale viene sempre prima.
      </p>

      <div className="swatches">
        {COLORS_OF_YEAR.map((c) => (
          <div key={c.hex} className="swatch">
            <div className="fill" style={{ background: c.hex, height: 180 }} />
            <div className="meta">
              <div className="name">{c.name}</div>
              <div className="hex">{c.hex}</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.4 }}>{c.note}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
