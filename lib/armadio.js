// L'armadio: i capi che uno possiede già.
//
// Fino a ieri Dress sapeva solo cosa si può comprare. Un armadio serve a
// sapere cosa si ha, e la differenza si sente la mattina: «cosa mi metto» è
// una domanda su quello che è appeso in camera, non sul catalogo.
//
// Questo file è il controllo all'ingresso, e conta più del solito perché
// quello che entra qui ci resta per anni. Un ruolo sbagliato non si vede
// subito: si vede fra sei mesi, quando i completi cominciano a uscire storti
// e nessuno si ricorda più da dove viene quel capo.
//
// La regola è la stessa del resto dell'app: quello che arriva da un modello
// si verifica, quello che non si può verificare diventa «non lo so». Meglio
// un capo senza colore che un capo con un colore inventato — il primo si
// esclude dai conti, il secondo li sporca in silenzio.

import { RUOLI, ruoloDelCapo } from "@/lib/periodiAnno";

const RUOLI_VERI = new Set(Object.keys(RUOLI));

const MAX_TITOLO = 120;
const MAX_NOTE = 500;

function testo(x, massimo) {
  const t = String(x ?? "").trim().replace(/\s+/g, " ");
  if (!t) return null;
  return t.length > massimo ? t.slice(0, massimo).trim() : t;
}

