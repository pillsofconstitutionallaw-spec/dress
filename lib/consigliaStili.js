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
// L'ordine conta: si prende il primo libero di ogni lista.
//
// Prima queste cominciavano con Classico e Minimal — consigli veri ma
// insipidi, che uscivano a chiunque e facevano sembrare l'app un questionario
// mal fatto. Davanti vanno gli stili CARATTERISTICI di quella combinazione,
// quelli che una persona con quei colori porta meglio di chiunque altro. I
// generici restano in fondo, come rete di sicurezza.
const AFFINITA = {
  contrastoAlto: ["Linee nette", "Total black", "Colour blocking", "Anni 80 / Power dressing",
                  "Rock / Edgy", "Office siren", "Glam / Serata", "Monocromatico",
                  "Avant-garde", "Business / Formale", "Classico", "Minimal"],
  // Il contrasto di mezzo prende gli stessi stili di quello alto — fra 23 e
  // 39 reggono bene — ma se lo sente dire in un altro modo: vedi PERCHE.
  contrastoBasso: ["Linee morbide", "Quiet luxury / Old money", "Coastal grandmother",
                   "Cottagecore", "Balletcore", "Light academia", "Romantico", "Bohémien",
                   "Clean girl", "Capsule wardrobe", "Scandi"],
  // Caldo e freddo dicono la TEMPERATURA, non la profondità: davanti vanno
  // gli stili che stanno bene sia a un chiaro sia a uno scuro. Prima il
  // freddo cominciava con "Urbano notturno" — nero, pelle, città di sera — e
  // usciva anche a un'Estate chiara, cioè alla persona più delicata che c'è.
  caldo: ["Tessuti naturali", "Mediterraneo", "Folk", "Bohémien", "Western",
          "Anni 70 / Disco", "Safari", "Prairie", "Sostenibile / Slow fashion"],
  freddo: ["Monocromatico", "Nordico", "Scandi", "New York minimal", "Techwear",
           "Dark academia", "Milanese", "Urbano notturno", "Goth", "Minimal"],
  chiaro: ["Coastal / Riviera", "Parisian chic", "Light academia", "Mediterraneo",
           "Clean girl", "Preppy", "Bon ton / Borghese"],
  scuro: ["Dark academia", "Milanese", "Sartoriale italiano", "Total black", "Goth",
          "Urbano notturno", "Rock / Edgy"],

};
// Stessa lista dei contrasti alti, e non per pigrizia: fra 23 e 39 quegli
// stili funzionano. Quello che cambia è come lo si dice — vedi PERCHE.
AFFINITA.contrastoMedio = AFFINITA.contrastoAlto;

// Chi ha dichiarato uno stile ne vuole di vicini, non l'opposto.
const VICINI = {};
for (const f of FAMIGLIE_STILI) {
  for (const s of f.stili) VICINI[s] = f.stili.filter((x) => x !== s);
}

// L'età sposta l'ORDINE dei consigli, non li vieta.
//
// Alcuni stili nascono dentro una sottocultura giovanile (Y2K, E-girl),
// altri attorno a occasioni che arrivano più avanti (Cerimonia, Business
// formal). Ignorarlo darebbe consigli scollegati dalla vita di chi legge.
//
// Ma la regola è netta: nessuno stile viene MAI escluso per l'età, e l'età
// non compare MAI nella spiegazione. "Alla tua età" è la frase che fa
// chiudere l'app e non riaprirla — e le nostre regole di condotta la vietano.
// Qui l'età dà una piccola spinta, e chi vuole vestirsi come gli pare lo
// trova comunque nell'elenco.
const AFFINITA_ETA = [
  { fino: 25, spinta: ["Y2K", "E-girl / E-boy", "Streetwear", "Skate", "Balletcore",
                       "Coquette", "Barbiecore", "Indie sleaze", "Grunge", "Hip-hop",
                       "K-fashion", "Blokecore", "Oversize"] },
  { fino: 38, spinta: ["Smart casual", "Minimal", "Clean girl", "Scandi", "Athleisure / Sportivo",
                       "Gorpcore / Outdoor", "Techwear", "Parisian chic", "Capsule wardrobe",
                       "Sostenibile / Slow fashion", "Casual Friday"] },
  { fino: 55, spinta: ["Classico", "Sartoriale italiano", "Quiet luxury / Old money",
                       "Business casual", "Milanese", "Bon ton / Borghese", "Smart elegante",
                       "Linee morbide", "Tessuti naturali", "Uniform dressing"] },
  { fino: 200, spinta: ["Classico", "Quiet luxury / Old money", "Coastal grandmother",
                        "Linee morbide", "Tessuti naturali", "Maglieria", "British / Countryside",
                        "Bon ton / Borghese", "Cerimonia"] },
];

export function etaDa(dataNascita) {
  if (!dataNascita) return null;
  const d = new Date(dataNascita);
  if (Number.isNaN(d.getTime())) return null;
  const oggi = new Date();
  let anni = oggi.getFullYear() - d.getFullYear();
  const m = oggi.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && oggi.getDate() < d.getDate())) anni--;
  return anni > 0 && anni < 120 ? anni : null;
}

