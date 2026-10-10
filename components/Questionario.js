"use client";

import { useEffect, useRef } from "react";
import { FAMIGLIE_STILI, HAIR, EYES, spiegaStile } from "@/lib/data";
import { FORME } from "@/lib/proporzioni";
import { soloCifre } from "@/lib/numeri";
import ColorePelle from "@/components/ColorePelle";
import SceltaTaglie from "@/components/SceltaTaglie";

// Il questionario dell'analisi, una domanda per schermata.
//
// Prima era una pagina sola con otto campi e due passi dopo per le foto. Su
// un telefono voleva dire scorrere un modulo lungo, con menu a tendina che
// aprono una rotella e nascondono le altre risposte, e peso e altezza come
// prima cosa. Adesso si comincia dalla foto — il motivo per cui uno è qui —
// e ogni schermata chiede una cosa, con la ragione in una riga.
//
// Le risposte a scelta unica portano avanti da sole: toccare «Castano scuro»
// e poi dover cercare «Avanti» è un tocco in più per niente.

const SESSI = [
  { valore: "female", nome: "Donna" },
  { valore: "male", nome: "Uomo" },
  { valore: "nonbinary", nome: "Non binario" },
  { valore: "", nome: "Preferisco non dirlo" },
];

function FotoGrande({ valore, onFile, etichetta }) {
  return (
    <label style={{ display: "block", cursor: "pointer" }}>
      <div
        style={{
          aspectRatio: "3/4",
          maxHeight: 380,
          margin: "0 auto",
          background: "var(--stone)",
          border: "1px solid var(--line)",
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
        }}
      >
        {valore ? (
          <img src={valore} alt={etichetta} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ fontSize: 15, textAlign: "center", padding: 20 }}>
            <span style={{ display: "block", fontSize: 30, lineHeight: 1, marginBottom: 10 }} aria-hidden="true">+</span>
            Tocca per scattare o scegliere
          </span>
        )}
      </div>
      {valore ? <span className="muted" style={{ display: "block", textAlign: "center", fontSize: 13, marginTop: 10 }}>Tocca per cambiarla</span> : null}
      <input type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
    </label>
  );
}

