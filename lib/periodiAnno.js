// I quattro periodi dell'anno, e di cosa è fatto un completo in ciascuno.
//
// Da non confondere con la stagione armocromatica ("Inverno freddo"), che
// riguarda i colori della persona e non cambia mai. Questa riguarda il meteo.
//
// Un outfit non è una lista di capi qualsiasi: sono ruoli. Serve qualcosa
// sopra, qualcosa sotto, qualcosa ai piedi, e d'inverno qualcosa che ripari.
// Se manca un ruolo il completo non sta in piedi, per quanti capi si mostrino.

export const RUOLI = {
  capospalla: {
    etichetta: "Sopra",
    parole: ["cappotto", "giubbotto", "piumino", "giacca", "trench", "bomber",
             "parka", "blazer", "cardigan", "coat", "jacket", "chiodo", "montgomery",
             "gilet", "vest", "waistcoat"],
  },
  top: {
    etichetta: "Maglia",
    parole: ["maglia", "maglione", "felpa", "camicia", "t-shirt", "tshirt", "polo",
             "dolcevita", "pullover", "blusa", "top", "canotta", "hoodie", "shirt", "sweater",
             // I negozi che scrivono in inglese: «sweatshirt» compare in 818
             // capi che restavano senza ruolo, «blouse» in 733.
             "sweatshirt", "blouse", "tee"],
  },
  intero: {
    etichetta: "Abito",
    // Un vestito non è "pantaloni": è un capo che fa da solo sopra e sotto.
    // Trattarlo come gli altri portava a proporre una maglia sopra un abito.
    parole: ["abito", "vestito", "tuta intera", "jumpsuit", "tutina", "dress",
             "salopette", "caftano", "chemisier"],
  },
  bottom: {
    etichetta: "Pantaloni",
    parole: ["pantalone", "pantaloni", "jeans", "gonna", "bermuda", "shorts",
             "chino", "leggings", "denim", "trouser", "skirt", "jogger",
             "pantaloncino", "culotte", "palazzo",
             // «pants» è la parola più frequente in assoluto fra i capi
             // senza ruolo: 2.488. C'era «trouser», che nessun negozio usa.
             "pants", "sweatpants"],
  },
  scarpe: {
    etichetta: "Scarpe",
    parole: ["scarpa", "scarpe", "sneaker", "stivale", "stivaletto", "sandalo",
             "mocassino", "décolleté", "decollete", "ballerina", "anfibio", "boot", "shoe",
             "sandal", "loafer", "pump", "heel"],
  },
  accessorio: {
    etichetta: "Accessorio",
    parole: ["borsa", "zaino", "cintura", "sciarpa", "cappello", "occhiali",
             "guanti", "berretto", "cravatta", "papillon", "foulard", "bag", "belt", "scarf",
             // Le stesse cose, come le scrivono i negozi in inglese: senza
             // queste erano 1.759 cappellini, 753 paia di occhiali da sole,
             // 372 portafogli e 356 orologi senza nessun ruolo.
             "cap", "hat", "beanie", "sunglasses", "watch", "wallet", "backpack", "glove", "purse"],
  },
};

export const PERIODI = [
  {
    id: "inverno",
    nome: "Inverno",
    mesi: "dicembre – febbraio",
    // D'inverno il capospalla non è un accessorio: è il capo che si vede di più.
    ruoli: ["capospalla", "top", "bottom", "scarpe", "accessorio"],
    obbligatori: ["capospalla", "top", "bottom", "scarpe"],
    preferisci: ["lana", "cashmere", "cappotto", "piumino", "maglione", "dolcevita",
                 "stivale", "felpa", "montone", "pile"],
    evita: ["lino", "sandalo", "infradito", "shorts", "bermuda", "costume", "canotta"],
  },
  {
    id: "autunno",
    nome: "Autunno",
    mesi: "settembre – novembre",
    ruoli: ["capospalla", "top", "bottom", "scarpe", "accessorio"],
    obbligatori: ["top", "bottom", "scarpe"],
    preferisci: ["giacca", "trench", "cardigan", "maglia", "jeans", "stivaletto",
                 "camicia", "felpa", "velluto", "tweed"],
    evita: ["sandalo", "infradito", "costume", "shorts", "bermuda", "canotta"],
  },
  {
    id: "primavera",
    nome: "Primavera",
    mesi: "marzo – maggio",
    ruoli: ["capospalla", "top", "bottom", "scarpe", "accessorio"],
    obbligatori: ["top", "bottom", "scarpe"],
    preferisci: ["camicia", "blazer", "giacca leggera", "maglia", "jeans",
                 "sneaker", "chino", "cotone", "trench"],
    evita: ["piumino", "montone", "cashmere", "pile", "stivale", "termic"],
  },
  {
    id: "estate",
    nome: "Estate",
    mesi: "giugno – agosto",
    // D'estate il capospalla non serve, e insistere darebbe consigli assurdi.
    ruoli: ["top", "bottom", "scarpe", "accessorio"],
    obbligatori: ["top", "bottom", "scarpe"],
    preferisci: ["lino", "t-shirt", "camicia", "shorts", "bermuda", "gonna",
                 "sandalo", "abito", "cotone", "canotta"],
    // La felpa d'estate è il consiglio che fa perdere fiducia in un colpo solo.
    evita: ["cappotto", "piumino", "lana", "cashmere", "montone", "pile",
            "stivale", "felpa", "termic", "imbottit"],
  },
];