const PERCHE = {
  contrastoAlto: "Hai un contrasto marcato fra capelli e incarnato: regge le linee nette e i colori pieni, che su altri risulterebbero pesanti.",
  contrastoBasso: "Il tuo contrasto è morbido: gli stili costruiti su sfumature e tessuti naturali ti somigliano più di quelli netti.",
  // Vero e basta: nel mezzo non c'è niente da dichiarare, e questi stili
  // stanno bene comunque. Prima qui usciva la frase del contrasto marcato.
  contrastoMedio: "Il tuo contrasto sta nel mezzo, e da lì si può andare in tutte e due le direzioni: questi stili reggono senza chiedere né molto contrasto né poco.",
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
// A quale famiglia appartiene ogni stile: serve a non consigliarne tre
// della stessa, che è il modo più veloce per sembrare ripetitivi.
const FAMIGLIA_DI = {};
for (const f of FAMIGLIE_STILI) for (const s of f.stili) FAMIGLIA_DI[s] = f.famiglia;

/**
 * @param analisi  il risultato di analizzaColori (stagione + misura)
 * @param profile  i dati del questionario, più la data di nascita
 * @returns fino a cinque stili, uno per segnale
 */
export function consigliaStili(analisi, profile = {}, daiVestiti = null) {
  const m = analisi?.misura || {};
  const contrasto = m.contrasto ?? 30;
  const sottotono = m.sottotono || (String(analisi?.season || "").match(/Primavera|Autunno/) ? "caldo" : "freddo");
  const luce = m.luminosita ?? 62;

  const dichiarato = String(profile.style || "").trim();
  const valido = dichiarato && !/non so/i.test(dichiarato) && VICINI[dichiarato];
  const eta = etaDa(profile.dataNascita || profile.data_nascita);
  const fasciaEta = eta ? AFFINITA_ETA.find((f) => eta <= f.fino) : null;

  // Ogni consiglio viene da una ragione DIVERSA, come farebbe uno stylist:
  // "questo perché l'hai detto tu, questo per i tuoi colori, questo per la
  // tua vita, questo per provare". Sommando i punteggi invece uscivano
  // sempre gli stessi tre stili generici — Minimal, Classico, Business —
  // perché comparivano in più liste e si accumulavano, e persone di
  // vent'anni e di settanta ricevevano la stessa identica risposta.
  const sorgenti = [
    valido ? { chiave: "dichiarato", lista: [dichiarato], motivo: PERCHE.dichiarato } : null,
    // Come sei vestito nella foto: viene subito dopo quello che hai
    // dichiarato, perché è l'unica cosa che si vede invece di dedursi.
    daiVestiti ? { chiave: daiVestiti.chiave, lista: daiVestiti.lista, motivo: daiVestiti.motivo } : null,
    // Tre fasce, e prima erano due scritte come se fossero tre: il ramo
    // «>= 40» e quello di mezzo davano tutti e due «contrastoAlto», quindi
    // chiunque non avesse il contrasto basso finiva lì — e con la lista si
    // portava dietro la frase, «Hai un contrasto marcato fra capelli e
    // incarnato».
    //
    // Contate le combinazioni che l'app offre — dodici toni di pelle per
    // sette colori di capelli — nel mezzo ci finisce il 26%: pelle oliva
    // chiara e capelli castano chiari fanno 25, e marcato non è. Una persona
    // su quattro si sentiva dire una cosa sul proprio viso che non avevamo
    // verificato.
    //
    // La lista resta quella dei contrasti alti, perché fra 23 e 39 quegli
    // stili funzionano davvero: quella è una scelta di stile, e non è questo
    // il posto per cambiarla. Cambia la frase, che è la parte che affermava.
    (() => {
      const fascia = contrasto >= 40 ? "contrastoAlto" : contrasto <= 22 ? "contrastoBasso" : "contrastoMedio";
      return { chiave: "contrasto", lista: AFFINITA[fascia], motivo: PERCHE[fascia] };
    })(),
    { chiave: "sottotono", lista: AFFINITA[sottotono === "caldo" ? "caldo" : "freddo"], motivo: PERCHE[sottotono === "caldo" ? "caldo" : "freddo"] },
    fasciaEta ? { chiave: "eta", lista: fasciaEta.spinta, motivo: PERCHE.vicino } : null,
    luce >= 70 || luce <= 52
      ? { chiave: "luce", lista: AFFINITA[luce >= 70 ? "chiaro" : "scuro"], motivo: PERCHE[luce >= 70 ? "chiaro" : "scuro"] }
      : null,
    valido ? { chiave: "vicino", lista: VICINI[dichiarato], motivo: PERCHE.vicino } : null,
  ].filter(Boolean);

  const scelti = [];
  const presi = new Set();
  const famiglieUsate = new Map();

  const prendi = (sorgente, ammettiFamigliaRipetuta = false) => {
    for (const nome of sorgente.lista) {
      if (!VICINI[nome] || presi.has(nome)) continue;
      const fam = FAMIGLIA_DI[nome];
      // Non più di due stili della stessa famiglia: tre sono un sinonimo
      // ripetuto tre volte.
      if (!ammettiFamigliaRipetuta && (famiglieUsate.get(fam) || 0) >= 2) continue;
      presi.add(nome);
      famiglieUsate.set(fam, (famiglieUsate.get(fam) || 0) + 1);
      scelti.push({ nome, perche: sorgente.motivo, capi: [], da: sorgente.chiave });
      return true;
    }
    return false;
  };

  for (const s of sorgenti) {
    if (scelti.length >= 5) break;
    prendi(s);
  }

  // Se restano posti vuoti — perché una sorgente non aveva candidati liberi —
  // si riempiono ripassando, stavolta senza il limite di famiglia.
  for (const s of sorgenti) {
    if (scelti.length >= 5) break;
    prendi(s, true);
  }

  return scelti.slice(0, 5);
}
