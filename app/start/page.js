"use client";

import { useState } from "react";
import Link from "next/link";
import { fileToDataUrl } from "@/lib/img";
import { fallbackOutfits } from "@/lib/fallback";
import { STYLES, HAIR, EYES, OUTFIT_MODES, RETAILERS, FAST_FASHION_NOTE } from "@/lib/data";

function Swatch({ c }) {
  return (
    <div className="swatch">
      <div className="fill" style={{ background: c.hex }} />
      <div className="meta">
        <div className="name">{c.name}</div>
        <div className="hex">{c.hex}</div>
        {c.why ? <div className="muted" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.4 }}>{c.why}</div> : null}
      </div>
    </div>
  );
}

function BuyRow({ term, budget }) {
  // Order: non-fast first, then second-hand highlighted; simple budget hinting.
  const list = [...RETAILERS].sort((a, b) => Number(a.fast) - Number(b.fast));
  return (
    <div style={{ padding: "16px 0", borderTop: "1px solid var(--line)" }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{term}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {list.map((r) => (
          <a key={r.name} className="chip" href={r.search(term)} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            {r.name}
            {r.fast ? <span className="tag warn">fast fashion</span> : r.tier === "second-hand" ? <span className="tag ok">usato</span> : null}
          </a>
        ))}
      </div>
      {budget ? <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>Budget indicativo: entro {budget} € a capo — privilegia i marchi non segnalati o l'usato.</div> : null}
    </div>
  );
}

export default function Start() {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({ height: "", hair: "", eyes: "", style: "" });
  const [closeup, setCloseup] = useState(null);
  const [fullbody, setFullbody] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [mode, setMode] = useState("smart");
  const [budget, setBudget] = useState("");
  const [err, setErr] = useState("");

  const set = (k) => (e) => setProfile((p) => ({ ...p, [k]: e.target.value }));

  async function onPhoto(setter, e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await fileToDataUrl(file);
      setter(url);
    } catch {
      setErr("Non sono riuscito a leggere l'immagine. Riprova con un'altra foto.");
    }
  }

  async function analyze() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, closeup, fullbody }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore");
      setResult(data);
      setStep(4);
    } catch (e) {
      setErr("Qualcosa è andato storto nell'analisi. Riprova tra poco.");
    } finally {
      setLoading(false);
    }
  }

  const outfits = result ? fallbackOutfits(mode, profile) : [];

  return (
    <div className="wrap" style={{ paddingTop: 48, paddingBottom: 40, maxWidth: 900 }}>
      {/* progress */}
      <div style={{ display: "flex", gap: 8, marginBottom: 36 }}>
        {[1, 2, 3, 4].map((n) => (
          <div key={n} style={{ flex: 1, height: 3, background: step >= n ? "var(--ink)" : "var(--line)" }} />
        ))}
      </div>

      {err ? <p style={{ color: "var(--signal)", marginBottom: 20 }}>{err}</p> : null}

      {step === 1 && (
        <section>
          <p className="eyebrow">Passo 1</p>
          <h1 className="h2" style={{ marginTop: 10, marginBottom: 28 }}>Presentati</h1>
          <p className="muted" style={{ marginBottom: 24, maxWidth: "56ch" }}>
            Questi dati ci aiutano a costruire una lettura più precisa del tuo stile, senza costringerti a rispondere a domande complicate.
          </p>

          <label className="field">
            <span className="label">Altezza (cm)</span>
            <input className="control" inputMode="numeric" value={profile.height} onChange={set("height")} placeholder="es. 178" />
          </label>

          <label className="field">
            <span className="label">Colore capelli</span>
            <select className="control" value={profile.hair} onChange={set("hair")}>
              <option value="">Scegli…</option>
              {HAIR.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </label>

          <label className="field">
            <span className="label">Colore occhi</span>
            <select className="control" value={profile.eyes} onChange={set("eyes")}>
              <option value="">Scegli…</option>
              {EYES.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </label>

          <label className="field">
            <span className="label">Il tuo stile attuale</span>
            <select className="control" value={profile.style} onChange={set("style")}>
              <option value="">Scegli…</option>
              {STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <button className="btn" onClick={() => setStep(2)}>Continua</button>
        </section>
      )}

      {step === 2 && (
        <section>
          <p className="eyebrow">Passo 2</p>
          <h1 className="h2" style={{ marginTop: 10, marginBottom: 12 }}>Due foto</h1>
          <p className="muted" style={{ marginBottom: 28, maxWidth: "56ch" }}>
            Un primo piano del viso (luce naturale, senza filtri) e una figura intera.
            Le immagini vengono ridotte e inviate solo per l'analisi, quindi non servono foto perfette: basta una luce naturale e un po' di spontaneità.
          </p>

          <div className="two-eq">
            {[
              ["Primo piano", closeup, (e) => onPhoto(setCloseup, e)],
              ["Figura intera", fullbody, (e) => onPhoto(setFullbody, e)],
            ].map(([label, val, handler]) => (
              <label key={label} className="card" style={{ padding: 16, cursor: "pointer", display: "block" }}>
                <span className="label" style={{ display: "block", marginBottom: 10 }}>{label}</span>
                <div style={{ aspectRatio: "3/4", background: "var(--stone)", display: "grid", placeItems: "center", overflow: "hidden" }}>
                  {val ? <img src={val} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span className="muted" style={{ fontSize: 13 }}>Tocca per caricare</span>}
                </div>
                <input type="file" accept="image/*" onChange={handler} style={{ display: "none" }} />
              </label>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
            <button className="btn ghost" onClick={() => setStep(1)}>Indietro</button>
            <button className="btn" onClick={() => setStep(3)}>Continua</button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section>
          <p className="eyebrow">Passo 3</p>
          <h1 className="h2" style={{ marginTop: 10, marginBottom: 12 }}>Genera la tua palette</h1>
          <div className="summary-card" style={{ marginBottom: 24, maxWidth: 620, borderRadius: 18 }}>
            <p className="eyebrow" style={{ marginBottom: 8 }}>Riepilogo</p>
            <p className="muted" style={{ margin: 0, fontSize: 15 }}>
              {profile.height || "—"} cm · capelli {profile.hair || "—"} · occhi {profile.eyes || "—"} · stile {profile.style || "—"}.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn ghost" onClick={() => setStep(2)}>Indietro</button>
            <button className="btn" onClick={analyze} disabled={loading}>{loading ? "Analizzo…" : "Crea la mia palette"}</button>
          </div>
        </section>
      )}

      {step === 4 && result && (
        <section>
          <div className="summary-card" style={{ marginBottom: 24, borderRadius: 18 }}>
            <p className="eyebrow">La tua palette</p>
            {result.season ? <h1 className="h2" style={{ marginTop: 10 }}>{result.season}</h1> : null}
            {result.styleReading ? <p className="muted" style={{ marginTop: 12, maxWidth: "52ch" }}>Lettura dello stile: {result.styleReading}</p> : null}
          </div>
          {result.source !== "gemini" ? (
            <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
              Modalità dimostrativa (senza chiave AI). Aggiungi <code>GEMINI_API_KEY</code> per l'analisi reale dalla foto.
            </p>
          ) : null}

          <div className="swatches" style={{ marginTop: 24 }}>
            {result.palette.map((c, i) => <Swatch key={i} c={c} />)}
          </div>

          {/* Outfits */}
          <div style={{ marginTop: 56 }}>
            <p className="eyebrow">Outfit</p>
            <h2 className="h2" style={{ marginTop: 10, marginBottom: 20 }}>Scegli l'occasione</h2>
            <div className="chips" style={{ marginBottom: 20 }}>
              {OUTFIT_MODES.map((m) => (
                <button key={m.id} className="chip" aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>{m.label}</button>
              ))}
            </div>
            <label className="field" style={{ maxWidth: 260 }}>
              <span className="label">Budget per capo (€)</span>
              <input className="control" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="es. 60" />
            </label>

            {outfits.map((o, i) => (
              <div key={i} className="card" style={{ padding: "clamp(18px, 3vw, 28px)", marginTop: 18 }}>
                <h3 className="h2" style={{ fontSize: 19, marginBottom: 8 }}>{o.title}</h3>
                <p className="muted" style={{ fontSize: 14, marginBottom: 6 }}>{o.items.join(" · ")}</p>
                <p className="muted" style={{ fontSize: 13, marginBottom: 6 }}>Colori consigliati: {o.colors.join(", ")}</p>
                <div style={{ marginTop: 12 }}>
                  <p className="eyebrow" style={{ marginBottom: 4 }}>Dove comprarlo</p>
                  {o.searchTerms.map((t) => <BuyRow key={t} term={t} budget={budget} />)}
                </div>
              </div>
            ))}

            <div className="card" style={{ padding: "clamp(18px,3vw,28px)", marginTop: 24 }}>
              <p className="tag warn" style={{ marginBottom: 10 }}>Perché segnaliamo il fast fashion</p>
              <p className="muted" style={{ fontSize: 14, margin: 0, lineHeight: 1.55 }}>{FAST_FASHION_NOTE}</p>
            </div>

            <div style={{ marginTop: 32, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/wardrobe" className="btn ghost">Ho già dei capi da abbinare</Link>
              <button className="btn ghost" onClick={() => { setStep(1); setResult(null); }}>Ricomincia</button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
