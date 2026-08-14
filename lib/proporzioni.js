// Le proporzioni, e quali tagli ci cadono meglio.
//
// Uno stylist le guarda: non per nascondere niente, ma perché lo stesso
// pantalone su due persone diverse cade in due modi diversi. La distinzione
// che tiene in piedi tutto questo file è una sola:
//
//   sbagliato — "hai i fianchi larghi, coprili"
//   giusto    — "su queste proporzioni un dritto cade meglio di un affusolato"
//
// La prima parla del corpo di qualcuno. La seconda parla di un pantalone.
// Qui si parla solo di pantaloni.
//
// La corporatura da una fotografia NON si misura: servirebbe una posa
// controllata e un modello del corpo. Chiederla è più onesto che stimarla
// male, ed è anche quello che fa un sarto — con il metro, non a occhio.

export const FORME = [
  {
    id: "equilibrata",
    nome: "Spalle e fianchi simili",
    aiuto: "Le due larghezze si somigliano, la vita si distingue poco.",
    // Che cosa cade bene: si nomina il capo, mai la persona.
    tagli: ["Dritto", "Regolare", "Gamba larga", "Vita alta", "Linee nette"],
    nota: "Quasi tutto funziona: puoi giocare sulle lunghezze invece che sulle forme.",
  },
  {
    id: "vitaSegnata",
    nome: "Vita più stretta di spalle e fianchi",
    aiuto: "C'è uno stacco netto in mezzo.",
    tagli: ["Vita alta", "Aderente", "Slim", "Bootcut", "Linee morbide"],
    nota: "I capi che seguono la vita cadono naturalmente; quelli dritti a tubo la perdono.",
  },
  {
    id: "spalleLarghe",
    nome: "Spalle più larghe dei fianchi",
    aiuto: "Tipico di chi nuota o fa palestra, ma non solo.",
    tagli: ["Gamba larga", "Bootcut", "Flare / zampa", "Dritto", "Palazzo"],
    nota: "Sotto ci sta volume: i pantaloni ampi bilanciano, gli affusolati fanno l'opposto.",
  },
  {
    id: "fianchiLarghi",
    nome: "Fianchi più larghi delle spalle",
    aiuto: "La forma più comune fra le donne italiane.",
    tagli: ["Dritto", "Bootcut", "Vita alta", "Oversize", "Linee morbide"],
    nota: "Sopra ci sta struttura: spalline, colli importanti, stampe in alto.",
  },
  {
    id: "verticale",
    nome: "Linea dritta, poco stacco",
    aiuto: "Spalle, vita e fianchi quasi allineati.",
    tagli: ["Oversize", "Baggy", "Loose", "Vita bassa", "Linee morbide"],
    nota: "I volumi e le sovrapposizioni funzionano meglio degli abiti aderenti.",
  },
];

// L'altezza cambia le lunghezze, non le forme. È un fatto geometrico: la
// stessa gonna al ginocchio su 1,55 e su 1,85 cade in due punti diversi.
export function lunghezzePerAltezza(cm) {
  const h = Number(cm);
  if (!h || h < 130 || h > 220) return null;

  if (h < 162) {
    return {
      fascia: "sotto il metro e sessanta",
      preferisci: ["Crop", "Vita alta", "Alla caviglia", "Mini"],
      nota: "Le lunghezze che finiscono sopra la caviglia lasciano vedere dove comincia la gamba.",
    };
  }
  if (h > 178) {
    return {
      fascia: "sopra il metro e settantotto",
      preferisci: ["Maxi / lungo", "Gamba larga", "Midi", "Palazzo"],
      nota: "Hai la lunghezza per portare i capi lunghi interi, senza accorciarli.",
    };
  }
  return {
    fascia: "media",
    preferisci: ["Dritto", "Midi", "Regolare", "Alla caviglia"],
    nota: "Le lunghezze standard sono pensate su queste misure: partono già giuste.",
  };
}

/** I tagli consigliati, messi insieme. Mai un divieto: solo un ordine. */
export function tagliConsigliati({ forma, altezza } = {}) {
  const f = FORME.find((x) => x.id === forma);
  const l = lunghezzePerAltezza(altezza);

  const tagli = [...new Set([...(f?.tagli || []), ...(l?.preferisci || [])])];
  const note = [f?.nota, l?.nota].filter(Boolean);

  return {
    tagli,
    note,
    // Serve a scrivere una frase onesta: se non sappiamo niente, non inventiamo.
    dati: Boolean(f || l),
  };
}
