import { SPIEGAZIONI_STILI } from "@/lib/data";

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
