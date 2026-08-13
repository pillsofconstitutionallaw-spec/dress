"use client";

import { useRef, useState } from "react";

// Data di nascita in tre caselle: giorno, mese, anno.
//
// Il selettore di sistema costringe a scorrere anni all'indietro uno per uno:
// per chi è nato nel 1990 sono trentacinque scorrimenti. Qui si digita e basta,
// e il cursore salta da solo alla casella dopo.
export default function CampoData({ valore, onChange }) {
  const [gg, gm, ga] = (valore || "--").split("-").reverse();
  const [g, setG] = useState(gg && gg !== "" ? gg : "");
  const [m, setM] = useState(gm && gm !== "" ? gm : "");
  const [a, setA] = useState(ga && ga !== "" ? ga : "");

  const rifMese = useRef(null);
  const rifAnno = useRef(null);

  // Rimette insieme la data solo quando è completa: al server serve
  // nel formato AAAA-MM-GG.
  function aggiorna(giorno, mese, anno) {
    if (giorno.length === 2 && mese.length === 2 && anno.length === 4) {
      onChange(`${anno}-${mese.padStart(2, "0")}-${giorno.padStart(2, "0")}`);
    } else {
      onChange("");
    }
  }

  const soloCifre = (t, max) => t.replace(/\D/g, "").slice(0, max);

  return (
    <div>
      <span className="label" style={{ display: "block", marginBottom: 8 }}>Data di nascita</span>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.4fr", gap: 8 }}>
        <input
          className="control-app"
          inputMode="numeric"
          placeholder="GG"
          value={g}
          onChange={(e) => {
            const v = soloCifre(e.target.value, 2);
            setG(v);
            aggiorna(v, m, a);
            if (v.length === 2) rifMese.current?.focus();
          }}
          style={{ textAlign: "center" }}
          aria-label="Giorno"
        />
        <input
          ref={rifMese}
          className="control-app"
          inputMode="numeric"
          placeholder="MM"
          value={m}
          onChange={(e) => {
            const v = soloCifre(e.target.value, 2);
            setM(v);
            aggiorna(g, v, a);
            if (v.length === 2) rifAnno.current?.focus();
          }}
          style={{ textAlign: "center" }}
          aria-label="Mese"
        />
        <input
          ref={rifAnno}
          className="control-app"
          inputMode="numeric"
          placeholder="AAAA"
          value={a}
          onChange={(e) => {
            const v = soloCifre(e.target.value, 4);
            setA(v);
            aggiorna(g, m, v);
          }}
          style={{ textAlign: "center" }}
          aria-label="Anno"
        />
      </div>
    </div>
  );
}
