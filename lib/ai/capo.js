import { vintedListingUrl } from "@/lib/data";

// Il capo, messo in ordine.
//
// I provider chiedono le parole al modello; questo file decide che forma
// hanno quando escono. Prima si chiamava resell.js e normalizzava una cosa
// sola, perché una sola ne arrivava: la scheda di rivendita conteneva anche i
// consigli di abbinamento. Ora i compiti sono due e le forme pure.

// Vinted taglia il titolo a 100 caratteri. Se ne mandiamo di più l'annuncio
// arriva monco, e uno se ne accorge solo dopo averlo pubblicato.
const MAX_TITOLO = 100;
// La descrizione su Vinted ne accetta molti di più, ma "breve" era il punto:
// tre frasi si leggono dal telefono, mezza pagina no.
const MAX_DESCRIZIONE = 300;

// Il titolo la nomina già?
//
// Serve a non scrivere "Levi's Levi's 501": il modello a volte la marca la
// mette da sé. Il confronto è sulle lettere e basta — via apostrofi, punti e
// spazi — perché "Levis" e "Levi's" sono la stessa marca, e "CARHARTT" pure.
function nominaLa(testo, marca) {
  const nudo = (x) => String(x || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const m = nudo(marca);
  return m.length > 1 && nudo(testo).includes(m);
}

function pulisci(testo) {
  return String(testo || "").replace(/\s+/g, " ").trim();
}

/**
 * Toglie quello che nell'inserzione non deve arrivare.
 *
 * Il prompt lo vieta, ma un divieto non è una garanzia: i modelli che sanno
 * cercare in rete rispondono volentieri con grassetti e trattini a inizio
 * riga — l'ho visto fare — e chi incolla quel testo su Vinted si ritrova i
 * simboli in mezzo alle frasi e deve ripulirli a mano.
 *
 * Le emoji si tolgono, gli asterischi e i cancelletti pure, e i trattini a
 * inizio riga diventano frasi: un elenco puntato riscritto di fila si legge,
 * un elenco puntato dentro un campo di testo no.
 */
function senzaOrpelli(testo) {
  return String(testo || "")
    // emoji e simboli decorativi
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}]/gu, "")
    // grassetti e titoletti del markdown
    .replace(/\*+|_{2,}|#{1,6}\s*|`+/g, "")
    // Pallini e trattini a inizio riga: la voce dell'elenco diventa una
    // frase. Serve anche il punto in fondo, altrimenti le voci si
    // incollano una all'altra — «Zip frontale Tasca sul petto» — e si
    // legge peggio dell'elenco da cui venivano.
    .replace(/^[ \t]*[-‐-―•·●▪⁃]\s+(.*)$/gm,
      (_, voce) => (/[.!?;:,]$/.test(voce.trim()) ? voce.trim() : `${voce.trim()}.`))
    .replace(/\s*\n+\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function accorcia(testo, limite) {
  const t = pulisci(testo);
  if (t.length <= limite) return t;
  const tagliato = t.slice(0, limite - 1);
  const spazio = tagliato.lastIndexOf(" ");
  const base = spazio > limite * 0.6 ? tagliato.slice(0, spazio) : tagliato;
  return base.replace(/[\s,;:.\-–—]+$/, "") + "…";
}

// Per la descrizione i puntini di sospensione non vanno: un annuncio che si
// interrompe a metà sembra scritto da uno che non ci teneva. Se è lunga si
// taglia all'ultima frase intera che ci sta.
function frasiEntro(testo, limite) {
  const t = pulisci(testo);
  if (t.length <= limite) return t;
  let out = "";
  for (const frase of t.split(/(?<=[.!?])\s+/)) {
    // Anche la prima frase va misurata: se da sola sfora, non ce n'è una
    // intera che ci stia, e si scende ai puntini più sotto.
    const prossima = out ? out + " " + frase : frase;
    if (prossima.length > limite) break;
    out = prossima;
  }
  return out || accorcia(t, limite);
}

// Che cosa c'è davvero nella foto.
//
// Un iPhone caricato per sbaglio tornava indietro come "pantalone in cotone,
// 18–25 €": il modello, a cui era stato chiesto che capo fosse, un capo lo
// trovava comunque. Ora può dire di no, e se dice di no qui buttiamo via
// tutto il resto — perché un annuncio inventato lo si pubblica, e chi lo
// compra non riceve niente.
function guardia(data) {
  return {
    riconosciuto: data.isGarment !== false,
    oggetto: pulisci(data.objectSeen),
  };
}

// Che capo è e con cosa si mette. Niente prezzi, niente annuncio.
export function normalizzaAbbinamento(data = {}) {
  const g = guardia(data);
  if (!g.riconosciuto) return { ...g, title: "", category: "", description: "", matchTips: [] };
  return {
    ...g,
    title: pulisci(data.title) || "Capo",
    category: pulisci(data.category) || "—",
    description: pulisci(data.description),
    matchTips: Array.isArray(data.matchTips) ? data.matchTips.slice(0, 4) : [],
  };
}

// L'annuncio pronto da incollare. Niente consigli di abbinamento: chi sta
// vendendo un capo non deve sapere con cosa mettersi quello che sta dando via.
/**
 * Toglie la taglia dall'annuncio.
 *
 * In una foto la taglia non si legge, e il prompt lo dice per esteso — «la
 * taglia solo se si legge davvero», «di quello che nella foto non si vede non
 * inventare niente». Il modello lo fa lo stesso: su dieci foto vere del
 * catalogo, un annuncio su sei se l'è portata dietro — «Maglione lana blu
 * taglia M», «Scarpe in pelle marrone con fibbia metallica, taglia 38».
 *
 * È l'errore più caro che quest'app possa fare. Gli altri li vede chi guarda
 * e li scarta; questo finisce dentro un annuncio pubblicato, e a scoprirlo è
 * chi ha comprato. Su Vinted la taglia ha un campo suo, che il venditore
 * compila comunque: toglierla dal testo non gli fa perdere niente.
 *
 * Si toglie solo dove la parola è quella — «taglia M», «tg. 38», «size L» —
 * e non dove capita di assomigliarci: «taglio dritto» resta dov'è.
 *
 * E la taglia si scrive anche senza dirlo, appesa in fondo con una barra:
 * «Maglione blu lana colletto camicia/L». Quella forma si toglie solo in
 * fondo al titolo, dove è una taglia e non può essere altro — in mezzo a una
 * frase una barra separa due parole, e lì non si tocca.
 */
const TAGLIA_DETTA = /[,;]?\s*\b(?:taglia|tg\.?|size)\b\s*[:.]?\s*(?:unica|x{0,2}[sml]\b|\d{1,3}\b|one size\b)/gi;
const TAGLIA_IN_CODA = /\s*\/\s*(?:x{0,2}[sml]|\d{1,3})\s*$/i;

export function senzaTaglia(testo) {
  if (!testo) return testo;
  return String(testo)
    .replace(TAGLIA_DETTA, "")
    .replace(TAGLIA_IN_CODA, "")
    // quel che resta della punteggiatura attorno al buco
    .replace(/\s*,\s*(?=[,.]|$)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;])/g, "$1")
    .trim()
    .replace(/[,;]$/, "");
}

