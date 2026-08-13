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
             "parka", "blazer", "cardigan", "coat", "jacket", "chiodo", "montgomery"],
  },
  top: {
    etichetta: "Maglia",
    parole: ["maglia", "maglione", "felpa", "camicia", "t-shirt", "tshirt", "polo",
             "dolcevita", "pullover", "blusa", "top", "canotta", "hoodie", "shirt", "sweater"],
  },
  bottom: {
    etichetta: "Pantaloni",
    parole: ["pantalone", "pantaloni", "jeans", "gonna", "bermuda", "shorts",
             "chino", "leggings", "denim", "trouser", "skirt", "abito", "vestito"],
  },
  scarpe: {
    etichetta: "Scarpe",
    parole: ["scarpa", "scarpe", "sneaker", "stivale", "stivaletto", "sandalo",
             "mocassino", "décolleté", "decollete", "ballerina", "anfibio", "boot", "shoe"],
  },
  accessorio: {
    etichetta: "Accessorio",
    parole: ["borsa", "zaino", "cintura", "sciarpa", "cappello", "occhiali",
             "guanti", "berretto", "cravatta", "foulard", "bag", "belt", "scarf"],
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
    evita: ["sandalo", "infradito", "costume", "shorts"],
  },
  {
    id: "primavera",
    nome: "Primavera",
    mesi: "marzo – maggio",
    ruoli: ["capospalla", "top", "bottom", "scarpe", "accessorio"],
    obbligatori: ["top", "bottom", "scarpe"],
    preferisci: ["camicia", "blazer", "giacca leggera", "maglia", "jeans",
                 "sneaker", "chino", "cotone", "trench"],
    evita: ["piumino", "montone", "cashmere", "pile", "stivale"],
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
    evita: ["cappotto", "piumino", "lana", "cashmere", "montone", "pile", "stivale"],
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
for (const [chiave, r] of Object.entries(RUOLI)) {
  const fuga = (p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Il plurale fa parte della parola: senza (s|e|i)? "Sneakers" non
  // corrispondeva a "sneaker" e finiva fra gli accessori per via di "Belt".
  CONFINI[chiave] = new RegExp(`(^|[^a-zà-ù])(${r.parole.map(fuga).join("|")})(s|e|i)?([^a-zà-ù]|$)`, "i");
}

// Roba per bambini: non deve entrare in un completo per adulti.
const PER_BAMBINI = /(^|[^a-z])(kids?|bimb|bambin|baby|junior|neonat|infant)([^a-z]|$)/i;

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
