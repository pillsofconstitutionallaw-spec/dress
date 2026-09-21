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
    foto: testo(c.foto, 500),
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
export function coloreDominante(pixel, lato) {
  if (!pixel || !Number.isFinite(lato) || lato < 3) return null;
  const righe = Math.floor(pixel.length / 4 / lato);
  if (righe < 3) return null;

  const daX = Math.floor(lato / 3);
  const aX = Math.ceil((lato * 2) / 3);
  const daY = Math.floor(righe / 3);
  const aY = Math.ceil((righe * 2) / 3);

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
