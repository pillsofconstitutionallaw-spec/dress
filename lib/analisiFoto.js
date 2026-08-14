"use client";

import { rgbALab } from "@/lib/colore";
import { STAGIONI, stagioneDa } from "@/lib/stagioni";
import { combina, esitoDelTest } from "@/lib/testArmocromia";

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

/**
 * Corregge la dominante di colore della luce.
 *
 * È il passaggio che decide tutto. Una lampadina di casa butta giallo su
 * ogni cosa: senza correggerlo, misuriamo il giallo della lampadina e lo
 * scambiamo per il sottotono della pelle, e un tipo freddo viene classificato
 * caldo. È l'errore che rende inservibile l'armocromia fatta da foto.
 *
 * Metodo: si cercano i pixel che nella realtà DEVONO essere neutri — i più
 * chiari e i meno colorati della foto: il bianco degli occhi, una parete, una
 * camicia bianca — e si calcola di quanto la luce li ha spostati. Poi si
 * riporta indietro tutta l'immagine della stessa quantità.
 */
function correggiLuce(rgb) {
  // Candidati neutri: chiari, e con i tre canali già vicini fra loro.
  const candidati = rgb.filter(({ r, g, b }) => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return max > 150 && max < 252 && max - min < 42;
  });

  if (candidati.length < 30) return { fattori: { r: 1, g: 1, b: 1 }, affidabile: false };

  // Il quinto più chiaro fra i candidati: è quello che nella realtà è bianco.
  const ordinati = [...candidati].sort((x, y) => (y.r + y.g + y.b) - (x.r + x.g + x.b));
  const bianchi = ordinati.slice(0, Math.max(20, Math.round(ordinati.length * 0.2)));

  const media = ["r", "g", "b"].map((c) => bianchi.reduce((s, p) => s + p[c], 0) / bianchi.length);
  const grigio = (media[0] + media[1] + media[2]) / 3;

  // Correzione limitata: se la foto è davvero monocroma non vogliamo
  // inventarci colori che non ci sono.
  const limita = (f) => Math.min(1.35, Math.max(0.74, f));

  return {
    fattori: { r: limita(grigio / media[0]), g: limita(grigio / media[1]), b: limita(grigio / media[2]) },
    affidabile: true,
    dominante: Math.round(Math.max(...media) - Math.min(...media)),
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

  // Prima si raccolgono i colori grezzi, poi si corregge la luce, e solo
  // dopo si passa in Lab: correggere dopo la conversione non funzionerebbe.
  const grezzi = [];
  for (let y = 0; y < lato; y++) {
    for (let x = 0; x < lato; x++) {
      const i = (y * lato + x) * 4;
      if (dati[i + 3] < 200) continue;
      grezzi.push({ x: x / lato, y: y / lato, r: dati[i], g: dati[i + 1], b: dati[i + 2] });
    }
  }

  const luce = correggiLuce(grezzi);
  const f = luce.fattori;
  const limite = (v) => Math.min(255, Math.max(0, v));

  return {
    pixel: grezzi.map((p) => ({
      x: p.x,
      y: p.y,
      ...rgbALab({ r: limite(p.r * f.r), g: limite(p.g * f.g), b: limite(p.b * f.b) }),
    })),
    luce,
  };
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

  let pixel, luce;
  try {
    ({ pixel, luce } = pixelDa(await caricaImmagine(dataUrl)));
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
    luce,
    campioni: { pelle: pelleCandidata.length, capelli: scuri.length },
  };
}

// Quando i capelli sono dichiarati a parole, valgono più di una misura presa
// da una foto con la luce sbagliata: chi risponde "biondi" lo sa meglio di noi.
const LUCE_CAPELLI = {
  Neri: 18, "Castano scuro": 30, "Castano chiaro": 46, Biondi: 68,
  Rossi: 42, "Grigi / Sale e pepe": 62, Bianchi: 84, Colorati: null,
};

// Occhi e capelli sono indizi forti sul sottotono, e sono DICHIARATI: non
// dipendono dalla luce della stanza. Un consulente li guarda per primi.
// Positivo = caldo, negativo = freddo.
const INDIZIO_OCCHI = {
  Azzurri: -2.4, Grigi: -2.2, Verdi: -1.1, Nocciola: 0.8, Marroni: 0.9, Ambra: 1.8,
};
const INDIZIO_CAPELLI = {
  Neri: -0.8, "Castano scuro": -0.3, "Castano chiaro": 0.5, Biondi: 0.7,
  Rossi: 2.0, "Grigi / Sale e pepe": -1.2, Bianchi: -1.4, Colorati: 0,
};

