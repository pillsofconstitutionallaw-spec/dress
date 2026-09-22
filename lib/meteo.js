// Il tempo che fa davvero, al posto del calendario.
//
// Finora l'app diceva «autunno» e proponeva un cappotto. Ma a Napoli il 15
// novembre ci sono venti gradi o nove, e non è lo stesso cappotto. Il
// calendario è un'approssimazione grossolana di quello che una persona sente
// uscendo di casa — e la temperatura vera è gratis.
//
// I dati vengono da MET Norway, l'istituto meteorologico norvegese, che li dà
// senza chiave e senza vietarne l'uso commerciale. Open-Meteo, che era la
// scelta ovvia, nelle sue condizioni dice il contrario: «you may only use the
// free API services for non-commercial purposes». Dress rimanda ai negozi, e
// appoggiarla su un servizio che non si può usare è un debito che scade in
// un momento che non scegliamo noi.

// Le soglie non sono opinioni sul clima: sono su cosa ci si mette.
//
//   sotto 7°   serve qualcosa di serio addosso        → inverno
//   7–15°      serve un capospalla                    → autunno
//   15–23°     basta uno strato leggero               → primavera
//   sopra 23°  il capospalla è un peso                → estate
//
// Sono i confini in cui una persona cambia quello che indossa, non quelli in
// cui cambia la stagione sul calendario.
const SOGLIE = [
  { fino: 7, periodo: "inverno" },
  { fino: 15, periodo: "autunno" },
  { fino: 23, periodo: "primavera" },
  { fino: Infinity, periodo: "estate" },
];

// Fuori da questi la misura non è una misura: è un guasto del servizio, e un
// guasto del servizio non deve diventare un consiglio di abbigliamento.
const PIU_FREDDO = -60;
const PIU_CALDO = 60;

/**
 * Il termometro c'è, ed è un numero?
 *
 * Number(null) fa zero, e Number("") pure. Senza questo controllo «non so che
 * tempo fa» diventava «fa zero gradi», cioè inverno: il consiglio più
 * sbagliato possibile, dato con la massima sicurezza, nel caso in cui non
 * sappiamo niente. Trovato da una prova, non in produzione.
 */
function gradiVeri(x) {
  if (x === null || x === undefined || x === "") return null;
  const g = Number(x);
  if (!Number.isFinite(g) || g < PIU_FREDDO || g > PIU_CALDO) return null;
  return g;
}

/** Che periodo è, secondo il termometro. Null se il termometro non c'è. */
export function periodoDaGradi(gradi) {
  const g = gradiVeri(gradi);
  if (g === null) return null;
  return SOGLIE.find((s) => g < s.fino).periodo;
}

// Sopra questa probabilità la pioggia cambia quello che uno si mette: le
// scarpe, il cappotto, l'ombrello. Sotto, è rumore.
const PIOGGIA_CHE_CONTA = 40;

/**
 * Una riga sola, che dica la cosa per cui vale la pena cambiare idea.
 *
 * Non il bollettino: i gradi e, se c'è, la pioggia. Tutto il resto — umidità,
 * pressione, direzione del vento — è roba che nessuno usa per scegliere una
 * camicia, e allungare la frase la fa smettere di leggere.
 *
 * Se non si sa niente non si dice niente: una riga inventata sul tempo è
 * peggio di nessuna riga, perché la gente ci esce di casa.
 */
export function consiglioMeteo(dati) {
  const g = gradiVeri(dati?.gradi);
  if (g === null) return null;

  const gradi = `${Math.round(g)}°`;
  const pioggia = Number(dati?.probabilitaPioggia);
  const bagnato = Number.isFinite(pioggia) && pioggia >= PIOGGIA_CHE_CONTA;

  if (bagnato) return `Fuori ci sono ${gradi} e può piovere: meglio qualcosa che non si rovina.`;
  if (g < 7) return `Fuori ci sono ${gradi}: serve qualcosa di serio addosso.`;
  if (g < 15) return `Fuori ci sono ${gradi}: ci vuole un capospalla.`;
  if (g < 23) return `Fuori ci sono ${gradi}: basta uno strato leggero.`;
  return `Fuori ci sono ${gradi}: il capospalla è un peso.`;
}

// I codici di MET Norway che vogliono dire «viene giù qualcosa». Il nome del
// simbolo contiene la parola, quindi non serve un elenco di numeri che
// invecchia: «lightrain», «heavysnowshowers_day», «sleet».
const BAGNATO = /(rain|snow|sleet|showers)/i;

/** Dalla risposta di MET Norway ai due numeri che ci interessano. */
export function leggiMetNorway(risposta) {
  const ore = risposta?.properties?.timeseries;
  if (!Array.isArray(ore) || !ore.length) return null;

  const adesso = ore[0];
  const gradi = Number(adesso?.data?.instant?.details?.air_temperature);
  if (!Number.isFinite(gradi)) return null;

  // La probabilità di pioggia MET non la dà sempre. Quando manca, si guarda
  // il simbolo delle prossime sei ore: è meno preciso di una percentuale, ma
  // è una risposta vera invece di un silenzio.
  const prossime = adesso?.data?.next_6_hours || adesso?.data?.next_1_hours || {};
  const dichiarata = Number(prossime?.details?.probability_of_precipitation);
  const simbolo = String(prossime?.summary?.symbol_code || "");
  const probabilitaPioggia = Number.isFinite(dichiarata)
    ? dichiarata
    : BAGNATO.test(simbolo)
      ? 60
      : 0;

  return { gradi: Math.round(gradi * 10) / 10, probabilitaPioggia, simbolo: simbolo || null };
}