export function periodoCorrente(data = new Date()) {
  const m = data.getMonth() + 1;
  if (m === 12 || m <= 2) return "inverno";
  if (m <= 5) return "primavera";
  if (m <= 8) return "estate";
  return "autunno";
}

// Il capo va bene per questo periodo?
export function adattoAlPeriodo(titolo, periodo) {
  const t = String(titolo || "").toLowerCase();
  if (periodo.evita.some((p) => t.includes(p))) return false;
  return true;
}

// Le parole vanno cercate INTERE. Cercandole come frammenti, "jeans baggy"
// finiva fra gli accessori perché "baggy" contiene "bag", e un paio di
// pantaloni veniva proposto come borsa.
const CONFINI = {};

/**
 * La parola, al singolare e al plurale, nelle due lingue in cui i negozi
 * scrivono i titoli.
 *
 * Le due lingue fanno il plurale in modi opposti, e prima ne era prevista
 * una sola: si aggiungeva una lettera in fondo — «sneaker» più «s» — che in
 * inglese è giusto e in italiano no. In italiano la vocale finale si
 * SOSTITUISCE: sandalo fa sandali, giacca fa giacche, camicia fa camicie,
 * gonna fa gonne, cappotto fa cappotti.
 *
 * Non era un difetto da poco: su 79.169 capi disponibili, 33.602 non
 * avevano nessun ruolo e quindi non entravano in nessun completo. E in un
 * caso il ruolo non mancava, era sbagliato — «Giacche di jeans» non
 * agganciava «giacca», agganciava «jeans», e una giacca finiva fra i
 * pantaloni.
 *
 * La «h» è per giacca/giacche e per tutte le altre in -ca e -ga, dove
 * l'italiano la infila per tenere il suono duro.
 */
function alPlurale(parola) {
  const fuga = (p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const scritta = fuga(parola);
  // Una parola che finisce per vocale può essere di tutte e due le lingue, e
  // le due lingue la declinano in modo opposto: «sandalo» fa «sandali»
  // cambiando la vocale, «glove» fa «gloves» aggiungendo la esse. Trattarle
  // solo all'italiana rompeva l'inglese — «gloves», «shoes», «hoodies»,
  // «blouses» smettevano di agganciare — e trattarle solo all'inglese
  // rompeva l'italiano, che è come stavano le cose prima. Valgono entrambe.
  if (/[aeo]$/.test(parola)) return `${fuga(parola.slice(0, -1))}h?[aeio]|${scritta}s`;
  return `${scritta}(s|es)?`;
}

for (const [chiave, r] of Object.entries(RUOLI)) {
  CONFINI[chiave] = new RegExp(`(^|[^a-zà-ù])(${r.parole.map(alPlurale).join("|")})([^a-zà-ù]|$)`, "i");
}

// Roba per bambini: non deve entrare in un completo per adulti.
const PER_BAMBINI = /(^|[^a-z])(kids?|bimb|bambin|baby|junior|neonat|infant|primi passi|newborn|toddler)([^a-z]|$)|primi passi/i;

export function ruoloDelCapo(titolo, categoria = "") {
  const t = `${titolo} ${categoria}`.toLowerCase();
  if (PER_BAMBINI.test(t)) return null;

  // Vince la parola che compare PRIMA, non quella di una lista arbitraria.
  // Nei titoli italiani il capo si nomina per primo e il resto lo descrive:
  // "Vestito di jeans con cintura" è un vestito, non una cintura.
  let vincitore = null;
  let posizione = Infinity;

  for (const [chiave, regex] of Object.entries(CONFINI)) {
    const m = t.match(regex);
    if (!m) continue;
    const dove = m.index + m[1].length;
    if (dove < posizione) {
      posizione = dove;
      vincitore = chiave;
    }
  }
  return vincitore;
}
