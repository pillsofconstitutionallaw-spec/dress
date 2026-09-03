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
             "gilet", "vest", "waistcoat",
             // «Giubbino» non c'era, e undici giubbini di denim finivano fra i
             // pantaloni perché a decidere era «jeans», che viene dopo. Le
             // altre le scrivono i negozi spagnoli e tedeschi.
             "giubbino", "chaqueta", "strickjacke", "sweatjacke"],
  },
  top: {
    etichetta: "Maglia",
    parole: ["maglia", "maglione", "felpa", "camicia", "t-shirt", "tshirt", "polo",
             "dolcevita", "pullover", "blusa", "top", "canotta", "hoodie", "shirt", "sweater",
             // I negozi che scrivono in inglese: «sweatshirt» compare in 818
             // capi che restavano senza ruolo, «blouse» in 733.
             "sweatshirt", "blouse", "tee",
             // Ecoalf e Thinking Mu scrivono in spagnolo, Armedangels in
             // tedesco: «camiseta» da sola sono 272 capi senza ruolo,
             // «jumper» 325, «sudadera» 144. E «maglietta» non è «maglia»,
             // perché le parole si cercano intere: altri 132.
             "camiseta", "camisa", "sudadera", "maglietta", "serafino",
             "jumper", "singlet", "strickpullover", "canottiera",
             // Un body si porta con i pantaloni o con la gonna: è una maglia
             // che si chiude sotto, non un capo che fa da solo sopra e sotto.
             "bodysuit"],
    // Un collo alto e una manica lunga sono due modi di fare un capo, non
    // due capi: «Turtleneck vest» è un gilet, «Longsleeve Dress» un abito.
    // «Crewneck» è un collo, non un capo: da solo è una felpa, dentro
    // «Crewneck cardigan» è un cardigan.
    deboli: ["turtleneck", "longsleeve", "crewneck"],
  },
  intero: {
    etichetta: "Abito",
    // Un vestito non è "pantaloni": è un capo che fa da solo sopra e sotto.
    // Trattarlo come gli altri portava a proporre una maglia sopra un abito.
    parole: ["abito", "vestito", "tuta intera", "jumpsuit", "tutina", "dress",
             "salopette", "caftano", "chemisier", "vestido", "kleid"],
    // Una «tuta» da sola è una tuta intera; ma «pantaloni della tuta» sono
    // pantaloni, e sono 159 contro 34. Vale solo dove non c'è altro.
    deboli: ["tuta"],
  },
  bottom: {
    etichetta: "Pantaloni",
    parole: ["pantalone", "pantaloni", "jeans", "gonna", "bermuda", "shorts",
             "chino", "leggings", "denim", "trouser", "skirt", "jogger",
             "pantaloncino", "culotte", "palazzo",
             // «pants» è la parola più frequente in assoluto fra i capi
             // senza ruolo: 2.488. C'era «trouser», che nessun negozio usa.
             "pants", "sweatpants", "sweatshorts",
             "pantalon", "falda", "hose", "stoffhose", "jorts"],
  },
  scarpe: {
    etichetta: "Scarpe",
    parole: ["scarpa", "scarpe", "sneaker", "stivale", "stivaletto", "sandalo",
             "mocassino", "décolleté", "decollete", "ballerina", "anfibio", "boot", "shoe",
             "sandal", "loafer", "pump", "heel",
             // Da Pittarello le ciabatte sono 292 capi, e nessuna aveva ruolo.
             "ciabatta", "infradito", "sabot", "zapatilla", "zapato", "espadrilla", "pantofola"],
  },
  accessorio: {
    etichetta: "Accessorio",
    parole: ["borsa", "zaino", "cintura", "sciarpa", "cappello", "occhiali",
             "guanti", "berretto", "cravatta", "papillon", "foulard", "bag", "belt", "scarf",
             // Le stesse cose, come le scrivono i negozi in inglese: senza
             // queste erano 1.759 cappellini, 753 paia di occhiali da sole,
             // 372 portafogli e 356 orologi senza nessun ruolo.
             "cap", "hat", "beanie", "sunglasses", "watch", "wallet", "backpack", "glove", "purse",
             // I gioielli erano un negozio intero: PDPAOLA, 1.115 capi su
             // 1.116 senza nessun ruolo, e nessuna di queste parole in elenco.
             "necklace", "earring", "orecchino", "bracelet", "bracciale",
             "pendant", "ciondolo", "anello", "hoops", "piercing",
             // La pelletteria italiana, che ha una parola per ogni forma.
             "tracolla", "pochette", "borsello", "cartella", "bolso", "gorra", "schal",
             "headband", "bretella", "ombrello"],
    // Parole che valgono solo se chiudono il titolo — vedi IN_FONDO.
    inFondo: ["tie"],
    // Queste invece sono spesso un dettaglio addosso a un altro capo: «Sock
    // Boots» sono stivali, «Ring Tee» una t-shirt, «Minigonna a portafoglio»
    // una gonna, «Charm Cross Over Mule» una scarpa. Valgono solo dove non
    // c'è nient'altro — vedi DEBOLI.
    //
    // «Portafoglio» fa «portafogli», che la regola del plurale non sa
    // costruire: le parole in -io perdono la vocale invece di cambiarla, e
    // cambiandola darebbero «portafoglii».
    deboli: ["sock", "calzino", "calza", "ring", "charm", "collana", "bandana",
             "portafoglio", "portafogli", "marsupio"],
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
    //
    // E la roba da mare, che qui mancava: le altre tre stagioni la
    // escludevano già, l'estate no — ed è l'unica in cui un costume sta
    // vicino alla palette e ha voglia di farsi scegliere. Chiesti 636 capi
    // all'app, uno era «BURGUNDY SWIM SHORTS» come pantaloni di un completo
    // estivo. Un completo qui è quello che si mette per uscire.
    //
    // «Mare» invece non c'è, ed è misurato: queste parole si cercano come
    // pezzi di testo, non intere, e «mare» sta dentro Oltremare, Marechiaro
    // e Maren. Toglieva 37 capi e 36 erano sbagliati. Le altre tre non
    // sbagliano su nessuno dei 79.000.
    evita: ["cappotto", "piumino", "lana", "cashmere", "montone", "pile",
            "stivale", "felpa", "termic", "imbottit",
            "costume", "bikini", "swim"],
  },
];