export function normalizzaVendita(data = {}) {
  const g = guardia(data);
  if (!g.riconosciuto) {
    return { ...g, title: "", marca: null, category: "", description: "", priceRange: "", vintedTitle: "", vintedDescription: "", vintedUrl: null };
  }

  const title = pulisci(data.title) || "Capo";
  const description = pulisci(data.description);
  const marca = pulisci(data.brand);

  // Il titolo comincia dalla marca, e se il modello se l'è dimenticata gliela
  // rimettiamo davanti noi.
  //
  // Su Vinted la marca è la prima parola che chi compra scrive nella ricerca:
  // un annuncio che dice "giacca da lavoro marrone" invece di "Carhartt
  // giacca Detroit marrone" non lo trova nessuno, e resta lì. Non gliela
  // chiedevamo affatto, quindi non la scriveva mai, e uscivano annunci
  // anonimi — che è esattamente il difetto da cui è nata questa riga.
  const titoloGrezzo = senzaTaglia(data.vintedTitle || title);
  const conMarca =
    marca && !nominaLa(titoloGrezzo, marca) ? `${marca} ${titoloGrezzo}` : titoloGrezzo;
  const vintedTitle = accorcia(senzaOrpelli(conMarca), MAX_TITOLO);
  const vintedDescription = frasiEntro(senzaOrpelli(senzaTaglia(data.vintedDescription || description)), MAX_DESCRIZIONE);

  return {
    ...g,
    title,
    marca: marca || null,
    category: pulisci(data.category) || "—",
    description,
    priceRange: pulisci(data.priceRange) || "—",
    vintedTitle,
    vintedDescription,
    vintedUrl: vintedListingUrl(vintedTitle || "capo abbigliamento"),
  };
}
