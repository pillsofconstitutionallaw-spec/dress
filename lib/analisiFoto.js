"use client";

import { rgbALab } from "@/lib/colore";
import { STAGIONI, stagioneDa } from "@/lib/stagioni";

// Il motore di analisi di Dress.
//
// Legge la foto, misura il colore della pelle e dei capelli, e da lì ricava
// la stagione armocromatica. Nessun modello linguistico, nessuna chiave,
// nessun credito: sono tre numeri e una tabella.
//
// Gira nel browser. La foto non lascia il dispositivo — cosa che nessuna
// analisi fatta da un servizio esterno potrà mai promettere.

// La pelle umana, di qualunque colore, occupa una zona ristretta e nota dello
// spazio Lab: tinta fra il rosso e l'arancio, mai verde o blu. È questo che
// permette di riconoscerla senza cercare un volto.
function sembraPelle({ L, a, b }) {
  if (L < 15 || L > 96) return false;
  if (a < 3 || a > 28) return false;
  if (b < 6 || b > 42) return false;
  const tinta = (Math.atan2(b, a) * 180) / Math.PI;
  return tinta > 20 && tinta < 78;
}

function mediana(valori) {
  const v = [...valori].sort((x, y) => x - y);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

function riassumi(pixel) {
  if (!pixel.length) return null;
  return {
    L: mediana(pixel.map((p) => p.L)),
    a: mediana(pixel.map((p) => p.a)),
    b: mediana(pixel.map((p) => p.b)),
  };
}

// Disegna la foto piccola e restituisce i pixel, con la posizione.
function pixelDa(immagine, lato = 96) {
  const canvas = document.createElement("canvas");
  canvas.width = lato;
  canvas.height = lato;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(immagine, 0, 0, lato, lato);
  const dati = ctx.getImageData(0, 0, lato, lato).data;

  const fuori = [];
  for (let y = 0; y < lato; y++) {
    for (let x = 0; x < lato; x++) {
      const i = (y * lato + x) * 4;
      if (dati[i + 3] < 200) continue;
      fuori.push({
        x: x / lato,
        y: y / lato,
        ...rgbALab({ r: dati[i], g: dati[i + 1], b: dati[i + 2] }),
      });
    }
  }
  return fuori;
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
 * Misura pelle e capelli da un primo piano.
 * Ritorna null se la foto non è leggibile o non contiene abbastanza incarnato.
 */
export async function misuraDaFoto(dataUrl) {
  if (!dataUrl) return null;

  let pixel;
  try {
    pixel = pixelDa(await caricaImmagine(dataUrl));
  } catch {
    return null;
  }

  // La pelle: si cerca nella fascia centrale, dove in un primo piano sta il
  // viso. I bordi sono sfondo, capelli, vestiti.
  const centrali = pixel.filter((p) => p.x > 0.25 && p.x < 0.75 && p.y > 0.22 && p.y < 0.82);
  const pelleCandidata = centrali.filter(sembraPelle);
  if (pelleCandidata.length < centrali.length * 0.08) return null; // troppo poco viso

  const pelle = riassumi(pelleCandidata);

  // I capelli: nella fascia alta, e sono la parte più scura che NON è pelle.
  // Si prende il quarto più scuro, così una ciocca chiara non falsa tutto.
  const alto = pixel.filter((p) => p.y < 0.42 && !sembraPelle(p));
  const scuri = [...alto].sort((x, y) => x.L - y.L).slice(0, Math.max(12, Math.round(alto.length * 0.25)));
  const capelli = riassumi(scuri) || { L: pelle.L - 25, a: pelle.a, b: pelle.b };

  return {
    pelle,
    capelli,
    contrasto: Math.abs(pelle.L - capelli.L),
    campioni: { pelle: pelleCandidata.length, capelli: scuri.length },
  };
}

// Quando i capelli sono dichiarati a parole, valgono più di una misura presa
// da una foto con la luce sbagliata: chi risponde "biondi" lo sa meglio di noi.
const LUCE_CAPELLI = {
  Neri: 18, "Castano scuro": 30, "Castano chiaro": 46, Biondi: 68,
  Rossi: 42, "Grigi / Sale e pepe": 62, Bianchi: 84, Colorati: null,
};

/**
 * L'analisi completa: dalla foto e dai dati dichiarati alla stagione e ai
 * cinque colori. Funziona anche senza foto, con i soli dati del questionario.
 */
export async function analizzaColori({ profile = {}, closeup = null } = {}) {
  const misura = closeup ? await misuraDaFoto(closeup) : null;

  // Senza foto leggibile si usa quello che la persona ha dichiarato: meno
  // preciso, ma un risultato onesto è meglio di un rifiuto.
  const luceCapelliDichiarata = LUCE_CAPELLI[profile.hair] ?? null;

  const pelle = misura?.pelle || { L: 66, a: 12, b: 19 };
  const luceCapelli = luceCapelliDichiarata ?? misura?.capelli?.L ?? 34;
  const contrasto = Math.abs(pelle.L - luceCapelli);

  const stagione = stagioneDa({ sottotono: pelle.b, luce: pelle.L, contrasto });
  const dati = STAGIONI[stagione];

  return {
    season: stagione,
    descrizione: dati.descrizione,
    palette: dati.palette,
    misura: misura
      ? {
          sottotono: pelle.b >= 17.5 ? "caldo" : "freddo",
          luminosita: Math.round(pelle.L),
          contrasto: Math.round(contrasto),
          daFoto: true,
        }
      : { daFoto: false },
    fonte: misura ? "foto" : "questionario",
  };
}
