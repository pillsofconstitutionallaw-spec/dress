// Motore colori: dà un numero al colore, così confrontarlo è una sottrazione
// invece che una supposizione.
//
// I nomi dei colori ("blu notte", "petrolio", "burgundy") sono parole: due
// negozi possono chiamare allo stesso modo tonalità diverse. Qui li portiamo
// tutti nello spazio Lab, dove la distanza fra due colori corrisponde a
// quanto l'occhio li vede diversi — cosa che con RGB non succede.

// ── conversioni ──────────────────────────────────────────────────────

export function hexARgb(hex) {
  const h = String(hex || "").trim().replace(/^#/, "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

// sRGB → Lab (illuminante D65, osservatore 2°)
export function rgbALab({ r, g, b }) {
  const lin = (v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const R = lin(r), G = lin(g), B = lin(b);

  const X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
  const Y = R * 0.2126729 + G * 0.7151522 + B * 0.072175;
  const Z = (R * 0.0193339 + G * 0.119192 + B * 0.9503041) / 1.08883;

  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X), fy = f(Y), fz = f(Z);

  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export function hexALab(hex) {
  const rgb = hexARgb(hex);
  return rgb ? rgbALab(rgb) : null;
}

// ── distanza percettiva ──────────────────────────────────────────────

/**
 * CIEDE2000: la formula che l'occhio "approva". Più complicata della semplice
 * distanza euclidea, ma quella sbaglia parecchio sui blu e sui grigi, che in
 * un guardaroba sono metà dei capi.
 *
 * Sotto 2 la differenza è quasi invisibile; sotto 10 sono la stessa famiglia;
 * oltre 25 sono colori diversi.
 */
export function differenza(c1, c2) {
  if (!c1 || !c2) return Infinity;
  const { L: L1, a: a1, b: b1 } = c1;
  const { L: L2, a: a2, b: b2 } = c2;

  const kL = 1, kC = 1, kH = 1;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cmedia = (C1 + C2) / 2;

  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cmedia, 7) / (Math.pow(Cmedia, 7) + Math.pow(25, 7))));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;

  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);

  const gradi = (rad) => (rad * 180) / Math.PI;
  const radianti = (deg) => (deg * Math.PI) / 180;
  const angolo = (b, a) => {
    if (a === 0 && b === 0) return 0;
    const h = gradi(Math.atan2(b, a));
    return h >= 0 ? h : h + 360;
  };

  const h1p = angolo(b1, a1p);
  const h2p = angolo(b2, a2p);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp = 0;
  if (C1p * C2p !== 0) {
    const diff = h2p - h1p;
    dhp = diff > 180 ? diff - 360 : diff < -180 ? diff + 360 : diff;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(radianti(dhp) / 2);

  const Lmedia = (L1 + L2) / 2;
  const Cmediap = (C1p + C2p) / 2;

  let hmediap;
  if (C1p * C2p === 0) hmediap = h1p + h2p;
  else if (Math.abs(h1p - h2p) <= 180) hmediap = (h1p + h2p) / 2;
  else hmediap = h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2;

  const T =
    1 -
    0.17 * Math.cos(radianti(hmediap - 30)) +
    0.24 * Math.cos(radianti(2 * hmediap)) +
    0.32 * Math.cos(radianti(3 * hmediap + 6)) -
    0.2 * Math.cos(radianti(4 * hmediap - 63));

  const SL = 1 + (0.015 * Math.pow(Lmedia - 50, 2)) / Math.sqrt(20 + Math.pow(Lmedia - 50, 2));
  const SC = 1 + 0.045 * Cmediap;
  const SH = 1 + 0.015 * Cmediap * T;

  const dTheta = 30 * Math.exp(-Math.pow((hmediap - 275) / 25, 2));
  const RC = 2 * Math.sqrt(Math.pow(Cmediap, 7) / (Math.pow(Cmediap, 7) + Math.pow(25, 7)));
  const RT = -RC * Math.sin(radianti(2 * dTheta));

  return Math.sqrt(
    Math.pow(dLp / (kL * SL), 2) +
      Math.pow(dCp / (kC * SC), 2) +
      Math.pow(dHp / (kH * SH), 2) +
      RT * (dCp / (kC * SC)) * (dHp / (kH * SH)),
  );
}

