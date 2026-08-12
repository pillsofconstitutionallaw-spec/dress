"use client";

import { useState } from "react";
import { fileToDataUrl } from "@/lib/img";

export default function Wardrobe() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");

  async function onPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr("");
    try { setImage(await fileToDataUrl(file)); } catch { setErr("Immagine non leggibile."); }
  }

  async function run() {
    if (!image) { setErr("Carica prima una foto del capo."); return; }
    setLoading(true); setErr(""); setRes(null);
    try {
      const r = await fetch("/api/resell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Errore");
      setRes(data);
    } catch {
      setErr("Analisi non riuscita. Riprova.");
    } finally { setLoading(false); }
  }

  return (
    <div className="wrap" style={{ paddingTop: 56, paddingBottom: 20, maxWidth: 900 }}>
      <p className="eyebrow">Il tuo guardaroba</p>
      <h1 className="h1" style={{ fontSize: "clamp(30px, 5.4vw, 56px)", marginTop: 16, marginBottom: 12 }}>Abbina o rivendi un capo</h1>
      <p className="lead" style={{ marginBottom: 40 }}>
        Carica la foto di un capo che hai già. Ti do consigli su come abbinarlo — e se vuoi rivenderlo,
        una descrizione pronta, un prezzo indicativo e il link per pubblicarlo, senza dover partire da zero.
      </p>

      {err ? <p style={{ color: "var(--signal)", marginBottom: 16 }}>{err}</p> : null}

      <div className="summary-card" style={{ marginBottom: 24, borderRadius: 18 }}>
        <p className="eyebrow" style={{ marginBottom: 8 }}>Come lavora il servizio</p>
        <p className="muted" style={{ margin: 0, fontSize: 15 }}>
          Carichi una foto, ottieni consigli di abbinamento e una scheda di rivendita pronta da usare, con un tono più pratico e più elegante.
        </p>
      </div>

      <div className="two">
        <label className="card" style={{ padding: 16, cursor: "pointer", display: "block" }}>
          <span className="label" style={{ display: "block", marginBottom: 10 }}>Foto del capo</span>
          <div style={{ aspectRatio: "3/4", background: "var(--stone)", display: "grid", placeItems: "center", overflow: "hidden" }}>
            {image ? <img src={image} alt="capo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span className="muted" style={{ fontSize: 13 }}>Tocca per caricare</span>}
          </div>
          <input type="file" accept="image/*" onChange={onPhoto} style={{ display: "none" }} />
        </label>

        <div>
          <button className="btn" onClick={run} disabled={loading}>{loading ? "Analizzo…" : "Analizza il capo"}</button>

          {res && (
            <div style={{ marginTop: 24 }}>
              {/* production UI: no demo badge shown */}

              <div className="card" style={{ padding: "clamp(18px,3vw,26px)" }}>
                <p className="eyebrow" style={{ marginBottom: 8 }}>Come abbinarlo</p>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {res.matchTips?.map((t, i) => <li key={i} style={{ marginBottom: 8, fontSize: 15 }}>{t}</li>)}
                </ul>
              </div>

              <div className="card" style={{ padding: "clamp(18px,3vw,26px)", marginTop: 16 }}>
                <p className="eyebrow" style={{ marginBottom: 8 }}>Scheda di rivendita</p>
                <h3 className="h2" style={{ fontSize: 19, marginBottom: 6 }}>{res.title}</h3>
                <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>Categoria: {res.category} · Prezzo suggerito: <strong style={{ color: "var(--ink)" }}>{res.priceRange}</strong></p>
                <p style={{ fontSize: 15, lineHeight: 1.55 }}>{res.description}</p>
                <a className="btn" style={{ marginTop: 12 }} href={res.vintedUrl} target="_blank" rel="noopener noreferrer">Pubblica su Vinted →</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
