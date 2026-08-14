// Le domande che fa un armocromista vero.
//
// Nessun professionista guarda una fotografia: appoggia dei teli colorati
// sotto il viso e osserva. Non potendo farlo, si usa l'altra metà del suo
// mestiere — le domande che pone prima di cominciare. Sono sempre le stesse,
// in ogni corso, e valgono più di qualunque misura presa da un telefono:
// riguardano come reagisci alla luce nella vita, non come sei venuto in una
// foto scattata in cucina.
//
// Sono domande di FATTO, non di gusto: "ti abbronzi o ti scotti" si sa,
// "ti sta meglio l'oro o l'argento" no — e chiederlo era circolare, perché
// chi lo sapesse non avrebbe bisogno dell'app. Il confronto fra oro e argento
// si fa guardando, e per quello c'è il drappeggio.
//
// Il punteggio è positivo verso il caldo, negativo verso il freddo.

export const DOMANDE = [

  {
    id: "sole",
    domanda: "Al sole ti abbronzi o ti scotti?",
    aiuto: "Pensa ai primi giorni di mare, senza protezione alta.",
    peso: 2.4,
    risposte: [
      { testo: "Mi abbronzo subito, difficilmente mi scotto", valore: 1 },
      { testo: "Prima mi scotto, poi mi abbronzo", valore: 0.2 },
      { testo: "Mi scotto e basta, non prendo colore", valore: -1 },
    ],
  },
  {
    id: "vene",
    domanda: "Le vene del polso, alla luce del giorno, che colore hanno?",
    aiuto: "Guarda la parte interna del polso vicino a una finestra.",
    peso: 2.2,
    risposte: [
      { testo: "Verdastre", valore: 1 },
      { testo: "Bluastre o viola", valore: -1 },
      { testo: "Un misto, non capisco", valore: 0 },
    ],
  },
  {
    id: "guance",
    domanda: "Ti vengono facilmente le guance rosse?",
    aiuto: "Con il freddo, l'imbarazzo, lo sport. È un fatto, non un giudizio.",
    peso: 1.6,
    risposte: [
      { testo: "Sì, spesso", valore: -0.9 },
      { testo: "Ogni tanto", valore: -0.2 },
      { testo: "Quasi mai", valore: 0.7 },
    ],
  },
  {
    id: "lentiggini",
    domanda: "Hai lentiggini?",
    aiuto: "Le lentiggini dorate accompagnano quasi sempre un sottotono caldo.",
    peso: 1.5,
    risposte: [
      { testo: "Sì, molte", valore: 1.2 },
      { testo: "Qualcuna", valore: 0.5 },
      { testo: "No", valore: -0.3 },
    ],
  },
  {
    id: "capelliBambino",
    domanda: "Da bambino che capelli avevi?",
    aiuto: "Serve a capire la tua profondità naturale, prima di tinte e sole.",
    peso: 1.4,
    risposte: [
      { testo: "Biondi o ramati", valore: 1 },
      { testo: "Castani chiari", valore: 0.3 },
      { testo: "Castani scuri o neri", valore: -0.6 },
      { testo: "Rossi", valore: 1.4 },
    ],
  },
];

// Il drappeggio pesa più di ogni domanda, ed è giusto così: è l'unico momento
// in cui la persona GUARDA sé stessa accanto a un colore, invece di ricordare
// o dedurre. È il gesto che un armocromista fa per primo e su cui decide.
//
// I pesi vivono qui e non nel componente, perché il componente disegna e
// basta: se il calcolo dipendesse da lui, spostare un colore cambierebbe una
// diagnosi. Ed è esattamente l'errore che questo file ha già commesso una
// volta — le scelte del drappeggio non venivano contate affatto.
export const PESI_DRAPPEGGIO = {
  metallo: 3.4, // oro contro argento: il confronto più netto che esista
  bianco: 2.6, // panna contro bianco ottico
  rosa: 2.2, // pesca contro rosa freddo
};

/**
 * Dalle risposte al sottotono: drappeggio più domande.
 * Ritorna null se non ha risposto a niente: in quel caso comanda la misura.
 */
export function esitoDelTest(risposte = {}) {
  let somma = 0;
  let pesoTotale = 0;

  for (const [id, peso] of Object.entries(PESI_DRAPPEGGIO)) {
    const valore = risposte[id];
    if (valore === undefined || valore === null) continue;
    somma += Number(valore) * peso;
    pesoTotale += peso;
  }

  for (const d of DOMANDE) {
    const valore = risposte[d.id];
    if (valore === undefined || valore === null) continue;
    somma += Number(valore) * d.peso;
    pesoTotale += d.peso;
  }

  if (!pesoTotale) return null;

  const normalizzato = somma / pesoTotale; // fra -1 e 1
  return {
    sottotono: normalizzato >= 0 ? "caldo" : "freddo",
    // Poche risposte o risposte contraddittorie = poca certezza.
    certezza: Math.min(1, Math.abs(normalizzato) * Math.min(1, pesoTotale / 8.2)),
    risposteDate: Object.values(risposte).filter((v) => v !== undefined && v !== null).length,
  };
}

/**
 * Mette insieme quello che dice il test e quello che dice la foto.
 *
 * Il test pesa di più, e non è una scelta di comodo: le sue domande
 * riguardano come reagisci alla luce nella vita reale, mentre la foto è un
 * istante sotto una lampadina qualsiasi. Quando i due litigano, e il test è
 * netto, vince il test — ed è quello che farebbe anche una persona.
 */
export function combina({ testEsito, misuraSottotono, misuraCertezza = 0.5 }) {
  if (!testEsito) return { sottotono: misuraSottotono, fonte: "foto", concordi: null };

  const dallaMisura = misuraSottotono === "caldo" ? 1 : -1;
  const dalTest = testEsito.sottotono === "caldo" ? 1 : -1;
  const concordi = dallaMisura === dalTest;

  // La foto pesa meno di quanto sembri: è un istante sotto una luce
  // qualsiasi, mentre le risposte descrivono come reagisci al sole da sempre.
  // Trattarle come prove di pari forza faceva scendere la certezza anche nei
  // casi netti, e l'app finiva per chiedere aiuto sempre — inutile quanto
  // sbagliare sempre.
  const pesoMisura = misuraCertezza * 0.6;
  const punteggio = dalTest * testEsito.certezza * 2.2 + dallaMisura * pesoMisura;

  return {
    sottotono: punteggio >= 0 ? "caldo" : "freddo",
    fonte: concordi ? "test e foto d'accordo" : "test",
    concordi,
    // Rapportata a quanto si poteva sapere in tutto, non a una costante.
    certezza: Math.min(1, Math.abs(punteggio) / (2.2 + pesoMisura)),
  };
}
