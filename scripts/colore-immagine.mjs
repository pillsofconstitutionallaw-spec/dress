// Legge i colori veri dalla foto del capo, invece che dal nome che gli ha
// dato il negozio.
//
// È così che le fantasie smettono di essere un problema: una camicia scozzese
// verde e blu non è "Fantasia", è verde E blu, e va trovata cercando l'uno o
// l'altro. Un capo tinta unita restituisce semplicemente un colore solo.
//
// Gira solo nell'importatore, mai nel browser: usa sharp per decodificare.

import sharp from "sharp";
import { rgbALab } from "../lib/colore.js";

// Shopify serve le immagini ridimensionate se glielo si chiede: scaricare
// 200 pixel invece di 2000 è cinquanta volte meno traffico, per loro e per noi.
function miniatura(url, lato = 200) {
  if (!url) return null;
  if (/cdn\.shopify\.com/.test(url)) return url.replace(/(\.[a-z]{3,4})(\?|$)/i, `_${lato}x$1$2`);
  return url;
}

// k-medie nello spazio Lab: raggruppa i pixel in famiglie di colore.
// In Lab e non in RGB perché è lì che "vicino" significa "sembra simile".
function raggruppa(pixel, k = 3, giri = 12) {
  if (pixel.length <= k) return pixel.map((p) => ({ ...p, peso: 1 / pixel.length }));

  // Semi presi distanziati, non a caso: due semi vicini sprecano un gruppo.
  const centri = [pixel[0]];
  while (centri.length < k) {
    let lontano = pixel[0];
    let maxDist = -1;
    for (const p of pixel) {
      const d = Math.min(...centri.map((c) => (p.L - c.L) ** 2 + (p.a - c.a) ** 2 + (p.b - c.b) ** 2));
      if (d > maxDist) { maxDist = d; lontano = p; }
    }
    centri.push(lontano);
  }

  let gruppi = [];
  for (let giro = 0; giro < giri; giro++) {
    gruppi = centri.map(() => []);
    for (const p of pixel) {
      let vicino = 0;
      let min = Infinity;
      for (let i = 0; i < centri.length; i++) {
        const c = centri[i];
        const d = (p.L - c.L) ** 2 + (p.a - c.a) ** 2 + (p.b - c.b) ** 2;
        if (d < min) { min = d; vicino = i; }
      }
      gruppi[vicino].push(p);
    }
    let fermo = true;
    for (let i = 0; i < centri.length; i++) {
      const g = gruppi[i];
      if (!g.length) continue;
      // Mediana e non media: su un tessuto lucido i riflessi bianchi e le
      // pieghe in ombra tirerebbero la media verso un colore che non esiste.
      const nuovo = { L: mediana(g, "L"), a: mediana(g, "a"), b: mediana(g, "b") };
      if (Math.abs(nuovo.L - centri[i].L) + Math.abs(nuovo.a - centri[i].a) + Math.abs(nuovo.b - centri[i].b) > 0.5) fermo = false;
      centri[i] = nuovo;
    }
    if (fermo) break;
  }

  const trovati = centri
    .map((c, i) => ({ ...c, peso: gruppi[i].length / pixel.length }))
    .filter((c) => c.peso > 0.06) // sotto il 6% è un riflesso o un bottone
    .sort((x, y) => y.peso - x.peso);

  // Nelle foto indossate una parte dei pixel è pelle, non tessuto: gli
  // incarnati stanno in una zona ristretta e riconoscibile dello spazio Lab.
  const pelle = (c) => c.L > 35 && c.L < 88 && c.a > 6 && c.a < 26 && c.b > 10 && c.b < 34;
  const senzaPelle = trovati.filter((c) => !pelle(c));

  // Grigi spenti: di solito ombra, manichino o parete. Se resta almeno un
  // colore con tinta vera, teniamo quelli.
  const base = senzaPelle.length ? senzaPelle : trovati;
  const tinta = (c) => Math.hypot(c.a, c.b);
  const colorati = base.filter((c) => tinta(c) >= 8);
  return colorati.length ? colorati : base;
}

function mediana(gruppo, campo) {
  const v = gruppo.map((p) => p[campo]).sort((x, y) => x - y);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

function labAHex({ L, a, b }) {
  // Lab → XYZ → sRGB
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const inv = (t) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787);
  const X = inv(fx) * 0.95047;
  const Y = inv(fy);
  const Z = inv(fz) * 1.08883;

  const R = X * 3.2404542 + Y * -1.5371385 + Z * -0.4985314;
  const G = X * -0.969266 + Y * 1.8760108 + Z * 0.041556;
  const B = X * 0.0556434 + Y * -0.2040259 + Z * 1.0572252;

  const gamma = (v) => {
    const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055;
    return Math.round(Math.min(255, Math.max(0, c * 255)));
  };
  return "#" + [gamma(R), gamma(G), gamma(B)].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}

/**
 * Restituisce fino a tre colori dominanti del capo, dal più presente al meno.
 * Ritorna [] se l'immagine non si legge.
 */
export async function coloriDaFoto(urlImmagine, { lato = 64 } = {}) {
  const url = miniatura(urlImmagine);
  if (!url) return [];

  let dati;
  try {
    const risposta = await fetch(url, {
      headers: { "User-Agent": "DressApp/0.1 (+https://dressapp.it)" },
      signal: AbortSignal.timeout(12000),
    });
    if (!risposta.ok) return [];
    dati = Buffer.from(await risposta.arrayBuffer());
  } catch {
    return [];
  }

  let raw, info;
  try {
    // Ritaglia il 70% centrale: nelle foto prodotto il capo sta in mezzo e i
    // bordi sono fondo bianco, che altrimenti vincerebbe sempre.
    const immagine = sharp(dati).rotate();
    const meta = await immagine.metadata();
    const lar = meta.width || lato;
    const alt = meta.height || lato;
    const risultato = await immagine
      .extract({
        left: Math.round(lar * 0.15),
        top: Math.round(alt * 0.15),
        width: Math.max(1, Math.round(lar * 0.7)),
        height: Math.max(1, Math.round(alt * 0.7)),
      })
      .resize(lato, lato, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    raw = risultato.data;
    info = risultato.info;
  } catch {
    return [];
  }

  const pixel = [];
  for (let i = 0; i < raw.length; i += info.channels) {
    const r = raw[i], g = raw[i + 1], b = raw[i + 2];
    const lab = rgbALab({ r, g, b });
    // Il fondo bianco dello studio non è il colore del capo. Scartiamo solo
    // il bianco quasi puro e privo di tinta: un capo bianco panna sopravvive.
    if (lab.L > 95 && Math.abs(lab.a) < 3 && Math.abs(lab.b) < 4) continue;
    pixel.push(lab);
  }

  if (pixel.length < 200) return []; // troppo poco per dire qualcosa

  return raggruppa(pixel, 3).map((c) => ({
    hex: labAHex(c),
    l: Number(c.L.toFixed(2)),
    a: Number(c.a.toFixed(2)),
    b: Number(c.b.toFixed(2)),
    peso: Number(c.peso.toFixed(3)),
  }));
}
