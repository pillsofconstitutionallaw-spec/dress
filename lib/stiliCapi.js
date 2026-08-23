import { FAMIGLIE_STILI, SPIEGAZIONI_STILI } from "@/lib/data";

// A quale famiglia appartiene ogni stile.
const FAMIGLIA_DI = {};
for (const f of FAMIGLIE_STILI) for (const s of f.stili) FAMIGLIA_DI[s] = f.famiglia;

// Da uno stile alle parole con cui si cercano i suoi capi.
//
// Il catalogo non ha un campo "stile": i negozi non lo scrivono, e se lo
// scrivessero userebbero ognuno il suo. Ma la spiegazione di ogni stile
// elenca già i capi che lo compongono — "tweed, maglioni a trecce, cappotti" —
// e quelle parole nei titoli dei prodotti ci sono davvero.
//
// È il motivo per cui le spiegazioni sono scritte nominando gli oggetti
// invece di evocare atmosfere: servono a chi legge e servono a cercare.

// Parole che nella spiegazione fanno atmosfera ma nei titoli non compaiono mai.
const DA_SCARTARE = new Set([
  "il", "lo", "la", "i", "gli", "le", "un", "uno", "una", "di", "da", "del",
  "della", "dei", "delle", "in", "con", "su", "per", "tra", "fra", "e", "o",
  "ma", "che", "come", "senza", "sopra", "sotto", "dentro", "fuori", "non",
  "più", "meno", "molto", "poco", "tutto", "niente", "cosa", "cose", "roba",
  "stile", "look", "aria", "sembra", "porta", "portato", "portata", "nato",
  "anni", "novanta", "città", "casa", "sera", "giorno", "quotidiano", "volta",
  "modo", "parte", "vero", "vera", "veri", "vere", "essere", "fatto", "fatta",
  "fatti", "fatte", "scelto", "scelte", "prima", "dopo", "ogni", "qualche",
  "questo", "questa", "quello", "quella", "suo", "sua", "loro", "poi", "già",
  "solo", "anche", "ancora", "sempre", "mai", "bene", "meglio", "male",
  "americano", "americana", "inglese", "italiano", "italiana", "francese",
  "quasi", "invece", "oppure", "insieme", "dalla", "dallo", "dal", "nel",
  "nella", "sulla", "sullo", "alla", "allo", "agli", "alle", "una", "due",
  "tre", "opposto", "esatto", "propria", "proprio", "chi", "chiede", "regge",

  // Pezzi di nomi di stile che nei titoli dei prodotti significano altro:
  // "dark" in un catalogo inglese vuol dire solo "scuro", e tirerebbe dentro
  // mezzo negozio. Il nome dello stile serve solo quando è anche un capo.
  "dark", "light", "clean", "girl", "boy", "core", "wear", "style", "chic",
  "luxury", "money", "casual", "formal", "business", "academia", "grandmother",
  "siren", "office", "wife", "coastal", "smart", "personale", "divisa",
  "blocking", "colour", "dressing", "power", "inspired", "sleaze", "indie",
]);

// Qualche stile ha parole chiave che la sua descrizione non contiene:
// qui si aggiungono a mano, senza riscrivere la descrizione.
const AGGIUNTE = {
  "Streetwear": ["felpa", "hoodie", "sneaker", "cappellino"],
  "Athleisure / Sportivo": ["legging", "tuta", "felpa", "sneaker"],
  "Business / Formale": ["giacca", "camicia", "pantalone", "cravatta"],
  "Smart casual": ["blazer", "camicia", "chino", "mocassino"],
  "Minimal": ["maglia", "camicia", "pantalone", "cappotto"],
  "Glam / Serata": ["abito", "paillettes", "raso", "tacco"],
  "Cerimonia": ["abito", "tailleur", "giacca"],
  "Bon ton / Borghese": ["gonna", "cardigan", "abito"],
  "Coastal / Riviera": ["lino", "camicia", "sandalo"],
  "Denim su denim": ["denim", "jeans", "giacca"],
  "Maglieria": ["maglia", "maglione", "cardigan", "pullover"],
  "Pelle": ["pelle", "leather", "chiodo"],
  "Oversize": ["oversize", "over"],
  "Total black": ["nero", "black"],
};

