// Da una frase scritta a mano ai parametri che il motore conosce.
//
// «Un outfit per un colloquio», «qualcosa per un viaggio in treno», «devo
// andare a un matrimonio a giugno». A leggere la frase è un modello
// linguistico, ed è l'unica cosa che gli si chiede: capire. A scegliere i
// capi è il catalogo, come sempre.
//
// La divisione non è per prudenza, è per lo stesso motivo scritto in
// app/api/tendenze/route.js: a un modello non si chiede cosa esiste, perché
// risponde comunque e con sicurezza. Chiedergli «che stile è un colloquio» va
// benissimo; chiedergli «quale giacca comprare» no, perché le giacche le
// abbiamo noi e lui se le inventerebbe.
//
// Qui dentro c'è la dogana: quello che il modello risponde entra solo se
// corrisponde a qualcosa che esiste davvero. Uno stile che in catalogo non
// c'è non è uno stile, è una parola.

import { FAMIGLIE_STILI } from "@/lib/data";
import { PERIODI, RUOLI } from "@/lib/periodiAnno";
import { soloCifre } from "@/lib/numeri";

const STILI = FAMIGLIE_STILI.flatMap((f) => (f.stili || []).map((s) => s.nome || s));
const PERIODI_VALIDI = new Set(PERIODI.map((p) => p.id));
const GENERI = new Set(["donna", "uomo", "unisex"]);

// Tutte le parole che il motore sa riconoscere come capi: sono le stesse con
// cui assegna i ruoli, quindi un capo chiesto qui è un capo che sappiamo
// cercare. Le deboli comprese: «calzini» è una richiesta legittima.
const CAPI_NOTI = new Set(
  Object.values(RUOLI).flatMap((r) => [...(r.parole || []), ...(r.deboli || []), ...(r.inFondo || [])]),
);

const senzaAccenti = (t) =>
  String(t ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/**
 * Lo stile, anche scritto storto.
 *
 * I modelli rispondono «minimal» minuscolo, «Old money» invece di «Quiet
 * luxury / Old money», «STREETWEAR» urlato. Buttare via quelle risposte
 * vorrebbe dire buttare via la richiesta di chi ha scritto: si riconosce il
 * nome esatto, poi uno dei pezzi separati dalla barra, poi il contenimento.
 */
function stileVero(scritto) {
  const cercato = senzaAccenti(scritto);
  if (!cercato) return null;

  const esatto = STILI.find((s) => senzaAccenti(s) === cercato);
  if (esatto) return esatto;

  // «Old money» sta dentro «Quiet luxury / Old money», e vale.
  const perPezzo = STILI.find((s) =>
    senzaAccenti(s).split("/").map((p) => p.trim()).includes(cercato),
  );
  if (perPezzo) return perPezzo;

  // Ultimo tentativo, e solo se la parola è lunga abbastanza da non pescare a
  // caso: «preppy» dentro «Preppy», ma non «mod» dentro «Monocromatico».
  if (cercato.length < 5) return null;
  return STILI.find((s) => senzaAccenti(s).includes(cercato)) || null;
}

/**
 * I parametri buoni, e solo quelli.
 *
 * Quello che non si riconosce diventa «non detto», e il motore fa quello che
 * farebbe senza: un consiglio generico è meglio di uno costruito su una parola
 * inventata, perché il secondo sembra preciso e non lo è.
 */
export function normalizzaRichiesta(grezzo) {
  const r = grezzo || {};

  const periodo = senzaAccenti(r.periodo);
  const genere = senzaAccenti(r.genere);

  const capi = (Array.isArray(r.capi) ? r.capi : [])
    .map((c) => senzaAccenti(c))
    .filter((c) => CAPI_NOTI.has(c));
  const evita = (Array.isArray(r.evita) ? r.evita : [])
    .map((c) => senzaAccenti(c))
    .filter((c) => CAPI_NOTI.has(c));

  // Il budget lo scrivono come viene: «150 €», «1.000», «centocinquanta».
  // soloCifre tiene le cifre e basta — vedi lib/numeri.js, che è lì per lo
  // stesso motivo.
  //
  // Il segno meno però lo toglie insieme al resto, e «-20» diventerebbe 20:
  // un budget negativo non si raddrizza, si rifiuta. Sono i numeri che un
  // modello sbaglia più volentieri, e un limite di spesa inventato è peggio
  // di nessun limite.
  const scritto = String(r.budget ?? "").trim();
  const cifre = scritto.startsWith("-") ? "" : soloCifre(r.budget, 6);
  const budget = cifre && Number(cifre) > 0 ? Number(cifre) : null;

  const occasione = String(r.occasione ?? "").trim().slice(0, 80) || null;

  return {
    stile: stileVero(r.stile),
    periodo: PERIODI_VALIDI.has(periodo) ? periodo : null,
    genere: GENERI.has(genere) ? genere : null,
    capi,
    evita,
    budget,
    occasione,
  };
}

// Serve alle prove e al prompt: l'elenco dei nomi che il modello può usare.
export const STILI_POSSIBILI = STILI;
