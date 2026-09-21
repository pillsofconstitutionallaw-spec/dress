"use client";

import { useState } from "react";
import Link from "next/link";

// I negozi di vestiti qui intorno.
//
// La posizione non si chiede all'apertura della pagina. Si chiede quando
// qualcuno preme il tasto, perché a quel punto ha capito cosa sta per dare e
// perché: una finestra del telefono che chiede «posso sapere dove sei?»
// appena si apre una schermata è il modo più veloce per ricevere un no.
//
// E si dà via meno di quanto si crede: il browser ci dà il punto esatto, ma
// prima di uscire da qui lo arrotondiamo a cento metri. Vedi lib/vicini.js.

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
          setNegozi(d.negozi);
          setRaggio(d.raggio);
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
            usarla, non la salviamo da nessuna parte e non la diamo a nessuno.
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

          <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0" }}>
            {negozi.map((n) => (
              <li key={n.id} style={{ padding: "12px 0", borderTop: "1px solid #e8e8e8" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 15 }}>{n.nome}</strong>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {quantoDista(n.metri)}
                    {n.genere && GENERI[n.genere] ? ` · ${GENERI[n.genere]}` : ""}
                  </span>
                </div>

                {n.inCatalogo ? (
                  <p className="muted" style={{ fontSize: 12, margin: "4px 0 0" }}>
                    {n.quantiInCatalogo
                      ? `Di questo negozio abbiamo ${n.quantiInCatalogo.toLocaleString("it-IT")} capi, con prezzi e colori.`
                      : "Questo negozio è fra quelli che seguiamo."}
                  </p>
                ) : null}

                <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
                  {/* Il sito prima della mappa: chi cerca gli sconti li trova lì. */}
                  {n.sito ? (
                    <a href={n.sito} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13 }}>
                      Il loro sito
                    </a>
                  ) : null}
                  <a href={n.mappa} target="_blank" rel="noopener noreferrer" className="muted" style={{ fontSize: 13 }}>
                    Dove si trova
                  </a>
                </div>
              </li>
            ))}
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
