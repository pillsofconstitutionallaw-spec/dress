// Gli smalti che stanno bene a chi guarda.
//
// La richiesta era «le tendenze mensili di come farsi le unghie». Le tendenze
// non si possono fare oneste: non esiste una fonte gratuita e legittima che
// le misuri, e chiederle a un modello linguistico è esattamente l'errore che
// quest'app si rifiuta di fare per i tagli — un modello risponde comunque,
// con sicurezza, sbagliando, e la sua conoscenza si ferma alla data di
// addestramento. Cercato: Wikipedia dà 4 visite al mese su «Manicure» in
// italiano, che è rumore; Commons ha le foto ma non le date della moda.
//
// Quello che si può fare è più utile, e soprattutto è vero: quali smalti
// stanno bene a QUESTA persona, scelti sul sottotono misurato sul suo viso
// durante l'analisi. Su una pelle con fondo dorato un rosso bluastro spegne
// le mani; su una con fondo rosato un corallo le ingiallisce. Non è
// un'opinione di stagione, è come si comportano due colori vicini.
//
// E a differenza di una tendenza, questo consiglio vale anche il mese dopo.

import { tonoPelle } from "@/lib/pelle";

// Sotto questo indizio la pelle ha fondo rosato, sopra ha fondo dorato. Lo
// zero non esiste in natura: le olivastre stanno vicine allo zero e prendono
// bene da tutte e due le parti, ed è per questo che la soglia è larga.
const FREDDA = -0.5;
const CALDA = 0.5;

const CALDI = [
  { nome: "Corallo", hex: "#e4674f",
    perche: "Ha dentro l'arancio che la tua pelle ha già: le mani si accendono invece di staccarsi." },
  { nome: "Mattone", hex: "#9c4430",
    perche: "Un rosso che tira al terracotta. Sulle pelli dorate regge anche d'inverno, quando i rossi freddi diventano duri." },
  { nome: "Rame", hex: "#a75f36",
    perche: "Metallico e caldo: è il colore che la tua pelle prende al sole, portato sulle unghie." },
  { nome: "Bronzo scuro", hex: "#5c3c22",
    perche: "Lo scuro che non spegne: al posto del nero, che su una pelle calda taglia netto." },
];

const FREDDI = [
  { nome: "Ciliegia", hex: "#a51b3c",
    perche: "Un rosso con dentro il blu, non l'arancio: è quello che sulle pelli rosate resta rosso invece di virare al ruggine." },
  { nome: "Prugna", hex: "#5d2a4a",
    perche: "Scuro e freddo. Fa lo stesso lavoro del nero senza indurire le mani chiare." },
  { nome: "Lampone", hex: "#b03a63",
    perche: "Il rosa che non diventa mai caramella: ha abbastanza blu per stare sulla tua pelle." },
  { nome: "Malva", hex: "#8d7396",
    perche: "Un tono spento e freddo, per i giorni in cui un rosso è troppo." },
];

// Le olivastre — la maggior parte delle pelli del Mediterraneo — stanno in
// mezzo e reggono le due famiglie. Meglio dare il meglio delle due che
// costringerle in una.
const NEUTRI = [
  { nome: "Rubino", hex: "#8e1f38",
    perche: "Sta in mezzo: abbastanza profondo da non virare né al mattone né al fucsia." },
  { nome: "Cioccolato", hex: "#4a3128",
    perche: "Lo scuro dei toni oliva: il nero fa ombra, questo fa profondità." },
];

/**
 * Il nudo giusto non è un colore: è il tuo colore, un po' più su.
 *
 * Un «nude» comprato a caso è il modo più facile di sbagliare — quello che
 * allunga le mani di una è quello che fa sembrare malata un'altra, perché il
 * nudo funziona quando è appena più chiaro della pelle, non quando è chiaro.
 */
