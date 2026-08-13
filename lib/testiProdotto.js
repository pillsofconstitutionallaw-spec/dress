// I nomi dei capi li scrivono i negozi, non noi.
//
// Nei cataloghi capita di trovare "modellante", "snellente", "contenitivo":
// parole che non useremmo mai, ma che non possiamo nemmeno riscrivere, perché
// sono il nome con cui quel capo esiste ed è in vendita. La scelta è dirlo
// apertamente: il nome è del marchio, il commento non è nostro.

const PAROLE_DEL_MARCHIO = [
  "snellent", "modellant", "contenitiv", "riducent", "push[- ]?up", "shaping",
  "slim.?fit", "dimagrant", "ventre piatto", "effetto pancia", "correttiv",
  "sculpt", "body ?shaper", "guaina",
];

const REGEX = new RegExp(`\\b(${PAROLE_DEL_MARCHIO.join("|")})`, "i");

/** Il titolo contiene parole sul corpo scelte dal negozio? */
export function nomeDelMarchio(testo) {
  return REGEX.test(String(testo || ""));
}

export const AVVISO_NOME_MARCHIO =
  "Il nome di questo capo è quello scelto dal marchio. Noi non descriviamo i corpi: lo riportiamo com’è per farti trovare il prodotto.";