/**
 * I ruoli da riempire in questo periodo, sapendo se un abito c'è o no.
 *
 * Un abito fa da solo sopra e sotto: se c'è, quei due ruoli non si riempiono,
 * e al loro posto si riempie lui. La sostituzione va fatta tutta intera —
 * togliere maglia e pantaloni senza mettere l'abito lascia un completo con
 * due buchi, che è esattamente quello che succedeva.
 *
 * D'estate il capospalla non c'è, e la regola che metteva l'abito «subito
 * dopo il capospalla» quindi non lo metteva affatto: i dodici completi
 * estivi — uno per stagione — uscivano tutti senza maglia e senza pantaloni.
 * Dove il capospalla non c'è, l'abito va per primo.
 */
export function ruoliDaRiempire(periodo, conAbito) {
  if (!conAbito) return periodo.ruoli;
  const altri = periodo.ruoli.filter((r) => r !== "top" && r !== "bottom");
  // indexOf dà -1 dove il capospalla non c'è, e -1 + 1 è la testa della fila.
  const dopoIlCapospalla = altri.indexOf("capospalla") + 1;
  return [...altri.slice(0, dopoIlCapospalla), "intero", ...altri.slice(dopoIlCapospalla)];
}

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

/**
 * Le parole che contano solo se chiudono il titolo.
 *
 * «Tie» è la sola, per adesso, ed è il caso che spiega la regola: in inglese
 * quella parola è quasi sempre un laccio, non una cravatta — «tie-dye»,
 * «tie sweatpants», «rope tie up sandals», «lace tie front maxi dress». Presa
 * dovunque prendeva 804 capi senza ruolo ma ne rubava uno giusto a 133, e un
 * ruolo sbagliato costa più di uno mancante: mette un paio di sandali fra gli
 * accessori di un completo, dove servivano le scarpe.
 *
 * Una cravatta invece il negozio la nomina per ultima, perché tutto quello
 * che viene prima la descrive: «DARK BLUE SARTORIAL PRINTED SILK TIE». Presa
 * solo lì ne prende 709 e ne sbaglia cinque — quattro sono il plurale
 * («Halter Top With Ties»), e per questo il plurale qui non si costruisce.
 *
 * Si guarda il titolo e non la categoria: la categoria viene dopo nel testo,
 * e chiuderebbe lei ogni volta.
 */
