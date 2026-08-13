import { FAMIGLIE_STILI } from "@/lib/data";

// I cinque stili consigliati, calcolati da noi.
//
// Non è una scelta a caso né una lista fissa: parte da quello che la persona
// ha dichiarato e da come è fatta — contrasto, sottotono, luminosità — e usa
// le stesse regole che userebbe un consulente. Sono regole discutibili, come
// tutte quelle di stile, ma sono SEMPRE le stesse e sono scritte qui, non
// nascoste dentro un modello.

// Che tipo di stili regge ogni combinazione. Il criterio è uno solo: gli stili
// con molti dettagli e contrasti forti chiedono una persona che li regga,
// quelli morbidi stanno meglio su chi ha poco contrasto.
const AFFINITA = {
  contrastoAlto: ["Classico", "Minimal", "Business / Formale", "Rock / Edgy", "Glam / Serata",
                  "Anni 80 / Power dressing", "Colour blocking", "Total black", "Linee nette",
                  "Office siren", "Avant-garde", "Maximalista"],
  contrastoBasso: ["Romantico", "Scandi", "Coastal / Riviera", "Cottagecore", "Bohémien",
                   "Clean girl", "Linee morbide", "Balletcore", "Coastal grandmother",
                   "Quiet luxury / Old money", "Capsule wardrobe", "Light academia"],
  caldo: ["Bohémien", "Western", "Safari", "Anni 70 / Disco", "Folk", "Mediterraneo",
          "Tessuti naturali", "Sostenibile / Slow fashion", "Prairie", "Autunno"],
  freddo: ["Minimal", "Scandi", "Techwear", "Dark academia", "Goth", "Monocromatico",
           "New York minimal", "Nordico", "Urbano notturno"],
  chiaro: ["Coastal / Riviera", "Clean girl", "Light academia", "Preppy", "Mediterraneo",
           "Parisian chic", "Bon ton / Borghese"],
  scuro: ["Dark academia", "Goth", "Total black", "Rock / Edgy", "Urbano notturno",
          "Sartoriale italiano", "Milanese"],
};

// Chi ha dichiarato uno stile ne vuole di vicini, non l'opposto.
const VICINI = {};
for (const f of FAMIGLIE_STILI) {
  for (const s of f.stili) VICINI[s] = f.stili.filter((x) => x !== s);
}

const PERCHE = {
  contrastoAlto: "Hai un contrasto marcato fra capelli e incarnato: regge le linee nette e i colori pieni, che su altri risulterebbero pesanti.",
  contrastoBasso: "Il tuo contrasto è morbido: gli stili costruiti su sfumature e tessuti naturali ti somigliano più di quelli netti.",
  caldo: "Il tuo sottotono è caldo: questi stili vivono di terre, ocra e materiali naturali, cioè della tua stessa temperatura.",
  freddo: "Il tuo sottotono è freddo: qui i colori restano puliti e i blu non virano al giallo.",
  chiaro: "La tua luminosità è alta: questi stili tengono i toni chiari senza sembrare slavati.",
  scuro: "La tua profondità regge i toni scuri, che su incarnati più chiari appesantirebbero.",
  dichiarato: "È lo stile che hai indicato tu: partiamo da lì.",
  vicino: "Sta accanto a quello che hai scelto: stessi capi, un tono diverso.",
};

/**
 * @param analisi  il risultato di analizzaColori (stagione + misura)
 * @param profile  i dati del questionario
 * @returns fino a cinque stili, dal più adatto
 */
export function consigliaStili(analisi, profile = {}) {
  const punteggi = new Map();
  const motivi = new Map();

  const aggiungi = (nome, punti, motivo) => {
    if (!nome) return;
    punteggi.set(nome, (punteggi.get(nome) || 0) + punti);
    if (!motivi.has(nome)) motivi.set(nome, motivo);
  };

  // 1. Lo stile dichiarato vince sempre: è l'unica cosa che la persona ci ha
  //    detto di sé con le sue parole.
  const dichiarato = String(profile.style || "").trim();
  const valido = dichiarato && !/non so/i.test(dichiarato) && VICINI[dichiarato];
  if (valido) {
    aggiungi(dichiarato, 100, PERCHE.dichiarato);
    for (const v of VICINI[dichiarato].slice(0, 4)) aggiungi(v, 30, PERCHE.vicino);
  }

  // 2. Poi la misura.
  const m = analisi?.misura || {};
  const contrasto = m.contrasto ?? 30;
  const sottotono = m.sottotono || (String(analisi?.season || "").match(/Primavera|Autunno/) ? "caldo" : "freddo");
  const luce = m.luminosita ?? 62;

  const gruppi = [
    [contrasto >= 40 ? "contrastoAlto" : contrasto <= 22 ? "contrastoBasso" : null, 26],
    [sottotono === "caldo" ? "caldo" : "freddo", 22],
    [luce >= 70 ? "chiaro" : luce <= 52 ? "scuro" : null, 18],
  ];

  for (const [gruppo, punti] of gruppi) {
    if (!gruppo) continue;
    for (const [i, nome] of (AFFINITA[gruppo] || []).entries()) {
      aggiungi(nome, punti - i, PERCHE[gruppo]);
    }
  }

  // 3. Cinque, non di più: oltre non è un consiglio, è un elenco.
  return [...punteggi.entries()]
    .filter(([nome]) => VICINI[nome]) // solo stili che esistono davvero nel nostro vocabolario
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nome]) => ({ nome, perche: motivi.get(nome), capi: [] }));
}