const cache = new Map();

/**
 * Le parole con cui cercare i capi di uno stile.
 * Vengono dalla sua descrizione, più le aggiunte specifiche.
 */
export function paroleDelloStile(nome) {
  if (!nome) return [];
  if (cache.has(nome)) return cache.get(nome);

  const testo = SPIEGAZIONI_STILI[nome] || "";
  const dalTesto = testo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s']/g, " ")
    .split(/\s+/)
    .map((p) => p.replace(/^'|'$/g, ""))
    .filter((p) => p.length >= 4 && !DA_SCARTARE.has(p));

  // Anche il nome dello stile è una parola cercabile: molti negozi scrivono
  // "cargo", "chino", "bomber" nel titolo.
  const dalNome = nome
    .toLowerCase()
    .split(/[\s/]+/)
    .filter((p) => p.length >= 4 && !DA_SCARTARE.has(p));

  const parole = [...new Set([...dalNome, ...dalTesto, ...(AGGIUNTE[nome] || [])])].slice(0, 14);
  cache.set(nome, parole);
  return parole;
}

// ── scarpe e accessori ────────────────────────────────────────────────
//
// Le parole qui sopra vengono dalla descrizione dello stile, e le descrizioni
// parlano di VESTITI: "tweed", "maglione a trecce", "lino". Nei titoli delle
// scarpe non compaiono mai. Filtrando tutto il catalogo con quelle, un
// completo Romantico restava scalzo — per questo scarpe e accessori erano
// stati lasciati fuori dal filtro, e si sceglievano solo per colore.
//
// Ma "solo per colore" vuol dire che lo Streetwear riceveva le décolleté e il
// Balletcore le sneakers da running, e la stessa sciarpa bordeaux finiva in
// tutti i completi di tutti gli stili. Un filtro sbagliato è meglio toglierlo;
// il vocabolario giusto è meglio scriverlo.
//
// Sta per FAMIGLIA, non per stile: gli stili sono centoventotto, le famiglie
// dodici, e dentro una famiglia le scarpe si somigliano davvero. Gli stili che
// fanno eccezione — il Western ha i suoi stivali, il Balletcore le sue
// ballerine — stanno nelle eccezioni più sotto.
const PER_FAMIGLIA = {
  "Senza tempo": {
    scarpe: ["mocassino", "loafer", "loafer", "derby", "oxford", "stringata", "lace up", "ballerina", "ballet", "flats", "décolleté", "decollete", "pump", "heel", "stivaletto", "ankle boot"],
    accessori: ["cintura", "belt", "sciarpa", "scarf", "foulard", "borsa", "bag", "occhiali", "sunglasses", "cravatta", "tie", "guanti", "gloves"],
  },
  "Tutti i giorni": {
    scarpe: ["sneaker", "mocassino", "loafer", "derby", "stivaletto", "ankle boot", "ballerina", "ballet", "flats", "slip on"],
    accessori: ["zaino", "backpack", "borsa", "bag", "cintura", "belt", "tracolla", "sciarpa", "scarf", "occhiali", "sunglasses"],
  },
  "Urbani e street": {
    scarpe: ["sneaker", "anfibio", "combat", "boot", "running", "chunky", "high top", "skate"],
    accessori: ["cappellino", "cap", "berretto", "zaino", "backpack", "marsupio", "calzino", "occhiali", "sunglasses"],
  },
  "Romantici": {
    scarpe: ["ballerina", "ballet", "flats", "sandalo", "sandal", "mary jane", "décolleté", "decollete", "pump", "heel", "stivaletto", "ankle boot"],
    accessori: ["foulard", "fiocco", "sciarpa", "scarf", "borsa", "bag", "cerchietto", "guanti", "gloves"],
  },
  "Alternativi": {
    scarpe: ["anfibio", "combat", "platform", "stivale", "boot", "creeper", "boot", "chunky"],
    accessori: ["borchie", "catena", "choker", "cintura", "belt", "guanti", "gloves", "zaino", "backpack"],
  },
  "Retrò": {
    scarpe: ["mocassino", "loafer", "stivale", "boot", "platform", "mary jane", "décolleté", "decollete", "pump", "heel", "sneaker"],
    accessori: ["foulard", "occhiali", "sunglasses", "cintura", "belt", "borsa", "bag", "cappello", "hat"],
  },
  "Di tendenza": {
    scarpe: ["sneaker", "mocassino", "loafer", "stivale", "boot", "décolleté", "decollete", "pump", "heel", "sandalo", "sandal", "chunky"],
    accessori: ["borsa", "bag", "occhiali", "sunglasses", "cintura", "belt", "sciarpa", "scarf", "cappellino", "cap"],
  },
  "Luoghi e atmosfere": {
    scarpe: ["sandalo", "sandal", "espadrillas", "mocassino", "loafer", "stivale", "boot", "sneaker", "infradito"],
    accessori: ["cappello", "hat", "paglia", "foulard", "borsa", "bag", "occhiali", "sunglasses"],
  },
  "Occasioni": {
    scarpe: ["décolleté", "decollete", "pump", "heel", "sandalo", "sandal", "stringata", "lace up", "mocassino", "loafer", "oxford"],
    accessori: ["pochette", "clutch", "cravatta", "tie", "papillon", "borsa", "bag", "gemelli"],
  },
  "Con un'idea dietro": {
    scarpe: ["sneaker", "mocassino", "loafer", "stivaletto", "ankle boot", "derby", "ballerina", "ballet", "flats"],
    accessori: ["borsa", "bag", "zaino", "backpack", "sciarpa", "scarf", "cintura", "belt"],
  },
  "Materiali e forme": {
    scarpe: ["mocassino", "loafer", "stivale", "boot", "sneaker", "sandalo", "sandal", "stivaletto", "ankle boot"],
    accessori: ["cintura", "belt", "borsa", "bag", "sciarpa", "scarf", "guanti", "gloves"],
  },
  "Codici di abbigliamento": {
    scarpe: ["stringata", "lace up", "oxford", "derby", "décolleté", "decollete", "pump", "heel", "mocassino", "loafer"],
    accessori: ["cravatta", "tie", "papillon", "pochette", "cintura", "belt", "gemelli"],
  },
};

