"use client";

import { rgbALab } from "@/lib/colore";

// Legge come sei vestito nella foto a figura intera.
//
// È la prima cosa che fa uno stylist: non ti chiede che stile hai, ti guarda.
// E quello che si vede da una foto, senza bisogno di riconoscere i capi, sono
// tre cose che dicono già molto — quanto colore porti addosso, quanto sei
// contrastato, e se stai sui neutri o sulle tinte.
//
// Gira nel browser come tutto il resto: la foto non esce dal dispositivo.

function sembraPelle({ L, a, b }) {
  if (L < 15 || L > 96) return false;
  if (a < 3 || a > 28) return false;
  if (b < 6 || b > 42) return false;
  const tinta = (Math.atan2(b, a) * 180) / Math.PI;
  return tinta > 20 && tinta < 78;
}

function caricaImmagine(dataUrl) {
  return new Promise((risolvi, rifiuta) => {
    const img = new Image();
    img.onload = () => risolvi(img);
    img.onerror = rifiuta;
    img.src = dataUrl;
  });
}

/**
 * @returns { saturazione, contrasto, luminosita, neutri, colori } oppure null
 */
export async function leggiVestiti(dataUrl) {
  if (!dataUrl) return null;

  let dati, lato;
  try {
    const img = await caricaImmagine(dataUrl);
    lato = 84;
    const canvas = document.createElement("canvas");
    canvas.width = lato;
    canvas.height = lato;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, lato, lato);
    dati = ctx.getImageData(0, 0, lato, lato).data;
  } catch {
    return null;
  }

  // I vestiti stanno sotto la testa e dentro la sagoma: si guarda la fascia
  // centrale dal petto in giù, saltando i bordi che sono quasi sempre sfondo.
  const vestiti = [];
  for (let y = 0; y < lato; y++) {
    for (let x = 0; x < lato; x++) {
      const fx = x / lato;
      const fy = y / lato;
      if (fy < 0.26 || fy > 0.94) continue; // testa e piedi
      if (fx < 0.28 || fx > 0.72) continue; // sfondo ai lati
      const i = (y * lato + x) * 4;
      if (dati[i + 3] < 200) continue;
      const lab = rgbALab({ r: dati[i], g: dati[i + 1], b: dati[i + 2] });
      if (sembraPelle(lab)) continue; // braccia, collo, décolleté
      vestiti.push(lab);
    }
  }

  if (vestiti.length < 200) return null;

  const croma = vestiti.map((p) => Math.hypot(p.a, p.b));
  const luci = vestiti.map((p) => p.L).sort((x, y) => x - y);

  const media = (v) => v.reduce((s, x) => s + x, 0) / v.length;
  const percentile = (v, q) => v[Math.min(v.length - 1, Math.floor(v.length * q))];

  return {
    // Quanto colore porti addosso. Sotto 12 è un guardaroba di neutri.
    saturazione: Math.round(media(croma)),
    // Quanto sono distanti fra loro il capo più chiaro e il più scuro:
    // un total black è basso, bianco-e-nero è altissimo.
    contrasto: Math.round(percentile(luci, 0.9) - percentile(luci, 0.1)),
    luminosita: Math.round(media(luci)),
    neutri: media(croma) < 12,
    campioni: vestiti.length,
  };
}

/**
 * Da come sei vestito, quali stili ti somigliano.
 *
 * Non è indovinare il tuo stile dalle forme — per quello servirebbe un modello
 * che riconosce i capi. È leggere le TUE abitudini di colore, che sono già un
 * dato: chi va in giro tutto nero non è una persona da Cottagecore, e
 * proporglielo lo farebbe chiudere l'app.
 */
export function stiliDaiVestiti(lettura) {
  if (!lettura) return null;

  const { saturazione, contrasto, luminosita, neutri } = lettura;

  if (neutri && luminosita < 45) {
    return {
      chiave: "vestitiScuri",
      motivo: "Nella tua foto porti neutri scuri: è già una scelta precisa, e questi stili la portano avanti invece di ribaltarla.",
      lista: ["Total black", "Urbano notturno", "Milanese", "New York minimal", "Monocromatico",
              "Techwear", "Sartoriale italiano", "Minimal"],
    };
  }

  if (neutri) {
    return {
      chiave: "vestitiNeutri",
      motivo: "Nella foto stai sui neutri: chi si veste così di solito cerca capi che durino, non che si notino.",
      lista: ["Quiet luxury / Old money", "Capsule wardrobe", "Scandi", "Minimal",
              "Uniform dressing", "Tessuti naturali", "Normcore", "Linee morbide"],
    };
  }

  if (saturazione >= 26) {
    return {
      chiave: "vestitiAccesi",
      motivo: "Nella foto porti colori pieni: non sei una persona da guardaroba beige, e questi stili lo assecondano.",
      lista: ["Colour blocking", "Maximalista", "Y2K", "Anni 70 / Disco", "Artsy",
              "Eclettico", "Tropicale", "Glam / Serata"],
    };
  }

  if (contrasto >= 46) {
    return {
      chiave: "vestitiContrastati",
      motivo: "Nella foto accosti chiaro e scuro con decisione: questi stili sono costruiti proprio su quello.",
      lista: ["Linee nette", "Preppy", "Anni 60 / Mod", "Rock / Edgy", "Classico",
              "Business / Formale", "Blokecore"],
    };
  }

  return {
    chiave: "vestitiMorbidi",
    motivo: "Nella foto tieni toni vicini fra loro, senza stacchi forti: questi stili lavorano allo stesso modo.",
    lista: ["Linee morbide", "Casual", "Smart casual", "Coastal / Riviera", "Bohémien",
            "Clean girl", "Light academia", "Loungewear / Comfort"],
  };
}