// ── dai nomi dei negozi a un colore vero ─────────────────────────────

// I nomi che i negozi scrivono nel campo del colore e che qui non c'erano.
// Il vocabolario sopra parla quasi solo italiano, e i negozi scrivono «teal»,
// «lilac», «chestnut», «sapphire»: erano 6.550 capi con un nome di colore
// illeggibile, e questi ne leggono 2.232 — con la regola sugli incollati qui
// sotto scendono a 4.002, e quel che resta in cima all'elenco non è più un
// colore: «stampato», «multicolor», «fantasia», «unico», e sigle di una
// lettera.
//
// Nessuno di questi valori è indovinato. Per ogni nome ho messo la pezza di
// colore che propongo accanto a quattro foto vere del catalogo e ho guardato.
// Sui 1.213 capi dove la foto è leggibile la distanza mediana fra il nome e
// la foto è 12: è lo stesso colore.
//
// Dove le foto dicevano un'altra cosa ho creduto alle foto e non alla parola.
// «Tangerina» di Ecoalf è un ambra scuro (#A96B10, #C88D3B, #B9812A), non un
// arancio; «mirtillo» di Cosabella è un blu petrolio (#094E71, #03486B), non
// un viola; «fog» di Scotch & Soda è una sabbia calda, non un grigio; «ebony»
// di Armedangels è un marrone profondo, non un nero.
//
// E dove le foto si contraddicevano il nome non l'ho messo: «aluminium» stava
// su quattro capi tutti neri, «canna di fucile» su tre valigie rosa,
// «cappuccino» su una giacca nera e uno zaino scuro. Un nome che non sappiamo
// leggere costa un capo, che si fa misurare la foto; un nome letto male lo
// manda nella palette sbagliata, e quello lo vede chi cerca.
//
// Stanno tutti in SOLO_NEL_CAMPO, qui sotto: in un titolo sono un'altra cosa.
//
// L'effetto più grosso però non è sui nomi che non si leggevano: è su 666 che
// si leggevano già male. In inglese la sfumatura precede il generico, e senza
// «sky», «forest», «pine», «royal», «moss» in vocabolario restava solo il
// generico: «sky blue» era lo stesso blu di «midnight blue», che è il suo
// opposto. Adesso sono due colori diversi, come li vede chi guarda.
const NOMI_DAL_CAMPO = {
  // bianchi, creme e naturali
  snow: "#F5F6F6", milk: "#F2EFE7", cloud: "#DDDDDA", dove: "#B7B4AE", pearl: "#E9E4DA",
  perla: "#DEDBD3", gesso: "#EDEBE4", vanilla: "#EFE5CC", antiquewhite: "#F0E4D2",
  undyed: "#E4DCCB", unbleached: "#E4DCCB", natural: "#DDD3BF", oatmeal: "#DDD2BE",
  oatmilk: "#E4DDD0", almond: "#E5D5C0", travertine: "#C9B694", dune: "#D2BFA0", desert: "#C9B191",
  sahara: "#C6A97F", corda: "#C9B79A", nudo: "#DFC3B0", nude: "#DFC3B0",

  // grigi e neri
  ash: "#A9A9A5", fog: "#D2C3B0", mist: "#CFD3D2", cement: "#A8AFAE", pavement: "#7A7A78",
  slate: "#55606B", steel: "#767C82", iron: "#5C5F63", graphite: "#3B3E42", pewter: "#8A8D8F",
  phantom: "#2A2C30", ebony: "#503026", raven: "#2E2E31",

  // blu
  sky: "#8FBEDD", "night sky": "#1B2A41", marine: "#24405F", peacoat: "#26314A", midnight: "#14172B", sapphire: "#2A55B5",
  pacificblue: "#2E6E96", steelblue: "#3A5878", avion: "#5A7A97", "deep sea": "#17394F",
  mirtillo: "#10557A", royal: "#1F4FA8", pervinca: "#8E9BD9", turchese: "#3AAFA9",
  turquoise: "#3AAFA9", acquamarina: "#7FD4C1", aqua: "#7FD4C1",

  // verdi
  moss: "#6B7B4B", ivy: "#3E5C3A", pine: "#23503C", cypress: "#3C4F3A", forest: "#234433",
  evergreen: "#21473A", kale: "#2B4433", thyme: "#6E7A5A", seafoam: "#9CCFBE", teal: "#2E7D7B",
  military: "#4B5320", mint: "#9FD9BE", olio: "#6B6B33",

  // gialli e arancioni
  lemon: "#E3D14A", buttercup: "#E8C64A", sunflower: "#E0B830", butter: "#EDE3C8",
  banana: "#E8DCA0", curcuma: "#C99A2E", dijon: "#B5892B", mango: "#E29A34", papaya: "#E88F4E",
  melon: "#E9A06B", apricot: "#E9A87A", peach: "#F0BFA0", tangerine: "#E5772E",
  tangerina: "#C1892C", paprika: "#C4552E", brick: "#9E4B36", arancio: "#D2762F", amber: "#C4872A",
  honey: "#8A6E52", miele: "#8A6E52", "luce solare": "#E8C64A",

  // rossi e rosa
  cherry: "#C01F35", cranberry: "#93253D", raspberry: "#D63384", strawberry: "#C43048",
  fragola: "#C43048", fragolino: "#C43048", wine: "#6B2233", borgogna: "#5C1F26", bordo: "#5C1F26",
  mosto: "#6B2A38", hibiscus: "#E0455F", ibisco: "#E0455F", coral: "#EE6A72", rubino: "#A31B36",
  fiamma: "#C4392E", granita: "#D9A6B4",

  // viola
  aubergine: "#3F2A3D", lilac: "#B9A3D1", lavender: "#C3B5DB", violet: "#7A4FA3", iris: "#6A5AA8", orchid: "#B565A7",
  orchidea: "#B565A7", amethyst: "#7A4E9E", ametista: "#7A4E9E", plum: "#5C3A57", mauve: "#A5788F",
  fig: "#6B2F42",

  // marroni
  chocolate: "#4A3227", cioccolato: "#4A3227", cocoa: "#5A4632", coffee: "#4A3428",
  espresso: "#362721", mocha: "#6B4C3B", walnut: "#6B4A32", chestnut: "#7A4A32",
  cinnamon: "#A05B32", cannella: "#A05B32", clove: "#6B4230", teak: "#8A5A34", wood: "#A8794F",
  maple: "#B57F58", earth: "#6E6449", mud: "#A79A8B", clay: "#A9705A", cognac: "#8A4B26",
  havana: "#6B4830", tortoise: "#6B4A2E", bronzo: "#7A5540", raisin: "#4A2F33",
};

