import { WEEKLY_OFFERS, FAST_FASHION_NOTE } from "@/lib/data";

export const metadata = { title: "Offerte della settimana" };

export default function Offers() {
  return (
    <div className="wrap" style={{ paddingTop: 56, paddingBottom: 20 }}>
      <p className="eyebrow">Aggiornata a mano · curata</p>
      <h1 className="h1" style={{ fontSize: "clamp(34px, 6vw, 64px)", marginTop: 16, marginBottom: 12 }}>Offerte della settimana</h1>
      <p className="lead" style={{ marginBottom: 44 }}>
        Le occasioni migliori del momento. Diamo priorità a marchi più durevoli e al second-hand.
      </p>

      <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
        {WEEKLY_OFFERS.map((o) => (
          <a key={o.retailer} href={o.url} target="_blank" rel="noopener noreferrer"
            style={{ background: "#fff", padding: "22px clamp(18px,3vw,28px)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{o.retailer}</div>
              <div className="muted" style={{ fontSize: 14 }}>{o.deal}</div>
            </div>
            <span className="eyebrow">Vai →</span>
          </a>
        ))}
      </div>

      <div className="card" style={{ padding: "clamp(18px,3vw,28px)", marginTop: 32 }}>
        <p className="tag warn" style={{ marginBottom: 10 }}>Nota</p>
        <p className="muted" style={{ fontSize: 14, margin: 0, lineHeight: 1.55 }}>{FAST_FASHION_NOTE}</p>
      </div>
    </div>
  );
}
