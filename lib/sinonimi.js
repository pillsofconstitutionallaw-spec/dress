// Le parole con cui la stessa cosa si chiama in modi diversi.
//
// Metà dei negozi in catalogo scrive in inglese, e chi cerca scrive in
// italiano. Contato sul catalogo vero:
//
//   stivali   39   ·  boots    542
//   maglione  47   ·  sweater  797
//   cappotto 135   ·  coat     521
//   baggy    128   ·  loose+wide+relaxed+oversize ≈ 2.100
//
// Cioè: chi scriveva "stivali" vedeva un capo su quattordici di quelli che
// gli sarebbero andati bene, e non poteva accorgersene — la pagina non dice
// mai "quello che non ti sto mostrando".
//
// Sono REGOLE, non parole, perché il confronto per pezzi di parola sbaglia
// dove conta: "shirt" sta dentro "t-shirt", "sweatshirt" e "overshirt", e chi
// cerca una camicia non cerca una maglietta. Il confine di parola e qualche
// eccezione scritta a mano risolvono, e restano leggibili.

const FAMIGLIE = [
  // ── come veste ────────────────────────────────────────────────────
  ["baggy", "loose", "wide[ -]?leg", "relaxed", "oversized?", "ampi[oa]", "slouchy", "largh[oi]", "palazzo"],
  ["slim", "skinny", "aderente", "attillat[oa]", "fitted", "tapered"],
  ["cropped?", "corta", "accorciat[oa]"],
  ["lung[oa]", "maxi", "longline"],

  // ── che capo è ────────────────────────────────────────────────────
  ["jeans", "denim"],
  // "shirt" no quando è t-shirt, sweatshirt, overshirt: quelle non sono
  // camicie, e chi cerca una camicia non le vuole.
  ["camici[ae]", "(?<![a-z-])shirt"],
  ["magliett[ae]", "t[ -]?shirt", "tee(?![a-z])"],
  ["maglion[ei]", "sweater", "pullover", "jumper", "knit"],
  ["felp[ae]", "hoodie", "sweatshirt", "felpat[oa]"],
  ["pantalon[ei]", "trousers", "(?<![a-z])pants"],
  ["gonn[ae]", "skirt"],
  ["abit[oi]", "dress(?!ing)", "vestit[oi]"],
  ["giacc[ah]e?", "jacket", "blazer"],
  ["cappott[oi]", "coat", "soprabito"],
  ["piumin[oi]", "puffer", "down jacket"],
  ["scarp[ae]", "shoes", "sneakers?"],
  ["stival[ei]", "boots?", "stivalett[oi]"],
  ["borsa", "borse", "bag(?!gy)", "handbag"],
  ["cintur[ae]", "belt"],
  ["sciarp[ae]", "scarf", "scarves"],
  ["cappell[oi]", "hat", "cap(?![a-z])", "beanie"],
  ["costume", "swim", "bikini"],
  ["intimo", "underwear", "boxer", "slip"],
  ["calz[ae]", "calzin[oi]", "socks?"],
];

// Una parola scritta da chi cerca diventa una regola che la riconosce anche
// scritta al plurale o con l'accento in un altro posto.
const daSola = (parola) => new RegExp(`\\b${parola.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\w*`, "i");

const regola = (fonte) => new RegExp(`(?:^|[^a-zà-ù])(?:${fonte})`, "i");

/**
 * Le regole con cui riconoscere quello che è stato chiesto.
 *
 * Ogni parola porta con sé la propria famiglia, se ne ha una. Le famiglie
 * valgono quanto la parola scritta: chi cerca "stivali" i boots li vuole
 * davvero, non li vuole un po' meno.
 */
export function regoleDa(testo) {
  const parole = String(testo || "")
    .toLowerCase()
    .split(/[^a-zà-ù0-9]+/i)
    .filter((p) => p.length > 2);

  return parole.map((parola) => {
    const famiglia = FAMIGLIE.find((f) => f.some((voce) => regola(voce).test(` ${parola}`)));
    return famiglia ? famiglia.map(regola) : [daSola(parola)];
  });
}

/**
 * Le stesse parole in chiaro, per la scrematura nel database.
 *
 * Là il confronto è per pezzo di parola e non sa fare eccezioni: va bene,
 * perché serve solo a non leggere tutto il catalogo — la precisione la mette
 * dopo chi legge le regole qui sopra. Ma le parole devono comunque esistere:
 * togliendo le parentesi quadre alla cieca da `stival[ei]` usciva "stivalei",
 * che non compare in nessun titolo di questo mondo, e la famiglia si
 * riduceva alla sola parola scritta.
 */
function parolaCercabile(fonte) {
  return (
    fonte
      // via le condizioni: "(?<![a-z-])shirt" è, per il database, "shirt"
      .replace(/\(\?[^)]*\)/g, "")
      // via la lettera facoltativa: "boots?" cerca "boot", che prende tutti e due
      .replace(/(\w)\?/g, "")
      // le alternative fra parentesi quadre spezzano la parola: si tiene
      // quello che viene prima, che è il pezzo comune a tutte
      .split(/[[\]{}()|^$*+?.\\ -]/)
      .filter((p) => p.length > 2)
  );
}

/**
 * Quante parole al massimo. Non è un numero tondo scelto a occhio: è dove
 * finisce il tempo che il database concede a una query.
 *
 * Ogni parola viene confrontata con cinque campi di ogni riga, e uno di
 * quelli è la descrizione, lunga seicento caratteri. Misurato sul catalogo
 * vero, con una palette e sessantatremila capi:
 *
 *    2 parole  1763 ms       6 parole  2875 ms
 *    4 parole  2075 ms       8 parole  TIMEOUT
 *
 * "cardigan oversize" ne generava undici, e la ricerca moriva. Le parole
 * scritte da chi cerca restano tutte: si tagliano i sinonimi, e si tagliano
 * dal fondo, dove stanno quelli delle famiglie nominate per ultime.
 *
 * Il taglio vale SOLO per la scrematura nel database. Il punteggio, che
 * gira qui e costa niente, continua a vedere tutta la famiglia: un capo
 * scremato dentro viene giudicato con tutte le parole.
 */
const MASSIMO_PAROLE = 5;

/**
 * Le parole che si possono mandare al database, e non una di più.
 *
 * Ogni parola viene confrontata con cinque campi di ogni riga, e uno è la
 * descrizione, lunga seicento caratteri: il costo è tutto lì, e cresce con le
 * parole invece che con i colori. Misurato sul catalogo vero: due parole
 * 1763 ms, sei 2875, otto oltre il limite di tre secondi.
 *
 * Vale SOLO per il database. Chi filtra righe già scaricate le usa tutte,
 * perché in memoria non costano niente.
 */
export const perIlDatabase = (parole) => (parole || []).slice(0, MASSIMO_PAROLE);

export function paroleEspanse(testo, massimo = MASSIMO_PAROLE) {
  const parole = String(testo || "")
    .toLowerCase()
    .split(/[^a-zà-ù0-9]+/i)
    .filter((p) => p.length > 2);

  // Prima quelle scritte davvero: sono la richiesta, i sinonimi sono un aiuto.
  const fuori = new Set(parole);
  for (const parola of parole) {
    const famiglia = FAMIGLIE.find((f) => f.some((voce) => regola(voce).test(` ${parola}`)));
    for (const voce of famiglia || []) {
      for (const p of parolaCercabile(voce)) {
        if (fuori.size >= massimo) return [...fuori];
        fuori.add(p);
      }
    }
  }
  return [...fuori];
}
