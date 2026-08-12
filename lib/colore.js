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
  cipria: "#D9B8B0", "rosa cipria": "#D9B8B0", fucsia: "#C2286E", magenta: "#B5297E",
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
};

// Normalizza un nome ("BLU NOTTE / F", "Verde Militare") e lo cerca nel
// vocabolario, prima intero e poi per parole.
export function coloreDaNome(nome) {
  if (!nome) return null;
  const pulito = String(nome)
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!pulito) return null;

  if (NOMI_COLORE[pulito]) return NOMI_COLORE[pulito];

  // "blu notte melange" → prova "blu notte", poi "blu"
  const parole = pulito.split(" ");
  for (let n = Math.min(3, parole.length); n >= 1; n--) {
    for (let i = 0; i + n <= parole.length; i++) {
      const pezzo = parole.slice(i, i + n).join(" ");
      if (NOMI_COLORE[pezzo]) return NOMI_COLORE[pezzo];
    }
  }
  return null;
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