// Gli stili che nella loro famiglia sono l'eccezione. Il Western sta in
// "Luoghi e atmosfere" insieme al Mediterraneo, ma con i sandali non ci va
// da nessuna parte.
const ECCEZIONI = {
  "Balletcore": { scarpe: ["ballerina", "ballet", "flats", "mary jane", "flat"], accessori: ["fiocco", "nastro", "foulard", "scaldamuscoli"] },
  "Coquette": { scarpe: ["ballerina", "ballet", "flats", "mary jane", "décolleté", "decollete", "pump", "heel"], accessori: ["fiocco", "nastro", "cerchietto"] },
  "Western": { scarpe: ["texano", "cowboy", "western boot", "stivale", "boot", "camperos", "camperos"], accessori: ["cintura", "belt", "fibbia", "cappello", "hat", "bandana"] },
  "Blokecore": { scarpe: ["sneaker", "samba", "gazelle", "terrace"], accessori: ["calzino", "sciarpa", "scarf", "cappellino", "cap"] },
  "Skate": { scarpe: ["sneaker", "skate", "vulcanizzata", "suola piatta"], accessori: ["cappellino", "cap", "zaino", "backpack", "calzino"] },
  "Sneakerhead": { scarpe: ["sneaker", "retro", "high top", "running"], accessori: ["cappellino", "cap", "calzino", "zaino", "backpack"] },
  "Court / Basket": { scarpe: ["sneaker", "basket", "high top", "court"], accessori: ["cappellino", "cap", "calzino", "zaino", "backpack"] },
  "Athleisure / Sportivo": { scarpe: ["sneaker", "running", "trainer"], accessori: ["cappellino", "cap", "zaino", "backpack", "calzino", "marsupio"] },
  "Gorpcore / Outdoor": { scarpe: ["trekking", "boot", "trail", "sneaker"], accessori: ["zaino", "backpack", "cappellino", "cap", "berretto", "guanti", "gloves"] },
  "Goth": { scarpe: ["anfibio", "combat", "platform", "stivale", "boot", "creeper"], accessori: ["catena", "choker", "borchie", "guanti", "gloves"] },
  "Punk": { scarpe: ["anfibio", "combat", "creeper", "stivale", "boot", "platform"], accessori: ["borchie", "catena", "cintura", "belt", "spille"] },
  "Metal": { scarpe: ["anfibio", "combat", "stivale", "boot", "boot"], accessori: ["borchie", "catena", "cintura", "belt", "bandana"] },
  "Biker / Motociclista": { scarpe: ["stivale", "boot", "anfibio", "combat", "boot"], accessori: ["cintura", "belt", "guanti", "gloves", "bandana"] },
  "Coastal / Riviera": { scarpe: ["sandalo", "sandal", "espadrillas", "infradito", "mocassino", "loafer"], accessori: ["paglia", "cappello", "hat", "occhiali", "sunglasses", "foulard"] },
  "Mediterraneo": { scarpe: ["sandalo", "sandal", "espadrillas", "mocassino", "loafer"], accessori: ["paglia", "cappello", "hat", "occhiali", "sunglasses", "foulard"] },
  "Tropicale": { scarpe: ["sandalo", "sandal", "infradito", "espadrillas"], accessori: ["paglia", "cappello", "hat", "occhiali", "sunglasses"] },
  "Glam / Serata": { scarpe: ["décolleté", "decollete", "pump", "heel", "sandalo", "sandal", "tacco"], accessori: ["clutch", "pochette", "orecchini"] },
  "Red carpet": { scarpe: ["décolleté", "decollete", "pump", "heel", "sandalo", "sandal", "tacco"], accessori: ["clutch", "pochette", "gioiello"] },
  "Black tie": { scarpe: ["stringata", "lace up", "oxford", "vernice", "décolleté", "decollete", "pump", "heel"], accessori: ["papillon", "gemelli", "clutch"] },
  "Business / Formale": { scarpe: ["stringata", "lace up", "oxford", "derby", "décolleté", "decollete", "pump", "heel"], accessori: ["cravatta", "tie", "cintura", "belt", "borsa", "bag", "gemelli"] },
  "Business formal": { scarpe: ["stringata", "lace up", "oxford", "derby", "décolleté", "decollete", "pump", "heel"], accessori: ["cravatta", "tie", "cintura", "belt", "borsa", "bag", "gemelli"] },
  "Preppy": { scarpe: ["mocassino", "loafer", "loafer", "penny", "boat", "sneaker"], accessori: ["cintura", "belt", "cravatta", "tie", "foulard", "borsa", "bag"] },
  "Ivy League": { scarpe: ["mocassino", "loafer", "loafer", "penny", "oxford", "derby"], accessori: ["cintura", "belt", "cravatta", "tie", "borsa", "bag"] },
  "British / Countryside": { scarpe: ["stivale", "boot", "boot", "gomma", "derby", "brogue"], accessori: ["sciarpa", "scarf", "coppola", "cappello", "hat", "guanti", "gloves"] },
  "Cottagecore": { scarpe: ["stivaletto", "ankle boot", "ballerina", "ballet", "flats", "sandalo", "sandal"], accessori: ["cesto", "foulard", "sciarpa", "scarf", "cappello", "hat"] },
  "Prairie": { scarpe: ["stivaletto", "ankle boot", "stivale", "boot", "ballerina", "ballet", "flats"], accessori: ["foulard", "cappello", "hat", "cintura", "belt"] },
  "Y2K": { scarpe: ["platform", "chunky", "sneaker", "stivale", "boot"], accessori: ["occhiali", "sunglasses", "borsa", "bag", "cappellino", "cap", "cintura", "belt"] },
  "Techwear": { scarpe: ["sneaker", "trekking", "boot", "trail"], accessori: ["marsupio", "zaino", "backpack", "guanti", "gloves", "cintura", "belt"] },
  "Militare": { scarpe: ["anfibio", "combat", "boot", "trekking"], accessori: ["cintura", "belt", "zaino", "backpack", "berretto"] },
  "Total black": { scarpe: ["sneaker", "anfibio", "combat", "stivale", "boot", "décolleté", "decollete", "pump", "heel", "mocassino", "loafer"], accessori: ["cintura", "belt", "borsa", "bag", "sciarpa", "scarf", "occhiali", "sunglasses"] },
};