function nudoPer(tono) {
  const hex = tono.hex;
  const n = parseInt(hex.slice(1), 16);
  const su = (x) => Math.min(255, Math.round(x + (255 - x) * 0.22));
  const r = su((n >> 16) & 255), g = su((n >> 8) & 255), b = su(n & 255);
  return {
    nome: "Nudo, il tuo",
    hex: `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`,
    perche: "Non un nudo qualsiasi: il tuo incarnato schiarito di poco. È così che allunga le mani invece di sbiancarle.",
  };
}

/**
 * Gli smalti per questa persona.
 *
 * @param tono     l'id del tono di pelle misurato dall'analisi
 * @param palette  i suoi colori, se ce li ha
 *
 * Senza il tono non torna niente: un consiglio di colore tirato a indovinare
 * vale meno di nessun consiglio, e questa è una schermata dove il primo
 * errore si vede sulle mani di qualcuno.
 */
export function smaltiPer(dati) {
  const tono = tonoPelle(dati?.tono);
  if (!tono) return [];

  const indizio = tono.indizio ?? 0;
  const famiglia = indizio <= FREDDA ? FREDDI : indizio >= CALDA ? CALDI : [...NEUTRI, ...FREDDI.slice(0, 1), ...CALDI.slice(0, 1)];

  // I propri colori valgono anche sulle unghie: chi ha il blu ottanio in
  // palette può portarlo sulle mani, e sarà lo stesso blu del maglione.
  const dallaPalette = (dati?.palette || [])
    .filter((c) => c?.hex)
    .slice(0, 3)
    .map((c) => ({
      nome: c.nome || "Dalla tua palette",
      hex: String(c.hex).toLowerCase(),
      perche: "È uno dei tuoi colori: sulle unghie fa lo stesso lavoro che fa addosso.",
      daPalette: true,
    }));

  return [nudoPer(tono), ...famiglia, ...dallaPalette];
}

// ── Le foto ───────────────────────────────────────────────────────────────
//
// Vengono da Wikimedia Commons, che è l'unico posto dove si trovano foto di
// manicure con una licenza che si può davvero usare, senza chiedere una
// chiave a nessuno. In cambio arriva di tutto: cercando «nail» escono libri
// scansionati, cataloghi del 1912, riviste e PDF di commissioni parlamentari.
// Misurato: su diciotto risultati, quattro erano foto di unghie.

// L'estensione si guarda sul nome del file, non sull'indirizzo: Commons
// appende dei parametri dopo il nome — «...500px-a.jpg?lang=it&utm_campaign=
// imageinfo» — quindi l'indirizzo non finisce mai per «.jpg». Guardando lì
// non passava nessuna foto, e nessuna prova se ne accorgeva perché nelle
// prove gli indirizzi li avevo scritti puliti io.
const ESTENSIONI_BUONE = /\.(jpe?g|png)$/i;
// Il titolo deve nominare le unghie.
//
// È una regola sola al posto di una lista nera che non finisce mai. Il primo
// filtro vietava «(IA ...)», «magazine», «catalogue» — e in produzione
// passavano lo stesso un manifesto di guerra, una réclame vittoriana e una
// rivista del 1948, perché su Commons la ricerca per parole pesca anche le
// pagine che citano «nail» da qualche parte nel testo scansionato.
//
// Pretendere che il nome del file dica di cosa è la foto le esclude tutte, e
// continuerà a escludere quelle che non abbiamo ancora visto.
const PARLA_DI_UNGHIE = /nail|manicur|unghi|polish/i;

/** Delle immagini trovate, quelle che sono davvero fotografie usabili. */
export function soloFoto(immagini) {
  return (immagini || []).filter((f) => {
    if (!f?.url || !ESTENSIONI_BUONE.test(f.title || "")) return false;
    if (!PARLA_DI_UNGHIE.test(f.title || "")) return false;
    // Senza licenza leggibile non si pubblica: la licenza è la ragione per
    // cui possiamo mostrarla, e se non si sa qual è non si sa se si può.
    if (!f.licenza) return false;
    return true;
  });
}
