"use client";

import { useEffect, useState } from "react";
import { fileToDataUrl } from "@/lib/img";
import AnnuncioVinted from "@/components/AnnuncioVinted";
import NonUnCapo from "@/components/NonUnCapo";
import { raccogliCapo } from "@/lib/capoInCorso";

// Vendere un capo. L'annuncio, il prezzo, e il link per pubblicarlo.
//
// Sta per conto suo perché è un gesto per conto suo: chi arriva qui ha già
// deciso di dare via il capo, e non gli serve sapere con cosa abbinarlo.
export default function Vendi() {
  const [image, setImage] = useState(null);
  const [daAbbinamento, setDaAbbinamento] = useState(false);
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");

  // Se arriviamo dal tasto "Vendilo", la foto è già stata scelta di là.
  useEffect(() => {
    const foto = raccogliCapo();
    if (foto) {
      setImage(foto);
      setDaAbbinamento(true);
    }
  }, []);

  async function onPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr("");
    setDaAbbinamento(false);
    try { setImage(await fileToDataUrl(file)); } catch { setErr("Immagine non leggibile."); }
  }

  async function run() {
    if (!image) { setErr("Carica prima una foto del capo."); return; }
    setLoading(true); setErr(""); setRes(null);
    try {
      const r = await fetch("/api/vendi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Errore");
      setRes(data);
    } catch {
      setErr("Non sono riuscito a scrivere l'annuncio. Riprova con una foto più nitida.");
    } finally { setLoading(false); }
  }

  return (
    <div className="wrap" style={{ paddingTop: 56, paddingBottom: 20, maxWidth: 900 }}>
      <p className="eyebrow">Vendi</p>
      <h1 className="h1" style={{ fontSize: "clamp(30px, 5.4vw, 56px)", marginTop: 16, marginBottom: 12 }}>Metti in vendita un capo</h1>
      <p className="lead" style={{ marginBottom: 40 }}>
        Carica la foto e ti scrivo l&apos;annuncio: titolo e descrizione pronti da copiare su Vinted,
        un prezzo indicativo e il link per pubblicarlo, senza partire da zero.
      </p>

      {err ? <p style={{ color: "var(--signal)", marginBottom: 16 }}>{err}</p> : null}

      <div className="two">
        <label className="card" style={{ padding: 16, cursor: "pointer", display: "block" }}>
          <span className="label" style={{ display: "block", marginBottom: 10 }}>Foto del capo</span>
          <div style={{ aspectRatio: "3/4", background: "var(--stone)", display: "grid", placeItems: "center", overflow: "hidden" }}>
            {image ? <img src={image} alt="capo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span className="muted" style={{ fontSize: 13 }}>Tocca per caricare</span>}
          </div>
          <input data-avviso="La foto del capo viene inviata per il tempo della descrizione e non viene conservata." type="file" accept="image/*" onChange={onPhoto} style={{ display: "none" }} />
        </label>

        <div>
          {daAbbinamento ? (
            <p className="muted" style={{ fontSize: 13, marginTop: 0, marginBottom: 12 }}>
              È la foto che hai appena analizzato. Toccala per cambiarla.
            </p>
          ) : null}

          <button className="btn" onClick={run} disabled={loading}>{loading ? "Scrivo…" : "Scrivi l'annuncio"}</button>

          {res?.riconosciuto === false && (
            <div style={{ marginTop: 24 }}>
              <NonUnCapo esito={res} />
            </div>
          )}

          {res && res.riconosciuto !== false && (
            <div style={{ marginTop: 24 }}>
              <div className="card" style={{ padding: "clamp(18px,3vw,26px)" }}>
                <p className="eyebrow" style={{ marginBottom: 8 }}>Che capo è</p>
                <h3 className="h2" style={{ fontSize: 19, marginBottom: 6 }}>{res.title}</h3>
                <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>Categoria: {res.category}</p>
                <p style={{ fontSize: 15, lineHeight: 1.55, margin: 0 }}>{res.description}</p>
              </div>

              <AnnuncioVinted annuncio={res} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
