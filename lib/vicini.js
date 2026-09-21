// I negozi di abbigliamento intorno a chi guarda.
//
// I dati vengono da OpenStreetMap e non da Google Maps. Google vuole una
// carta di credito e conta ogni richiesta: una funzione che chiede «dove
// sono i negozi» a ogni apertura di pagina diventa una bolletta, e una
// bolletta diventa una funzione che a un certo punto si spegne.
// OpenStreetMap è gratuito, e i dati ci sono davvero — misurati il
// 22 settembre 2026: sessanta negozi entro 1,2 km dal centro di Napoli,
// tutti col nome, il 45% col sito.
//
// In cambio i dati sono messi come li mette la gente: lo stesso negozio
// compare due volte — una come punto e una come contorno dell'edificio —
// metà non hanno un sito, e qualcuno non ha nemmeno il nome. Tutta la
// pulizia sta qui sotto.

import { NEGOZI } from "@/lib/ricerca";

// I raggruppamenti di OpenStreetMap che per noi sono «un negozio di vestiti».
// Non c'è "fashion": è un'etichetta che la comunità ha abbandonato anni fa e
// oggi sopravvive solo su voci vecchie e sbagliate.
export const GENERI_OSM = ["clothes", "boutique", "shoes", "fashion_accessories", "bag"];

const RAGGIO_TERRA = 6371000;
const gradi = (x) => (x * Math.PI) / 180;

/** Quanto c'è da qui a lì, in metri, sulla superficie della Terra. */
export function distanzaMetri(a, b) {
  const dLat = gradi(b.lat - a.lat);
  const dLon = gradi(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(gradi(a.lat)) * Math.cos(gradi(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAGGIO_TERRA * Math.asin(Math.sqrt(h));
}

/**
 * La posizione, arrotondata prima di uscire da qui.
 *
 * Per cercare negozi entro un chilometro non serve sapere in che stanza si
 * è. Tre decimali sono circa cento metri: abbastanza per la ricerca, non
 * abbastanza per sapere dove uno abita. Quello che non parte non si perde.
 */
export function arrotondaPosizione(posizione) {
  const lat = Number(posizione?.lat);
  const lon = Number(posizione?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat: Math.round(lat * 1000) / 1000, lon: Math.round(lon * 1000) / 1000 };
}

function dominioDi(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * È uno di quelli che importiamo ogni notte?
 *
 * È il punto di tutta la funzione. Sapere che a duecento metri c'è un negozio
 * è poco; sapere che di quel negozio abbiamo già milleduecento capi con
 * prezzi e colori, e che si possono guardare prima di uscire di casa, è
 * un'altra cosa.
 *
 * Si guarda il dominio del sito prima del nome: «Kocca» e «kocca.it» sono lo
 * stesso negozio, ma «Original Marines» e «Marines» no, e sui nomi si
 * sbaglia in fretta.
 */
function nelNostroCatalogo(nome, sito) {
  const dominio = sito ? dominioDi(sito) : null;
  if (dominio) {
    const perDominio = NEGOZI.find((n) => dominio === n.dominio || dominio.endsWith(`.${n.dominio}`));
    if (perDominio) return perDominio.nome;
  }
  const pulito = String(nome || "").trim().toLowerCase();
  return NEGOZI.find((n) => n.nome.toLowerCase() === pulito)?.nome || null;
}

/**
 * Da quello che risponde OpenStreetMap all'elenco che si può mostrare.
 *
 * @param elementi  gli "elements" della risposta Overpass
 * @param posizione da dove si sta guardando
 */
export function negoziDaOsm(elementi, posizione, { quanti = 30 } = {}) {
  const da = arrotondaPosizione(posizione);
  if (!da) return [];

  const puliti = [];
  for (const e of elementi || []) {
    const tag = e?.tags || {};
    // Un puntino che dice «negozio di abbigliamento» e nient'altro non serve
    // a nessuno: non si può cercare, non si può riconoscere, non ci si va.
    const nome = String(tag.name || "").trim();
    if (!nome) continue;

    // I contorni di edificio non hanno lat/lon loro: hanno un centro.
    const lat = Number(e.lat ?? e.center?.lat);
    const lon = Number(e.lon ?? e.center?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const sito = tag.website || tag["contact:website"] || null;
    puliti.push({
      id: `${e.type || "n"}${e.id}`,
      nome,
      genere: tag.shop || null,
      sito,
      // Se un sito non ce l'ha, almeno si deve poterci arrivare.
      mappa: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=19/${lat}/${lon}`,
      metri: Math.round(distanzaMetri(da, { lat, lon })),
      inCatalogo: nelNostroCatalogo(nome, sito),
    });
  }

  puliti.sort((a, b) => a.metri - b.metri);

  // Lo stesso negozio è spesso sia un punto sia il contorno dell'edificio:
  // due elementi, stesso nome, pochi metri di distanza. Si tiene il più
  // vicino — che essendo l'elenco già ordinato è il primo che si incontra —
  // ma solo se l'altro è lì accanto: due Zara in due quartieri diversi sono
  // due negozi, e vanno mostrati tutti e due.
  const tenuti = [];
  for (const n of puliti) {
    const gemello = tenuti.find(
      (t) => t.nome.toLowerCase() === n.nome.toLowerCase() && Math.abs(t.metri - n.metri) < 60,
    );
    if (gemello) {
      // Fra i due doppioni vince quello che porta più informazione.
      if (!gemello.sito && n.sito) gemello.sito = n.sito;
      if (!gemello.inCatalogo && n.inCatalogo) gemello.inCatalogo = n.inCatalogo;
      continue;
    }
    tenuti.push(n);
    if (tenuti.length >= quanti) break;
  }
  return tenuti;
}