/**
 * Caldo o freddo.
 *
 * Non dal giallo assoluto della pelle — che dipende troppo da luce e
 * abbronzatura — ma dall'INCLINAZIONE del colore: quanto rosa c'è rispetto al
 * giallo. È l'angolo di tinta, ed è la misura che regge anche quando la foto
 * non è perfetta.
 *
 * Poi si incrociano gli indizi dichiarati. Occhi azzurri e capelli neri sono
 * un tipo freddo anche se la foto è stata scattata sotto una lampadina gialla:
 * quando la misura e i dichiarati litigano, non vince la misura per forza.
 */
function decidiSottotono({ pelle, profile, luceAffidabile }) {
  const angolo = (Math.atan2(pelle.b, pelle.a) * 180) / Math.PI;

  // Sotto i 48° la pelle tira al rosa, sopra i 55° al giallo. In mezzo la
  // misura da sola non decide, e comandano gli indizi.
  let punteggio = 0;
  if (angolo < 48) punteggio -= 2.2;
  else if (angolo > 55) punteggio += 2.2;
  else punteggio += (angolo - 51.5) / 1.6;

  // Se la luce non era correggibile, la misura pesa la metà.
  if (!luceAffidabile) punteggio *= 0.5;

  punteggio += INDIZIO_OCCHI[profile.eyes] ?? 0;
  punteggio += INDIZIO_CAPELLI[profile.hair] ?? 0;

  return {
    sottotono: punteggio >= 0 ? "caldo" : "freddo",
    // Quanto siamo sicuri: serve a dire all'utente se il caso è al limite.
    certezza: Math.min(1, Math.abs(punteggio) / 4),
    angolo: Math.round(angolo),
  };
}

/**
 * L'analisi completa: dalla foto e dai dati dichiarati alla stagione e ai
 * cinque colori. Funziona anche senza foto, con i soli dati del questionario.
 */
export async function analizzaColori({ profile = {}, closeup = null, correzione = null, testRisposte = null } = {}) {
  const misura = closeup ? await misuraDaFoto(closeup) : null;

  // Senza foto leggibile si usa quello che la persona ha dichiarato: meno
  // preciso, ma un risultato onesto è meglio di un rifiuto.
  const luceCapelliDichiarata = LUCE_CAPELLI[profile.hair] ?? null;

  const pelle = misura?.pelle || { L: 66, a: 12, b: 19 };
  const luceCapelli = luceCapelliDichiarata ?? misura?.capelli?.L ?? 34;
  const contrasto = Math.abs(pelle.L - luceCapelli);

  const tono = decidiSottotono({
    pelle,
    profile,
    luceAffidabile: Boolean(misura?.luce?.affidabile),
  });

  // Le domande dell'armocromista pesano più della foto: riguardano come
  // reagisci alla luce nella vita, non come sei venuto in uno scatto.
  const test = esitoDelTest(testRisposte || {});
  const unito = combina({
    testEsito: test,
    misuraSottotono: tono.sottotono,
    misuraCertezza: tono.certezza,
  });

  // E chi si corregge a mano comanda su tutto: nessuna misura vale quanto
  // una persona che si guarda allo specchio.
  const sottotono = correzione?.sottotono || unito.sottotono;

  const stagione = stagioneDa({
    sottotono: sottotono === "caldo" ? 25 : 8,
    luce: correzione?.luce ?? pelle.L,
    contrasto: correzione?.contrasto ?? contrasto,
  });
  const dati = STAGIONI[stagione];

  return {
    season: stagione,
    descrizione: dati.descrizione,
    palette: dati.palette,
    misura: {
      sottotono,
      daTest: Boolean(test),
      testConcorde: unito.concordi,
      fonteSottotono: correzione?.sottotono ? "tua correzione" : unito.fonte,
      certezza: Number(tono.certezza.toFixed(2)),
      angolo: tono.angolo,
      luminosita: Math.round(pelle.L),
      contrasto: Math.round(contrasto),
      daFoto: Boolean(misura),
      luceCorretta: Boolean(misura?.luce?.affidabile),
      dominante: misura?.luce?.dominante ?? null,
      corretta: Boolean(correzione?.sottotono),
    },
    fonte: misura ? "foto" : "questionario",
  };
}