// I negozi scrivono il colore a parole. Questo è il vocabolario che le
// traduce. Si allarga man mano che si incontrano nomi nuovi.
export const NOMI_COLORE = {
  // neutri
  nero: "#111111", black: "#111111", bianco: "#F7F7F5", white: "#F7F7F5",
  "bianco ottico": "#FFFFFF", panna: "#F2E8D5", crema: "#EFE3CB", cream: "#EFE3CB",
  avorio: "#F1E9DA", ivory: "#F1E9DA", ecru: "#E6DCC8", burro: "#EDE3C8",
  grigio: "#8A8A8A", grey: "#8A8A8A", gray: "#8A8A8A",
  "grigio chiaro": "#C6C6C6", "grigio scuro": "#4A4A4A", antracite: "#3A3D40",
  argento: "#C0C0C0", tortora: "#B3A79A", talpa: "#8C8177",
  beige: "#D6C6AE", sabbia: "#DCCDB0", sand: "#DCCDB0", cammello: "#B98F5E",
  camel: "#B98F5E", kaki: "#9A8F6B", khaki: "#9A8F6B", fango: "#7C6F5E",

  // blu
  blu: "#25406E", blue: "#25406E", navy: "#1B2A47", "blu navy": "#1B2A47",
  "blu notte": "#1B2A41", "blu scuro": "#1E2E4F", "blu chiaro": "#7FA5CC",
  azzurro: "#7EB2DD", celeste: "#A8CDE5", denim: "#4A6D93", indaco: "#2E3F6B",
  avio: "#5A7A97", petrolio: "#1F4E5F", ottanio: "#1F5F63", cobalto: "#1B4FA0",

  // verdi
  verde: "#3B6B45", green: "#3B6B45", "verde scuro": "#26432E",
  "verde chiaro": "#8FBF7F", "verde militare": "#4B5320", militare: "#4B5320",
  salvia: "#9AA88B", sage: "#9AA88B", oliva: "#6B6B33", olive: "#6B6B33",
  bosco: "#22402C", menta: "#A9D9C4", smeraldo: "#128A5E", pistacchio: "#B5CC8E",

  // rossi e rosa
  rosso: "#A82C2C", red: "#A82C2C", bordeaux: "#5C1F26", burgundy: "#5C1F26",
  vinaccia: "#6B2233", amaranto: "#8B2942", corallo: "#E36A5A",
  rosa: "#E0A6B4", pink: "#E0A6B4", "rosa antico": "#C58D93",
  cipria: "#D9B8B0", "rosa cipria": "#D9B8B0", fucsia: "#C2286E", fuchsia: "#C2286E", magenta: "#B5297E",
  salmone: "#E8A08A", pesca: "#F0BFA0",

  // gialli e arancioni
  giallo: "#D9B23A", yellow: "#D9B23A", senape: "#B8912F", mustard: "#B8912F",
  ocra: "#B98B32", oro: "#C2A14D", gold: "#C2A14D",
  arancione: "#D2762F", orange: "#D2762F", ruggine: "#A85231", rust: "#A85231",
  terracotta: "#B5654A", mattone: "#9E4B36", zucca: "#C96A2B",

  // marroni
  marrone: "#6B4A32", brown: "#6B4A32", cacao: "#5A4632", moka: "#5B463A",
  testa_di_moro: "#3E2B22", "testa di moro": "#3E2B22", moro: "#3E2B22",
  cuoio: "#8A5A32", tabacco: "#7A5230", nocciola: "#A67B52", caffe: "#4A3428",

  // viola
  viola: "#6B4A8A", purple: "#6B4A8A", lilla: "#B9A3D1", lavanda: "#C3B5DB",
  prugna: "#5C3A57", melanzana: "#3F2A3D", glicine: "#A99BC9",

  // I nomi che i negozi usano davvero e che qui non c'erano. Trentottomila
  // capi hanno il colore scritto nel campo apposta, e di undicimila non
  // sapevamo leggere il nome: quelli finivano a farsi misurare la foto, che
  // sul capo giusto funziona e su un orecchino misura lo sfondo.
  //
  // Questi valori non sono la media delle foto — l'ho provata, e dà «silver»
  // marrone e «bronze» quasi bianco, perché la media non sa distinguere il
  // capo dalla pelle e dal muro. Li ho guardati: una foto per nome, e quattro
  // dove il nome era ambiguo. Mandorla da Yamamay è avorio, non marrone.
  // Hazelnut è un nude chiaro. Asphalt di Ecoalf è grigio scuro (l'unica
  // scarpa verde è l'eccezione). Carta da zucchero è azzurro polvere.
  silver: "#B9BCC0", asphalt: "#45484C", charcoal: "#3F4247", anthracite: "#3A3D40",
  carbon: "#23262B", meteorite: "#1F1F22", storm: "#6B7280", blacksms: "#111111",
  stone: "#D8CCBE", bone: "#E2E0D8", sandstone: "#DCCFC0", "soft vanilla": "#EFE7D6",
  eggnog: "#EFE4D2", mandorla: "#EDE2D2", shell: "#EFE0D6", champagne: "#E3CDB4",
  hazelnut: "#C9A489", taupe: "#A6998C", tan: "#BE9463", caramel: "#A96C3C",
  bronze: "#7A5540", henna: "#8A4B32",
  blush: "#E0A79B", "rose wood": "#C9A0A0", rose: "#E0A6B4", gelso: "#9B2D5E", rubino: "#A31B36",
  "carta da zucchero": "#8AA5CE", skyblue: "#7EB2DD", darkblue: "#1E2E4F", bluette: "#3A6BAD",
  "sky captain": "#26314A", indigo: "#2E3F6B",
  seaweed: "#7D8A76", greenshadow: "#2E5A52", scarab: "#234B39", lime: "#D7EA45",

  ...NOMI_DAL_CAMPO,
};

