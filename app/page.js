import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { BRAND } from "@/lib/data";

const heroSwatches = ["#EDE3C8", "#B79268", "#B5654A", "#2B3A55", "#4A3626", "#9AA88B"];

export default function Home() {
  return (
    <>
      <section className="wrap" style={{ paddingTop: "clamp(48px, 9vw, 110px)", paddingBottom: 40 }}>
        <div className="card" style={{ padding: "clamp(22px, 3vw, 32px)", display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 24, animation: "fadeIn 420ms ease both", borderRadius: 999 }}>
          <BrandMark />
          <span className="eyebrow" style={{ marginLeft: 4 }}>consulenza d'immagine, in una foto</span>
        </div>
        <div className="hero-badge" style={{ marginBottom: 18 }}>demo pronto · AI opzionale</div>
        <h1 className="h1" style={{ maxWidth: "16ch", animation: "fadeIn 560ms ease both" }}>
          Il tuo stile, letto in una foto
        </h1>
        <p className="lead" style={{ marginTop: 28, animation: "fadeIn 700ms ease both" }}>
          Dai a {BRAND} un selfie e qualche dettaglio. In cambio ricevi la tua palette
          di 5 colori personale e outfit pensati per te — con il posto giusto dove comprarli,
          entro il tuo budget, senza perdere di vista il valore dei capi che già possiedi.
        </p>
        <div style={{ display: "flex", gap: 14, marginTop: 36, flexWrap: "wrap" }}>
          <Link href="/start" className="btn">Inizia ora</Link>
          <Link href="/colors" className="btn ghost">Colori dell'anno</Link>
        </div>

        <div style={{ marginTop: 28, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span className="mini-pill">palette personale</span>
          <span className="mini-pill">outfit pratici</span>
          <span className="mini-pill">scelte più consapevoli</span>
        </div>

        <div style={{ marginTop: 64, display: "flex", height: 220, border: "1px solid var(--line)", overflow: "hidden" }}>
          {heroSwatches.map((c, i) => (
            <div key={c} style={{ flex: 1, background: c, borderLeft: i === 0 ? "none" : "1px solid rgba(0,0,0,0.06)" }} />
          ))}
        </div>
      </section>

      <hr className="thread" />

      <section className="wrap" style={{ paddingTop: 72, paddingBottom: 8 }}>
        <p className="eyebrow" style={{ marginBottom: 40 }}>Come funziona</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 40 }}>
          {[
            ["01", "Ti presenti", "Altezza, capelli, occhi e lo stile che senti tuo — o dici che non lo sai ancora."],
            ["02", "Una foto", "Un primo piano e una figura intera. L'analisi resta lato server, la foto serve solo per l'analisi."],
            ["03", "La tua palette", "5 colori che ti valorizzano davvero, con il perché di ognuno."],
            ["04", "Gli outfit", "Combinazioni per ogni occasione e dove comprarle nel tuo budget, second-hand incluso."],
          ].map(([n, t, d]) => (
            <div key={n}>
              <div className="display" style={{ fontSize: 13, letterSpacing: "0.2em", color: "var(--greige)" }}>{n}</div>
              <h3 className="h2" style={{ fontSize: 20, marginTop: 12 }}>{t}</h3>
              <p className="muted" style={{ marginTop: 10, fontSize: 15 }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap" style={{ paddingTop: 64 }}>
        <div className="card" style={{ padding: "clamp(24px, 4vw, 44px)" }}>
          <p className="eyebrow" style={{ marginBottom: 16 }}>Una posizione, non un dogma</p>
          <p style={{ fontSize: "clamp(18px, 2.6vw, 24px)", lineHeight: 1.45, maxWidth: "44ch", margin: 0 }}>
            Quando un capo arriva dal fast fashion, {BRAND} te lo dice e ti spiega perché.
            Poi ti mostra alternative più durevoli o second-hand. Decidi tu.
          </p>
        </div>
      </section>

      <section className="wrap" style={{ paddingTop: 64, paddingBottom: 24 }}>
        <div className="section-title">
          <p className="eyebrow" style={{ margin: 0 }}>Perché funziona</p>
          <span className="muted" style={{ fontSize: 13 }}>più un servizio di stile che un semplice quiz</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
          {[
            ["Palette personale", "Cinque colori che ti valorizzano davvero, con un motivo preciso per ciascuno."],
            ["Outfit pensati per te", "Combinazioni per il lavoro, il weekend e le occasioni più formali."],
            ["Acquisto più consapevole", "I retailer vengono mostrati con segnalazione del fast fashion e delle alternative etiche."],
          ].map(([title, body]) => (
            <div key={title} className="card" style={{ padding: "20px 20px 22px" }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>{title}</div>
              <p className="muted" style={{ margin: 0, fontSize: 15, lineHeight: 1.55 }}>{body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