// Gli oggetti che non appartengono a nessuno stile in particolare, e quindi
// a tutti: una borsa è una borsa, una sciarpa è una sciarpa. Servono a due
// cose. Sono il vocabolario degli stili che non stanno in nessuna famiglia
// nota, e sono l'ultimo livello per tutti gli altri: lo Streetwear fra i suoi
// accessori non elenca "borsa", e quando in catalogo dei suoi colori c'erano
// solo borse il filtro si arrendeva del tutto. Meglio un elenco largo che
// nessun elenco — nessun elenco vuol dire nessun filtro.
const GENERICI = {
  scarpe: ["scarpa", "sneaker", "mocassino", "loafer", "stivale", "boot", "stivaletto", "ankle boot", "sandalo", "sandal", "ballerina", "ballet", "flats", "décolleté", "decollete", "pump", "heel", "derby"],
  accessori: ["borsa", "bag", "cintura", "belt", "sciarpa", "scarf", "zaino", "backpack", "cappello", "hat", "occhiali", "sunglasses", "foulard"],
};

const cacheIndossare = new Map();

/**
 * Le parole con cui cercare le SCARPE e gli ACCESSORI di uno stile.
 *
 * Due livelli, non uno. `prime` sono le parole dello stile preciso — i texani
 * del Western, le ballerine del Balletcore, le stringate del Business. `poi`
 * sono quelle della sua famiglia, che servono solo se in catalogo delle prime
 * non c'è niente: mescolarle in un elenco unico rimetteva le sneakers nel
 * completo formale, che è il problema da cui siamo partiti.
 *
 * Chi chiama deve comunque essere pronto a non trovare niente nemmeno al
 * secondo livello: con cinque colori e un catalogo finito le ballerine possono
 * non esserci, e un completo scalzo è peggio di un completo con la scarpa
 * sbagliata.
 */
export function paroleDaIndossare(nome) {
  if (!nome) return { scarpe: { prime: [], poi: [] }, accessori: { prime: [], poi: [] } };
  if (cacheIndossare.has(nome)) return cacheIndossare.get(nome);

  const eccezione = ECCEZIONI[nome];
  const famiglia = PER_FAMIGLIA[FAMIGLIA_DI[nome]] || (eccezione ? null : GENERICI);

  const livelli = (chiave) => {
    const prime = eccezione?.[chiave] || famiglia?.[chiave] || [];
    // Quello che sta già fra le prime non si ripete fra le seconde. In coda
    // i generici, che non sono di nessuno stile e quindi non stonano con
    // nessuno: senza, un Goth davanti a un catalogo di sole borse si ritrova
    // senza filtro e prende la prima cosa del colore giusto.
    const poi = [
      ...(eccezione && famiglia?.[chiave] ? famiglia[chiave] : []),
      ...GENERICI[chiave],
    ].filter((k, i, tutte) => !prime.includes(k) && tutte.indexOf(k) === i);
    return { prime, poi };
  };

  const fuori = { scarpe: livelli("scarpe"), accessori: livelli("accessori") };
  cacheIndossare.set(nome, fuori);
  return fuori;
}