// Il denim e il cuoio qui dentro sono un tessuto prima che un colore: il loro
// colore vale solo dove il capo non ne dichiara nessun altro. "DENIM SLIM FIT
// NERO" è un jeans nero, e usciva blu perché «denim» viene prima.
const MATERIALI = new Set(["denim", "cuoio"]);

// E certi nomi sono un colore solo dove il negozio scrive i colori. Nel campo
// «Shell» è un nude, «Silver» un grigio chiaro, «Rose» un rosa e «Stone» un
// beige; dentro un titolo la shell jacket è una giacca, i gemelli d'argento
// sono di metallo, le rose sono un disegno sulla stoffa e lo stone washed è un
// lavaggio. Sono 1.245 titoli in catalogo, e li facevano sbagliare tutti.
const SOLO_NEL_CAMPO = new Set(["shell", "silver", "rose", "stone", ...Object.keys(NOMI_DAL_CAMPO)]);

// I colori di base, nelle due lingue in cui i negozi scrivono i nomi. La
// distinzione serve per l'ordine delle parole, che le due lingue hanno
// opposto: in italiano la sfumatura SEGUE il generico — "verde bosco",
// "grigio antracite" — e in inglese lo PRECEDE — "olive green", "powder pink".
// Quindi dopo un generico italiano quello che segue è una sfumatura, e dopo un
// generico inglese è un secondo colore: "Black Sand" è una scarpa nera e
// sabbia, non un nero sabbioso.
const BASE_ITALIANO = new Set(["nero", "bianco", "grigio", "blu", "verde", "rosso", "rosa", "giallo", "marrone", "viola", "arancione"]);
const BASE_INGLESE = new Set(["black", "white", "grey", "gray", "blue", "green", "red", "pink", "yellow", "brown", "purple", "orange", "navy", "ivory", "cream", "sand", "sage", "stone"]);