export default function Questionario({ domanda, setDomanda, profile, setProfile, closeup, fullbody, onFoto, analizza, loading }) {
  const metti = (campo, valore) => setProfile((p) => ({ ...p, [campo]: valore }));
  const titolo = useRef(null);

  // Le domande. «risposta» dice se c'è già una risposta: decide se il tasto
  // in fondo è «Avanti» o «Salta».
  const DOMANDE = [
    {
      id: "viso",
      titolo: "Una foto del viso",
      perche: "Luce naturale, vicino a una finestra, senza filtri. Resta sul telefono: i colori si misurano qui dentro.",
      risposta: Boolean(closeup),
      corpo: <FotoGrande valore={closeup} etichetta="Il tuo viso" onFile={(e) => onFoto("closeup", e)} />,
    },
    {
      id: "figura",
      titolo: "Una a figura intera",
      perche: "Facoltativa. Ci fa vedere i colori che porti già, e rende la misura più sicura.",
      risposta: Boolean(fullbody),
      corpo: <FotoGrande valore={fullbody} etichetta="Figura intera" onFile={(e) => onFoto("fullbody", e)} />,
    },
    {
      id: "pelle",
      titolo: "Il colore della tua pelle",
      perche: "Appoggia il polso accanto allo schermo, vicino a una finestra, e scegli il quadratino più vicino.",
      risposta: Boolean(profile.pelle),
      corpo: <ColorePelle valore={profile.pelle} onCambia={(id) => metti("pelle", id)} compatto />,
    },
    {
      id: "capelli",
      titolo: "Di che colore hai i capelli?",
      campo: "hair",
      scelte: HAIR.map((h) => ({ valore: h, nome: h })),
    },
    {
      id: "occhi",
      titolo: "E gli occhi?",
      campo: "eyes",
      scelte: EYES.map((h) => ({ valore: h, nome: h })),
    },
    {
      id: "sesso",
      titolo: "In che reparto cerchi i vestiti?",
      perche: "Serve solo a mostrarti i capi giusti. Puoi cambiarlo quando vuoi, anche nella ricerca.",
      campo: "sex",
      scelte: SESSI,
      // «Preferisco non dirlo» è una risposta, non un salto: vale "".
      risposta: true,
    },
    {
      id: "altezza",
      titolo: "Quanto sei alto o alta?",
      perche: "Per le lunghezze: la stessa gonna al ginocchio cade in punti diversi su un metro e cinquanta e su un metro e ottanta.",
      risposta: Boolean(profile.height),
      corpo: (
        <label style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <input
            className="control"
            inputMode="numeric"
            value={profile.height}
            onChange={(e) => metti("height", soloCifre(e.target.value, 3))}
            placeholder="170"
            aria-label="Altezza in centimetri"
            style={{ fontSize: 22, maxWidth: 140 }}
          />
          <span className="muted" style={{ fontSize: 18 }}>cm</span>
        </label>
      ),
    },
    {
      id: "taglie",
      titolo: "Che taglie porti di solito?",
      perche: "Così ti mostriamo i capi che esistono nella tua taglia. Lascia vuote quelle che non sai.",
      risposta: Boolean(profile.tagliaSopra || profile.tagliaSotto || profile.tagliaScarpe),
      corpo: <SceltaTaglie valori={profile} onCambia={metti} />,
    },
    {
      id: "proporzioni",
      titolo: "Com'è la tua figura?",
      perche: "Solo per capire quali tagli ti cadono meglio. Parliamo dei vestiti, mai del corpo.",
      campo: "forma",
      larga: true,
      scelte: [
        ...FORME.map((f) => ({ valore: f.id, nome: f.nome, detta: f.aiuto })),
        { valore: "", nome: "Preferisco non dirlo" },
      ],
      risposta: true,
    },
    {
      id: "stile",
      titolo: "Come ti vesti adesso?",
      perche: "Non serve saperlo: se non lo sai, lo scopriamo insieme.",
      risposta: true,
      corpo: (
        <select className="control" value={profile.style} onChange={(e) => metti("style", e.target.value)} aria-label="Il tuo stile attuale" style={{ fontSize: 16 }}>
          <option value="">Non lo so ancora</option>
          {FAMIGLIE_STILI.map((f) => (
            <optgroup key={f.famiglia} label={f.famiglia}>
              {f.stili.map((st) => (
                <option key={st} value={st}>
                  {st}{spiegaStile(st) ? ` — ${spiegaStile(st).split(/[.:]/)[0]}` : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      ),
    },
  ];

  const quante = DOMANDE.length;
  const i = Math.min(Math.max(domanda, 0), quante - 1);
  const d = DOMANDE[i];
  const ultima = i === quante - 1;
  const risposta = d.risposta ?? Boolean(profile[d.campo]);

  // Cambiando domanda il lettore di schermo deve sapere che è cambiata, e
  // chi ha scorso in giù deve ritrovarsi in cima.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    titolo.current?.focus({ preventScroll: true });
  }, [i]);

  const avanti = () => (ultima ? analizza() : setDomanda(i + 1));

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <button
          type="button"
          onClick={() => setDomanda(i - 1)}
          disabled={i === 0}
          aria-label="Domanda precedente"
          style={{ background: "none", border: 0, padding: "4px 6px 4px 0", fontSize: 22, lineHeight: 1, cursor: i === 0 ? "default" : "pointer", color: "var(--ink)", opacity: i === 0 ? 0.2 : 1 }}
        >
          ←
        </button>
        <div style={{ display: "flex", gap: 4, flex: 1 }} aria-hidden="true">
          {DOMANDE.map((x, k) => (
            <div key={x.id} style={{ flex: 1, height: 3, background: k <= i ? "var(--ink)" : "var(--line)" }} />
          ))}
        </div>
        <span className="muted" style={{ fontSize: 13, whiteSpace: "nowrap" }}>{i + 1} di {quante}</span>
      </div>

      <h1
        ref={titolo}
        tabIndex={-1}
        style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 26, lineHeight: 1.2, margin: "0 0 10px", outline: "none" }}
      >
        {d.titolo}
      </h1>
      {d.perche ? <p className="muted" style={{ fontSize: 15, margin: "0 0 24px", lineHeight: 1.5 }}>{d.perche}</p> : <div style={{ height: 14 }} />}

      {d.scelte ? (
        <div className="scelte" style={d.larga ? { flexDirection: "column" } : undefined} role="group" aria-label={d.titolo}>
          {d.scelte.map((sc) => (
            <button
              key={sc.nome}
              type="button"
              className={`scelta${d.larga ? " larga" : ""}`}
              // «Preferisco non dirlo» vale "", che è anche il valore di chi
              // non ha ancora risposto: evidenziarlo vorrebbe dire mostrarlo
              // scelto prima che uno tocchi qualcosa.
              aria-pressed={sc.valore !== "" && profile[d.campo] === sc.valore}
              onClick={() => {
                metti(d.campo, sc.valore);
                if (!ultima) setTimeout(() => setDomanda(i + 1), 220);
              }}
            >
              {sc.nome}
              {sc.detta ? <span className="detta">{sc.detta}</span> : null}
            </button>
          ))}
        </div>
      ) : (
        d.corpo
      )}

      <div style={{ marginTop: 32, display: "grid", gap: 10 }}>
        <button type="button" className={`btn-app${risposta || ultima ? "" : " chiaro"}`} onClick={avanti} disabled={loading}>
          {ultima ? (loading ? "Creo la tua palette…" : "Crea la mia palette") : risposta ? "Avanti" : "Salta"}
        </button>
      </div>
    </section>
  );
}
