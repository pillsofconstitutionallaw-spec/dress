// Le domande che fa un armocromista vero.
//
// Nessun professionista guarda una fotografia: appoggia dei teli colorati
// sotto il viso e osserva. Non potendo farlo, si usa l'altra metà del suo
// mestiere — le domande che pone prima di cominciare. Sono sempre le stesse,
// in ogni corso, e valgono più di qualunque misura presa da un telefono:
// riguardano come reagisci alla luce nella vita, non come sei venuto in una
// foto scattata in cucina.
//
// Il punteggio è positivo verso il caldo, negativo verso il freddo.

export const DOMANDE = [
  {
    id: "metallo",
    domanda: "Ti sta meglio l'oro o l'argento?",
    aiuto: "Guarda un anello o una catenina vicino al viso: quale ti illumina e quale ti spegne.",
    // È la domanda più affidabile di tutte: il metallo fa da telo.
    peso: 3.2,
    risposte: [
      { testo: "Oro", valore: 1 },
      { testo: "Argento", valore: -1 },
      { testo: "Tutti e due", valore: 0 },
      { testo: "Non saprei", valore: 0 },
    ],
  },
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
    id: "bianco",
    domanda: "Ti sta meglio una camicia bianca ottico o una color panna?",
    aiuto: "Il bianco puro accende i tipi freddi e indurisce quelli caldi.",
    peso: 2.0,
    risposte: [
      { testo: "Panna, avorio, crema", valore: 1 },
      { testo: "Bianco ottico", valore: -1 },
      { testo: "Indifferente", valore: 0 },
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

/**
 * Dalle risposte al sottotono.
 * Ritorna null se non ha risposto a niente: in quel caso comanda la misura.
 */
export function esitoDelTest(risposte = {}) {
  let somma = 0;
  let pesoTotale = 0;

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
    certezza: Math.min(1, Math.abs(normalizzato) * (pesoTotale / 11.2)),
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

  const punteggio = dalTest * testEsito.certezza * 2.2 + dallaMisura * misuraCertezza;

  return {
    sottotono: punteggio >= 0 ? "caldo" : "freddo",
    fonte: concordi ? "test e foto d'accordo" : "test",
    concordi,
    certezza: Math.min(1, Math.abs(punteggio) / 2.8),
  };
}