// Una barra, un trattino o una congiunzione fra due colori vogliono dire due
// colori, e il primo è quello che domina: "Black/Ivory" è una scarpa nera e
// avorio, non un avorio scuro. Senza questa distinzione la normalizzazione
// cancellava i separatori e "black ivory" diventava indistinguibile da
// "verde bosco".
const SEPARATORE = /[/,+|]|\s-\s|-|\s(?:and|con|with|y|und|en)\s/;

// In italiano il colore si accorda con il capo — "blusa bianca", "jeans
// azzurri", "tuta nera" — e il vocabolario conosce solo il maschile singolare:
// milleseicento capi non davano nessun colore per questo. Le forme si
// riportano al maschile prima di cercare, e solo per gli otto colori che in
// italiano si accordano davvero: verde, blu, rosa, viola e marrone non
// cambiano, e una lista corta non può inventare parole che non esistono.
const ACCORDI = new Map();
for (const [maschile, forme] of [
  ["nero", "nera nere neri"], ["bianco", "bianca bianche bianchi"], ["rosso", "rossa rosse rossi"],
  ["giallo", "gialla gialle gialli"], ["grigio", "grigia grigie grigi"], ["azzurro", "azzurra azzurre azzurri"],
  ["scuro", "scura scure scuri"], ["chiaro", "chiara chiare chiari"],
]) for (const forma of forme.split(" ")) ACCORDI.set(forma, maschile);