/** Un numero, se è davvero un numero e sta dove deve stare. */
function numeroFra(x, min, max) {
  const n = Number(x);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

const MAX_FOTO = 500;

function indirizzoFoto(x) {
  const t = String(x ?? "").trim();
  if (!t || t.length > MAX_FOTO) return null;
  return t;
}

function esadecimale(x) {
  const t = String(x ?? "").trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(t) ? t : null;
}

/**
 * Cosa può entrare nell'armadio, e in che forma.
 *
 * Torna null per i capi che non hanno senso — cioè quelli senza titolo. Un
 * capo di cui non si sa il nome è una foto, e le foto senza nome dentro un
 * armadio non si ritrovano più.
 */
export function normalizzaCapo(grezzo) {
  const c = grezzo && typeof grezzo === "object" ? grezzo : {};

  const titolo = testo(c.titolo, MAX_TITOLO);
  if (!titolo) return null;

  // Il ruolo: prima quello scelto a mano, poi quello dedotto dal titolo.
  //
  // Chi ha il capo in mano ne sa più del modello che guarda una foto, quindi
  // se lo dice lui vince lui. Ma solo se è un ruolo che esiste davvero:
  // «cappello magico» non è una correzione, è un'invenzione, e si torna a
  // quello che dice il titolo.
  const scelto = String(c.ruolo ?? "").trim().toLowerCase();
  const ruolo = RUOLI_VERI.has(scelto) ? scelto : ruoloDelCapo(titolo) || null;

  return {
    titolo,
    ruolo,
    categoria: testo(c.categoria, 60),
    note: testo(c.note, MAX_NOTE),
    // I limiti sono quelli veri dello spazio CIELAB, non numeri a caso:
    // L sta fra 0 e 100, a e b fra -128 e 127. Fuori di lì non è un colore
    // impreciso, è un valore che non viene da una misura.
    colore_hex: esadecimale(c.colore_hex),
    colore_l: numeroFra(c.colore_l, 0, 100),
    colore_a: numeroFra(c.colore_a, -128, 127),
    colore_b: numeroFra(c.colore_b, -128, 127),
    colore_nome: testo(c.colore_nome, 40),
    // La foto non si accorcia: si tiene o si butta.
    //
    // Tagliare un titolo lo rende più corto e si legge lo stesso; tagliare un
    // indirizzo lo rende sbagliato, e porta a un'immagine che non esiste. Chi
    // guarda vede un riquadro vuoto e non c'è modo di capire perché.
    foto: indirizzoFoto(c.foto),
  };
}

/** I ruoli, con l'etichetta che si mostra a chi guarda. */
export const RUOLI_ARMADIO = Object.entries(RUOLI).map(([chiave, r]) => ({
  chiave,
  etichetta: r.etichetta || chiave,
}));

/**
 * Il colore del capo, dal centro della foto.
 *
 * Una foto di un vestito è quasi sempre il vestito al centro e il muro
 * intorno. Fare la media di tutto vuol dire misurare il muro — è lo stesso
 * errore che il catalogo ha già pagato una volta, quando su gemelli, cravatte
 * e occhiali usciva il bianco della carta perché la foto era quasi tutta
 * fondale: 8.394 capi su 33.533.
 *
 * Qui si guarda solo il riquadro centrale, un terzo per lato. Non è raffinato
 * come lo scontorno vero, ma non sbaglia nella direzione che conta: fra
 * prendere un pezzo di capo e prendere il muro, prende il capo.
 *
 * @param pixel  i dati RGBA di un canvas
 * @param lato   quanti pixel per riga
 */
export function coloreDominante(pixel, lato, { scontornato = false } = {}) {
  if (!pixel || !Number.isFinite(lato) || lato < 3) return null;
  const righe = Math.floor(pixel.length / 4 / lato);
  if (righe < 3) return null;

  // Su una foto già scontornata il riquadro centrale non serve più, e anzi
  // fa danno: i pixel rimasti SONO il capo — tutti, e solo quelli. Guardare
  // solo il centro di una gonna a ruota vuol dire misurare il buco.
  const daX = scontornato ? 0 : Math.floor(lato / 3);
  const aX = scontornato ? lato : Math.ceil((lato * 2) / 3);
  const daY = scontornato ? 0 : Math.floor(righe / 3);
  const aY = scontornato ? righe : Math.ceil((righe * 2) / 3);

  let r = 0, g = 0, b = 0, quanti = 0;
  for (let y = daY; y < aY; y++) {
    for (let x = daX; x < aX; x++) {
      const i = (y * lato + x) * 4;
      // I pixel trasparenti non sono colore: capitano quando la foto è già
      // stata scontornata da qualcun altro.
      if (pixel[i + 3] < 128) continue;
      r += pixel[i];
      g += pixel[i + 1];
      b += pixel[i + 2];
      quanti++;
    }
  }
  if (!quanti) return null;

  const due = (n) => Math.round(n / quanti).toString(16).padStart(2, "0");
  return `#${due(r)}${due(g)}${due(b)}`;
}

// ── Da quanto non lo metti ─────────────────────────────────────────────────
//
// È l'unica cosa onesta che un armadio possa dire a chi continua a comprare,
// e l'unica che il catalogo non può dire per definizione: il catalogo vive di
// cose nuove, l'armadio di cose che ci sono già.
//
// Ma va detta con misura. Un capo comprato la settimana scorsa e non ancora
// messo non è un rimprovero, è una settimana. Un cappotto d'inverno a luglio
// non è dimenticato, è fuori stagione. Il silenzio qui è la risposta giusta
// più spesso di quanto sembri, e un'app che commenta ogni capo diventa una
// voce in casa che nessuno ha chiesto.

const GIORNO = 24 * 60 * 60 * 1000;

// Sotto i tre mesi non si dice niente. È il tempo in cui un capo può essere
// semplicemente fuori stagione senza che nessuno se ne sia dimenticato.
const SOGLIA_GIORNI = 90;

const MESI_A_PAROLE = [
  "zero", "un", "due", "tre", "quattro", "cinque", "sei",
  "sette", "otto", "nove", "dieci", "undici", "dodici",
];

function quando(x) {
  if (!x) return null;
  const t = Date.parse(x);
  return Number.isFinite(t) ? t : null;
}

function inMesi(ms) {
  const mesi = Math.round(ms / (30 * GIORNO));
  if (mesi <= 1) return "un mese";
  if (mesi <= 12) return `${MESI_A_PAROLE[mesi]} mesi`;
  const anni = Math.floor(mesi / 12);
  return anni === 1 ? "più di un anno" : `più di ${MESI_A_PAROLE[Math.min(anni, 12)]} anni`;
}

/**
 * Quanto tempo è passato, detto in italiano. Null se non c'è niente da dire.
 *
 * Una data che non si legge non diventa «non lo metti da mai»: diventa
 * silenzio. Rimproverare qualcuno per un guasto nostro è il modo più veloce
 * di far disinstallare un'app.
 */
export function daQuantoNonLoMetti(capo, adesso = Date.now()) {
  if (!capo || typeof capo !== "object") return null;

  const ultima = quando(capo.ultima);
  const creato = quando(capo.creato);

  // Mai messo: il tempo si conta da quando è entrato nell'armadio.
  if (!ultima) {
    if (creato === null) return null;
    const da = adesso - creato;
    if (da < SOGLIA_GIORNI * GIORNO) return null;
    return `Mai messo, ed è qui da ${inMesi(da)}.`;
  }

  const da = adesso - ultima;
  if (da < SOGLIA_GIORNI * GIORNO) return null;
  return `Non lo metti da ${inMesi(da)}.`;
}

/**
 * I dimenticati per primi, gli altri come stavano.
 *
 * Non è una classifica del disordine: è che le cose da guardare stanno in
 * cima. Chi non ha niente da rimproverarsi resta nell'ordine in cui è
 * arrivato, senza essere spostato per far posto a una graduatoria.
 */
export function dimenticatiPrima(capi, adesso = Date.now()) {
  return (capi || [])
    .map((capo, posizione) => {
      const ultima = quando(capo?.ultima);
      const creato = quando(capo?.creato);
      const riferimento = ultima ?? creato;
      const fermo = riferimento === null ? 0 : adesso - riferimento;
      return { capo, posizione, fermo: fermo >= SOGLIA_GIORNI * GIORNO ? fermo : 0 };
    })
    .sort((a, b) => b.fermo - a.fermo || a.posizione - b.posizione)
    .map((x) => x.capo);
}

// ── Il completo con le cose che hai già ────────────────────────────────────
//
// Non è la prova virtuale: nessuno si vede addosso la giacca. È la domanda
// che uno si fa davanti all'armadio la mattina — «questi tre stanno insieme?»
// — a cui si può rispondere gratis, con le foto vere dei propri capi, senza
// generare niente e senza pagare nessuno.
//
// Il vincolo che conta è la palette. Un armadio pieno non dice cosa mettersi;
// un armadio filtrato sui propri colori sì. Ed è anche l'unica cosa che
// quest'app sa fare meglio di un amico: l'amico ti dice se ti sta bene, noi
// sappiamo quali colori ti stanno bene e quali no, misurati.

import { differenza, hexALab } from "@/lib/colore";
import { PERIODI } from "@/lib/periodiAnno";

// Oltre questa distanza non è «un colore vicino», è un altro colore. È la
// stessa soglia con cui il catalogo sceglie i capi da mostrare.
const ABBASTANZA_VICINO = 28;

// L'ordine in cui si guarda: prima le cose senza le quali non c'è un
// completo, poi quelle che lo completano.
const NECESSARI = ["top", "bottom"];
const GRADITI = ["capospalla", "scarpe", "accessorio"];

function labDi(capo) {
  if (Number.isFinite(capo?.colore_l)) return { L: capo.colore_l, a: capo.colore_a, b: capo.colore_b };
  return hexALab(capo?.colore_hex);
}

/** Quanto è lontano dal colore più vicino della palette. Infinity se fuori. */
function distanzaDallaPalette(capo, paletteLab) {
  const suo = labDi(capo);
  if (!suo) return Infinity;
  let minima = Infinity;
  for (const c of paletteLab) minima = Math.min(minima, differenza(c, suo));
  return minima;
}

/**
 * Un completo, scelto fra le proprie cose.
 *
 * @param capi     l'armadio
 * @param palette  i colori della persona, come li salva l'analisi
 * @param periodo  per sapere se il capospalla serve o è un peso
 *
 * Torna null quando non c'è abbastanza roba: meglio dirlo che mettere insieme
 * tre cose a caso e chiamarlo consiglio. Un armadio che risponde sempre è un
 * armadio di cui non ci si fida più dopo la seconda volta.
 */
export function completoDallArmadio(capi, palette, { periodo = null, adesso = Date.now(), evita = [] } = {}) {
  const giaVisti = new Set(evita || []);
  const paletteLab = (palette || []).map((c) => hexALab(c?.hex || c)).filter(Boolean);
  if (!paletteLab.length || !Array.isArray(capi) || !capi.length) return null;

  // I ruoli che questo periodo vuole: d'estate il capospalla non si propone,
  // ed è PERIODI a dirlo, non un elenco scritto qui che poi diverge.
  const ruoliDelPeriodo = periodo
    ? PERIODI.find((p) => (p.chiave || p.nome || "").toLowerCase() === String(periodo).toLowerCase())?.ruoli
    : null;

  const scelti = [];
  for (const ruolo of [...NECESSARI, ...GRADITI]) {
    if (ruoliDelPeriodo && !ruoliDelPeriodo.includes(ruolo)) continue;

    const candidati = capi
      .filter((c) => c?.ruolo === ruolo)
      .map((capo) => ({ capo, distanza: distanzaDallaPalette(capo, paletteLab) }))
      .filter((x) => x.distanza <= ABBASTANZA_VICINO);

    if (!candidati.length) {
      // Senza sopra o senza sotto non c'è un completo: si smette.
      if (NECESSARI.includes(ruolo)) return null;
      continue;
    }

    // Prima il colore, poi la polvere.
    //
    // A parità di vicinanza al proprio colore viene avanti quello che non si
    // mette mai: un armadio che propone sempre le stesse tre cose è inutile,
    // quelle tre uno le trova da solo. Le distanze si arrotondano a gruppi di
    // tre, altrimenti mezzo punto di differenza cromatica — che nessun occhio
    // vede — decide da solo e la polvere non conta mai.
    candidati.sort((a, b) => {
      const gruppo = Math.round(a.distanza / 3) - Math.round(b.distanza / 3);
      if (gruppo) return gruppo;
      return fermoDa(b.capo, adesso) - fermoDa(a.capo, adesso);
    });

    // «Un altro completo» deve darne davvero un altro. Ma se le alternative
    // sono finite si ricomincia da capo invece di rispondere «non ho niente»
    // a un armadio che un completo l'ha appena prodotto: sarebbe vero e
    // inutile insieme.
    const nuovi = candidati.filter((x) => !giaVisti.has(x.capo.id));
    scelti.push((nuovi.length ? nuovi : candidati)[0].capo);
  }

  return scelti.length >= NECESSARI.length ? { capi: scelti, periodo: periodo || null } : null;
}

function fermoDa(capo, adesso) {
  const t = Date.parse(capo?.ultima || capo?.creato || "");
  return Number.isFinite(t) ? adesso - t : 0;
}
