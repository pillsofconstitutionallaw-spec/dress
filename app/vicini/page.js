"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import MappaNegozi from "@/components/MappaNegozi";

// I negozi di vestiti qui intorno.
//
// La posizione non si chiede all'apertura della pagina. Si chiede quando
// qualcuno preme il tasto, perché a quel punto ha capito cosa sta per dare e
// perché: una finestra del telefono che chiede «posso sapere dove sei?»
// appena si apre una schermata è il modo più veloce per ricevere un no.
//
// E si dà via meno di quanto si crede: il browser ci dà il punto esatto, ma
// prima di uscire da qui lo arrotondiamo a cento metri. Vedi lib/vicini.js.
//
// Sopra la mappa, sotto l'elenco. Si tocca un negozio — su una o sull'altro —
// e si apre: indirizzo, orari, come arrivarci, sito e social.

function quantoDista(metri) {
  if (metri < 1000) return `${metri} m`;
  return `${(metri / 1000).toFixed(1).replace(".", ",")} km`;
}

// Come si chiamano in italiano i raggruppamenti di OpenStreetMap.
const GENERI = {
  clothes: "abbigliamento",
  boutique: "boutique",
  shoes: "scarpe",
  fashion_accessories: "accessori",
  bag: "borse",
};

export default function Vicini() {
  const [stato, setStato] = useState("fermo"); // fermo | cerco | fatto | guasto
  const [negozi, setNegozi] = useState([]);
  const [raggio, setRaggio] = useState(1500);
  const [problema, setProblema] = useState("");
  const [centro, setCentro] = useState(null);
  const [scelto, setScelto] = useState(null);
  // Ogni ricerca ha la sua mappa: cambiando raggio si ricomincia da capo
  // invece di spostare quella vecchia.
  const [giro, setGiro] = useState(0);
  const righe = useRef(new Map());

  // Toccato un punto sulla mappa, il negozio si apre nell'elenco e ci si
  // scorre fino a vederlo.
  useEffect(() => {
    if (scelto) righe.current.get(scelto)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [scelto]);

  function cerca(metri = raggio) {
    if (!navigator.geolocation) {
      setProblema("Questo browser non sa dire dove sei. Puoi comunque cercare i capi per colore.");
      setStato("guasto");
      return;
    }
    setStato("cerco");
    setProblema("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const q = new URLSearchParams({
            lat: String(pos.coords.latitude),
            lon: String(pos.coords.longitude),
            raggio: String(metri),
          });
          const res = await fetch(`/api/vicini?${q}`);
          const d = await res.json();
          if (!res.ok || !d.ok) throw new Error(d.error || "no");
          // Sulla mappa si mette lo stesso punto arrotondato che è partito,
          // non quello esatto: «più o meno qui» è quello che sappiamo.
          setCentro({
            lat: Math.round(pos.coords.latitude * 1000) / 1000,
            lon: Math.round(pos.coords.longitude * 1000) / 1000,
          });
          setNegozi(d.negozi);
          setRaggio(d.raggio);
          setScelto(null);
          setGiro((g) => g + 1);
          setStato("fatto");
        } catch (e) {
          setProblema(e.message === "no" ? "Non ha funzionato. Riprova fra poco." : e.message);
          setStato("guasto");
        }
      },
      (err) => {
        // I tre no sono diversi e si riparano in modi diversi: dirlo evita
        // che uno si metta a premere il tasto sperando che cambi idea.
        setProblema(
          err.code === 1
            ? "Non ci hai dato il permesso di sapere dove sei. Puoi cambiarlo dalle impostazioni del browser, alla voce Posizione."
            : err.code === 3
              ? "Il telefono ci sta mettendo troppo a capire dove sei. Succede al chiuso: prova vicino a una finestra."
              : "Non siamo riusciti a capire dove sei. Riprova fra un momento.",
        );
        setStato("guasto");
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 120000 },
    );
  }

  return (
    <div className="wrap" style={{ paddingTop: 32, paddingBottom: 40, maxWidth: 640 }}>
      <h1 className="h2" style={{ marginBottom: 4 }}>Negozi qui intorno</h1>
      <p className="muted" style={{ fontSize: 14 }}>
        Dove puoi entrare e provarti le cose. Di alcuni sappiamo già cosa vendono.
      </p>

      {stato !== "fatto" ? (
        <>
          <button
            type="button"
            className="btn-app"
            style={{ marginTop: 22, width: "100%" }}
            onClick={() => cerca()}
            disabled={stato === "cerco"}
          >
            {stato === "cerco" ? "Cerco…" : "Guarda cosa c'è vicino"}
          </button>
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            Il telefono ti chiederà il permesso. La posizione la arrotondiamo a cento metri prima di
            usarla e non la salviamo da nessuna parte. La mappa la disegna OpenStreetMap: per farlo vede
            la zona che stai guardando, come qualunque mappa.
          </p>
        </>
      ) : null}

      {stato === "guasto" ? (
        <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>{problema}</p>
      ) : null}

      {stato === "fatto" ? (
        <>
          <p className="muted" style={{ fontSize: 13, marginTop: 20 }}>
            {negozi.length
              ? `${negozi.length} negozi entro ${quantoDista(raggio)}.`
              : `Qui intorno, entro ${quantoDista(raggio)}, non ce n'è nessuno sulla mappa. Prova ad allargare.`}
          </p>

          {centro && negozi.length ? (
            <div style={{ marginTop: 14 }}>
              <MappaNegozi
                key={giro}
                centro={centro}
                negozi={negozi}
                scelto={scelto}
                onScegli={(id) => setScelto(id)}
              />
            </div>
          ) : null}

          <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0" }}>
            {negozi.map((n) => {
              const aperto = n.id === scelto;
              return (
                <li
                  key={n.id}
                  ref={(el) => (el ? righe.current.set(n.id, el) : righe.current.delete(n.id))}
                  style={{ borderTop: "1px solid var(--line)", scrollMarginTop: 60, scrollMarginBottom: 90 }}
                >
                  <button
                    type="button"
                    onClick={() => setScelto(aperto ? null : n.id)}
                    aria-expanded={aperto}
                    style={{
                      display: "flex",
                      width: "100%",
                      gap: 10,
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      padding: "14px 0",
                      background: "none",
                      border: 0,
                      font: "inherit",
                      color: "inherit",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <span>
                      <strong style={{ fontSize: 15, color: aperto ? "var(--signal)" : "inherit" }}>{n.nome}</strong>
                      <span className="muted" style={{ fontSize: 13, display: "block", marginTop: 2 }}>
                        {quantoDista(n.metri)}
                        {n.genere && GENERI[n.genere] ? ` · ${GENERI[n.genere]}` : ""}
                        {n.inCatalogo ? " · in catalogo" : ""}
                      </span>
                    </span>
                    <span aria-hidden="true" className="muted" style={{ fontSize: 18, lineHeight: 1 }}>
                      {aperto ? "−" : "+"}
                    </span>
                  </button>

                  {aperto ? <DettagliNegozio negozio={n} /> : null}
                </li>
              );
            })}
          </ul>

          <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
            {raggio < 5000 ? (
              <button type="button" className="btn-app" onClick={() => cerca(Math.min(raggio * 2, 5000))}>
                Cerca più lontano
              </button>
            ) : null}
            <Link href="/cerca" className="muted" style={{ fontSize: 13, alignSelf: "center" }}>
              Oppure cerca nei nostri colori
            </Link>
          </div>
        </>
      ) : null}

      {/* I dati sono di chi li ha mappati, e la licenza chiede di dirlo. */}
      <p className="muted" style={{ fontSize: 11, marginTop: 28 }}>
        Negozi da{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          OpenStreetMap
        </a>
        , mappati dalle persone che ci vivono. Se ne manca uno, si può aggiungere.
      </p>
    </div>
  );
}

// Quello che si vede toccando un negozio. Si mostra solo quello che c'è:
// in OpenStreetMap metà dei negozi non ha il sito e pochi hanno i social, e
// una riga «Instagram: non disponibile» è rumore.
function DettagliNegozio({ negozio: n }) {
  const link = { fontSize: 14, textDecoration: "underline", textUnderlineOffset: 3 };
  return (
    <div style={{ padding: "0 0 18px", display: "grid", gap: 12 }}>
      {n.indirizzo ? <p style={{ margin: 0, fontSize: 14 }}>{n.indirizzo}</p> : null}

      {n.orari?.length ? (
        <div className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
          {n.orari.map((r) => <div key={r}>{r}</div>)}
        </div>
      ) : null}

      {n.inCatalogo ? (
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          {n.quantiInCatalogo
            ? `Di questo negozio abbiamo ${n.quantiInCatalogo.toLocaleString("it-IT")} capi, con prezzi e colori.`
            : "Questo negozio è fra quelli che seguiamo."}
        </p>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 18px", alignItems: "center" }}>
        <a className="btn" href={n.indicazioni} target="_blank" rel="noopener noreferrer">
          Indicazioni
        </a>
        {n.sito ? <a href={n.sito} target="_blank" rel="noopener noreferrer" style={link}>Sito</a> : null}
        {n.social?.map((s) => (
          <a key={s.nome} href={s.url} target="_blank" rel="noopener noreferrer" style={link}>{s.nome}</a>
        ))}
        {n.telefono ? (
          <a href={`tel:${n.telefono.replace(/[^\d+]/g, "")}`} style={link}>{n.telefono}</a>
        ) : null}
      </div>
    </div>
  );
}