const senzaAccenti = (testo) => String(testo).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const alMaschile = (testo) => testo.split(" ").map((parola) => ACCORDI.get(parola) || parola).join(" ");
const soloParole = (testo) => testo.replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();

// Tutti i nomi di colore dentro un pezzo di testo, i più lunghi per primi:
// quelli sono i più precisi di tutti, perché li abbiamo scritti apposta.
function agganci(testo) {
  const parole = alMaschile(testo).split(" ");
  const trovati = [];
  for (let n = Math.min(3, parole.length); n >= 1; n--) {
    for (let i = 0; i + n <= parole.length; i++) {
      const pezzo = parole.slice(i, i + n).join(" ");
      if (NOMI_COLORE[pezzo]) trovati.push({ pezzo, n, i });
    }
  }
  return trovati;
}

function scegli(testo, nelCampo) {
  const trovati = agganci(testo).filter((t) => nelCampo || !SOLO_NEL_CAMPO.has(t.pezzo));
  if (!trovati.length) return null;

  const colori = trovati.filter((t) => !MATERIALI.has(t.pezzo));
  const fra = colori.length ? colori : trovati;

  if (nelCampo) {
    const generico = fra.find((t) => t.n === 1 && BASE_ITALIANO.has(t.pezzo));
    const sfumatura = generico
      && fra.find((t) => t.i > generico.i && t.n === 1 && !BASE_ITALIANO.has(t.pezzo) && !BASE_INGLESE.has(t.pezzo));
    if (sfumatura) return NOMI_COLORE[sfumatura.pezzo];
  }
  return NOMI_COLORE[fra[0].pezzo];
}

function leggi(testo, nelCampo) {
  if (!testo) return null;
  const grezzo = senzaAccenti(testo);
  const intero = soloParole(grezzo);
  if (!intero) return null;

  // Il nome per intero, prima di tutto: "blu notte" è in vocabolario. Anche
  // qui però le parole del campo restano del campo: un titolo che è solo
  // «Coral» o solo «Bordo» non basta a farne un colore.
  const perIntero = (t) => (NOMI_COLORE[t] && (nelCampo || !SOLO_NEL_CAMPO.has(t)) ? NOMI_COLORE[t] : null);
  if (perIntero(intero)) return perIntero(intero);
  if (perIntero(alMaschile(intero))) return perIntero(alMaschile(intero));

  for (const pezzo of grezzo.split(SEPARATORE)) {
    const pulito = soloParole(pezzo);
    if (!pulito) continue;
    const colore = scegli(pulito, nelCampo);
    if (colore) return colore;
  }

  // Ultimo tentativo, e solo nel campo che il negozio riempie: certi negozi
  // il nome del colore lo scrivono attaccato a un codice — «blacksms»,
  // «darkbluesms», «whitesms» — o incollano due colori senza spazio:
  // «blackwhite», «sagegreen», «blueindigo». Sono 326 capi che restavano
  // senza nessun colore, cioè invisibili alla ricerca per palette.
  //
  // Si arriva qui solo quando tutto il resto ha già fallito, ed è la
  // condizione che lo rende sicuro: un nome che si legge per intero non
  // viene mai spezzato, e «verde bosco» resta bosco.
  //
  // In un titolo non si fa: spezzare le parole di una frase è un invito a
  // sbagliare, e «blackout» non è nero.
  return nelCampo ? incollato(intero) : null;
}

// Quanto è acceso un colore non è un colore, e nemmeno com'è filato il
// tessuto: «darknavy» è il navy, «greymelange» il grigio, «stonewash» lo
// stone. Sono 316 capi con la parola incollata davanti o dietro alla tinta.
const GRADI = ["dark", "light", "deep", "pale", "soft", "bright", "hot", "dusty", "vintage", "old",
  "burned", "burnt", "summer", "winter", "pure", "antique", "clean", "strong", "warm", "medium", "rich"];
const FINITURE = ["melange", "heather", "marl", "chine", "washed", "wash", "bleached", "dyed"];

