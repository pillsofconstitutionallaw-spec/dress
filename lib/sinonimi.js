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
  ["camici[ae]", "(?<![a-z-])shirt", "blus[ae]", "blouse"],
  ["magliett[ae]", "t[ -]?shirt", "tee(?![a-z])"],
  ["maglion[ei]", "sweater", "pullover", "jumper", "knit"],
  ["felp[ae]", "hoodie", "sweatshirt", "felpat[oa]"],
  ["pantalon[ei]", "trousers", "(?<![a-z])pants", "chino"],
  // «Minigonna» non la prendeva «gonna»: il confine di parola vuole che
  // prima ci sia uno spazio, e lì c'è una "i". Sedici capi, ma è il tipo di
  // buco che non si vede mai da fuori.
  ["gonn[ae]", "skirt", "minigonn[ae]"],
  ["abit[oi]", "dress(?!ing)", "vestit[oi]"],
  // «Giubbotto» e «giubbino» non avevano famiglia: chi li scriveva vedeva 177
  // capi su 3.669 che gli sarebbero andati bene, cioè uno su venti.
  ["giacc[ah]e?", "jacket", "blazer", "giubbott[oi]", "giubbin[oi]", "bomber"],
  ["cappott[oi]", "coat", "soprabito", "trench"],
  ["piumin[oi]", "puffer", "down jacket"],
  ["scarp[ae]", "shoes", "sneakers?", "mocassin[oi]", "loafers?"],
  ["stival[ei]", "boots?", "stivalett[oi]"],
  ["borsa", "borse", "bag(?!gy)", "handbag", "tracoll[ae]"],
  ["cintur[ae]", "belt"],
  ["sciarp[ae]", "scarf", "scarves"],
  ["cappell[oi]", "hat", "cap(?![a-z])", "beanie"],
  ["costume", "swim", "bikini"],
  ["intimo", "underwear", "boxer", "slip"],
  ["calz[ae]", "calzin[oi]", "socks?"],

  // ── quelle che non avevano nessuno ────────────────────────────────
  //
  // Contato quanto vedeva chi le scriveva, sul catalogo vero: «cravatta» 70
  // capi su 1.818, «canottiera» 17 su 481, «occhiali» 75 su 832, «tuta» 234
  // su 873. Un capo su venticinque, nel caso peggiore — e chi cerca non può
  // accorgersene, perché la pagina non dice mai quello che non sta
  // mostrando.
  ["occhial[ei]", "sunglasses", "eyewear"],
  ["canottier[ae]", "canott[ae]", "tank top", "singlet"],
  ["zain[oi]", "backpack", "rucksack"],
  ["tut[ae]", "tracksuit", "jogger", "sweatpants?"],

  // «Tie» in inglese è la cravatta e anche il laccio, ed è il laccio quasi
  // sempre quando ha un capo subito dopo: «tie sweatpants», «rope tie up
  // sandals», «tie back top». Presa dovunque porta 1.755 capi col 14% di
  // roba che cravatta non è; escludendo la parola che segue quando è un
  // capo, ne porta 1.643 con l'8%.
  //
  // La soglia qui è diversa da quella dei ruoli in periodiAnno.js, dove
  // «tie» vale solo se chiude il titolo: là un errore mette un sandalo fra
  // gli accessori di un completo, qui mostra una maglia in mezzo alle
  // cravatte. Non vedere il 96% delle cravatte costa molto di più.
  // «Necktie» qui non c'è: in catalogo non compare in nessun titolo, e il
  // filtro del database lo prende comunque dentro «tie». Una parola che non
  // esiste occupa uno dei cinque posti che si mandano al database — è la
  // stessa trappola di «stivalei», scritta qui sopra.
  ["cravatt[ae]", "papillon",
   "ties?(?![a-z])(?!\\s*(?:back|side|up|dye|front|waist|detail|sweatpant|short|cardigan|bikini|top|dress|skirt|neck|strap|belt|hem|sleeve))"],
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