/**
 * Le parole deboli: valgono solo dove non c'è nient'altro.
 *
 * Sono parole che un capo lo nominano davvero — un calzino è un calzino, un
 * anello è un anello — ma che molto più spesso descrivono un dettaglio addosso
 * a un altro capo: «Sock Boots» sono stivali, «Ring Zip Hoodie» una felpa,
 * «Turtleneck vest» un gilet, «Minigonna a portafoglio» una gonna, «Charm
 * Cross Over Mule» una scarpa.
 *
 * Messe insieme alle altre facevano quello che ci si aspetta: prese per prime
 * vincevano, e trentun capi che il ruolo giusto ce l'avevano lo perdevano.
 *
 * Non è come toglierle dall'elenco: «LOGO SOCK» e «Line Ring Brushed
 * Graphite» un ruolo ce l'hanno solo grazie a loro.
 */
const DEBOLI = {};

const IN_FONDO = {};
for (const [chiave, r] of Object.entries(RUOLI)) {
  if (!r.inFondo) continue;
  IN_FONDO[chiave] = new RegExp(`(^|[^a-zà-ù])(${r.inFondo.join("|")})\\s*$`, "i");
}

for (const [chiave, r] of Object.entries(RUOLI)) {
  if (!r.deboli) continue;
  DEBOLI[chiave] = new RegExp(`(^|[^a-zà-ù])(${r.deboli.map(alPlurale).join("|")})([^a-zà-ù]|$)`, "i");
}

// Roba per bambini: non deve entrare in un completo per adulti.
const PER_BAMBINI = /(^|[^a-z])(kids?|bimb|bambin|baby|junior|neonat|infant|primi passi|newborn|toddler)([^a-z]|$)|primi passi/i;

/**
 * Roba da notte: un completo è quello che si mette per uscire.
 *
 * Visto uscire da un completo vero, in agosto: «Scarpe: Pigiama fantasia
 * "sneakers"». La parola che decideva era «sneakers», che lì è il disegno
 * stampato sulla stoffa. Sono 262 capi da notte che entravano nei completi,
 * e cinquantacinque come capospalla — «Pigiama cardigan» proposto come il
 * soprabito d'autunno.
 *
 * Non si buttano via tutti i titoli che dicono «pigiama», però: un «Cappotto
 * a vestaglia» è un cappotto vero e i «Pantaloni pigiama wide leg» sono
 * pantaloni veri. Vale la stessa regola di posizione che vale per tutto il
 * resto — chi viene prima nel titolo è il capo — e quindi questa parola non
 * è un veto, è un concorrente che se vince non dà nessun ruolo.
 */
const DA_NOTTE = /(^|[^a-zà-ù])(pigiam[ai]|pyjamas?|pijamas?|vestagli[ae]|accappatoi[oi]|nightwear|sleepwear|homewear|camicie? da notte)([^a-zà-ù]|$)/i;

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

  // Le parole di fine titolo giocano la stessa partita, sulla stessa
  // posizione: se un'altra parola viene prima, vince quella.
  const soloTitolo = String(titolo).toLowerCase().trimEnd();
  for (const [chiave, regex] of Object.entries(IN_FONDO)) {
    const m = soloTitolo.match(regex);
    if (!m) continue;
    const dove = m.index + m[1].length;
    if (dove < posizione) {
      posizione = dove;
      vincitore = chiave;
    }
  }
  // Nessun capo nominato: allora valgono anche le parole deboli, e fra loro
  // decide di nuovo quella che viene prima.
  if (!vincitore) {
    for (const [chiave, regex] of Object.entries(DEBOLI)) {
      const m = t.match(regex);
      if (!m) continue;
      const dove = m.index + m[1].length;
      if (dove < posizione) {
        posizione = dove;
        vincitore = chiave;
      }
    }
  }
  if (!vincitore) return null;

  // E se la roba da notte viene prima del capo, il capo è quello da notte.
  const notte = t.match(DA_NOTTE);
  if (notte && notte.index + notte[1].length < posizione) return null;

  return vincitore;
}