function incollato(nome) {
  const compatto = nome.replace(/\s+/g, "").replace(/sms$/, "");
  if (NOMI_COLORE[compatto]) return NOMI_COLORE[compatto];

  // Si toglie il grado o la finitura solo se quello che resta è davvero un
  // colore: così «lightning» non diventa una luce e «darkness» un buio.
  for (const grado of GRADI) {
    if (compatto.startsWith(grado) && NOMI_COLORE[compatto.slice(grado.length)]) {
      return NOMI_COLORE[compatto.slice(grado.length)];
    }
  }
  for (const finitura of FINITURE) {
    if (compatto.endsWith(finitura) && NOMI_COLORE[compatto.slice(0, -finitura.length)]) {
      return NOMI_COLORE[compatto.slice(0, -finitura.length)];
    }
  }

  // Due colori attaccati: vale il primo, come per due colori separati da una
  // barra — «blackwhite» è una scarpa nera e bianca, e a dominare è il nero.
  // Tre lettere è il pezzo più corto che accettiamo: sotto, si spezzerebbero
  // parole a caso.
  for (let i = 3; i <= compatto.length - 3; i++) {
    const primo = compatto.slice(0, i);
    if (NOMI_COLORE[primo] && NOMI_COLORE[compatto.slice(i)]) return NOMI_COLORE[primo];
  }
  return null;
}

/**
 * Il colore dal campo che il negozio riempie apposta ("Verde bosco", "BLU
 * NOTTE / F"). È il nome di UN colore, quindi qui le sfumature si leggono.
 */
export function coloreDaNome(nome) {
  return leggi(nome, true);
}

/**
 * Il colore pescato da un titolo, quando il negozio il campo non l'ha
 * riempito. Un titolo è una frase: i colori possono essere due, o far parte
 * di una marca — "Sneakers Blu Marina Militare" è la marca, non un verde
 * militare. Qui vale il primo colore e basta.
 */
export function coloreNelTitolo(titolo) {
  return leggi(titolo, false);
}

/**
 * Questo colore, misurato su una foto, è il muro dello studio?
 *
 * Su un paio di gemelli, una cravatta o un paio di occhiali la foto è quasi
 * tutta fondale, e quello che ne esce è il bianco della carta — o il nero di
 * un'estrazione fallita. Sono 8.394 capi su 33.533 misurati.
 *
 * Guardate ventiquattro di quelle foto una per una, accanto al colore che il
 * titolo dichiarava, il titolo vince venti volte e non perde mai: gemelli
 * neri, décolleté neri, chino neri, una t-shirt verde scuro — tutti bianchi
 * secondo la foto.
 *
 * La soglia è stretta apposta. Un capo bianco panna ha una tinta (e non
 * passa di qui), un nero vero non arriva a zero. Sbagliare da questa parte
 * costa poco — si tiene il colore misurato, che è quello di prima —
 * sbagliare dall'altra toglie il colore a un capo che ce l'ha.
 */
export function sembraIlFondale(hex) {
  const lab = hexALab(hex);
  if (!lab) return false;
  const tinta = Math.hypot(lab.a, lab.b);
  // Il nero è quasi tutto tessuto e quasi niente muro, quindi la soglia da
  // quella parte è strettissima: un capo nero fotografato sta fra L 6 e 15,
  // perché la stoffa un po' di luce la rende. Sotto 4 non è un nero, è
  // un'estrazione fallita — sono i #000000 tondi tondi, 1.059 capi. Con la
  // soglia a 8 ci finiva dentro anche il nero del vocabolario, che è L 5,4.
  return (lab.L > 90 && tinta < 5) || (lab.L < 4 && tinta < 5);
}

// Il capo più vicino a un colore della palette, fra tanti.
export function piuVicini(coloreLab, capi, { quanti = 12, soglia = 28 } = {}) {
  return capi
    .map((capo) => ({
      capo,
      distanza: differenza(coloreLab, { L: capo.colore_l, a: capo.colore_a, b: capo.colore_b }),
    }))
    .filter((x) => Number.isFinite(x.distanza) && x.distanza <= soglia)
    .sort((a, b) => a.distanza - b.distanza)
    .slice(0, quanti);
}
