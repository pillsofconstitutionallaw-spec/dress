"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { smaltiPer } from "@/lib/unghie";
import { tonoPelle } from "@/lib/pelle";

// Gli smalti che stanno bene a te.
//
// La richiesta era «le tendenze mensili». Non si possono fare oneste: non
// esiste una fonte gratuita che le misuri, e chiederle a un modello è
// l'errore che quest'app si rifiuta di fare per i tagli di moda — vedi
// app/api/tendenze/route.js, dove c'è scritto perché.
//
// Questo invece è vero, ed è una cosa che nessuno dei concorrenti fa: il
// sottotono della pelle lo abbiamo misurato durante l'analisi, e da quello
// si sa quali smalti accendono le mani e quali le spengono. Non cambia col
// mese, il che è un difetto solo in apparenza: vuol dire che vale ancora
// l'anno prossimo.

export default function Unghie() {
  const [sessione, setSessione] = useState(undefined);
  const [foto, setFoto] = useState([]);

  useEffect(() => {
    let s = null;
    try {
      s = JSON.parse(localStorage.getItem("dress:session") || "null");
    } catch {
      /* nessuna analisi */
    }
    setSessione(s);

    fetch("/api/unghie")
      .then((r) => r.json())
      .then((d) => setFoto(d.foto || []))
      // Le foto sono un di più: i colori sono la parte che conta, e senza
      // fotografie la pagina vale lo stesso.
      .catch(() => {});
  }, []);

  if (sessione === undefined) {
    return <div className="wrap" style={{ paddingTop: 32 }}><p className="muted">Un momento…</p></div>;
  }

  // Il tono sta nel profilo, non nel risultato: è un dato della persona,
  // non dell'analisi di quella foto. Averlo cercato nel posto sbagliato
  // avrebbe fatto dire «fai prima l'analisi» anche a chi l'aveva fatta.
  const tono = tonoPelle(sessione?.profile?.pelle);
  const smalti = smaltiPer({ tono: tono?.id, palette: sessione?.result?.palette });

  return (
    <div className="wrap" style={{ paddingTop: 32, paddingBottom: 40, maxWidth: 640 }}>
      <h1 className="h2" style={{ marginBottom: 4 }}>Smalti che ti stanno bene</h1>
      <p className="muted" style={{ fontSize: 14 }}>
        Scelti sul sottotono della tua pelle, misurato durante l&apos;analisi.
      </p>

      {!smalti.length ? (
        <p className="muted" style={{ fontSize: 14, marginTop: 22 }}>
          Prima serve l&apos;analisi dei colori: senza sapere che sottotono ha la tua pelle,
          consiglierei uno smalto a caso — e uno smalto sbagliato si vede più di una maglietta
          sbagliata. <Link href="/start">Falla adesso</Link>, sono due minuti.
        </p>
      ) : (
        <>
          {/* Dire su cosa si basa il consiglio, non solo darlo. È la
              differenza fra un oroscopo e una misura. */}
          <p className="muted" style={{ fontSize: 12, marginTop: 18 }}>
            La tua pelle è <strong>{tono.nome.toLowerCase()}</strong>: {tono.detta.toLowerCase()}
          </p>

          <ul style={{ listStyle: "none", padding: 0, margin: "18px 0 0" }}>
            {smalti.map((s) => (
              <li key={s.hex + s.nome} style={{ display: "flex", gap: 12, padding: "12px 0", borderTop: "1px solid #f0f0f0" }}>
                <span
                  style={{
                    width: 38, height: 38, borderRadius: "50%", flex: "0 0 auto",
                    background: s.hex, border: "1px solid rgba(0,0,0,.12)",
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14 }}>
                    {s.nome}
                    {s.daPalette ? <span className="muted" style={{ fontSize: 11 }}> · dalla tua palette</span> : null}
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2, lineHeight: 1.45 }}>{s.perche}</div>
                </div>
              </li>
            ))}
          </ul>

          {/* Qui si dice cosa questa pagina NON è, perché era la richiesta di
              partenza e chi la fece merita di sapere perché ha ricevuto
              altro. */}
          <p className="muted" style={{ fontSize: 12, marginTop: 24, lineHeight: 1.55 }}>
            Non sono le tendenze del mese, ed è voluto: di quelle non esiste una fonte che si possa
            misurare, e chiederle a un programma vuol dire riceverne di inventate. Questi colori
            invece vengono da come è fatta la tua pelle — e per lo stesso motivo valgono anche fra
            sei mesi.
          </p>
        </>
      )}

      {foto.length ? (
        <div style={{ marginTop: 30 }}>
          <span className="label" style={{ display: "block", marginBottom: 10 }}>Come si portano</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
            {foto.map((f) => (
              <figure key={f.url} style={{ margin: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt={f.didascalia} style={{ width: "100%", height: 140, objectFit: "cover" }} loading="lazy" />
                <figcaption className="muted" style={{ fontSize: 10, marginTop: 4, lineHeight: 1.35 }}>
                  {/* L'attribuzione non è cortesia: è la condizione a cui
                      queste foto si possono mostrare. */}
                  {f.autore || "Autore ignoto"} · {f.licenza}
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 11, marginTop: 10 }}>
            Foto da{" "}
            <a href="https://commons.wikimedia.org/" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>, con
            le licenze indicate sotto a ognuna.
          </p>
        </div>
      ) : null}
    </div>
  );
}
