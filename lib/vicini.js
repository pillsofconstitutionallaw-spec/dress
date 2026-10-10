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
 * Un indirizzo che si può aprire, o niente.
 *
 * Quello che c'è in OpenStreetMap lo scrive chiunque: un sito senza
 * «https://» davanti diventerebbe un link dentro la nostra app, e un
 * «javascript:» diventerebbe un programma. Passa solo http e https.
 */
function linkSicuro(valore) {
  let v = String(valore || "").split(";")[0].trim();
  if (!v) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) v = `https://${v}`;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? v : null;
  } catch {
    return null;
  }
}

// I social come li scrive chi mappa: il nome nudo, con la chiocciola, o
// l'indirizzo intero. Un indirizzo intero vale solo se porta davvero lì.
const SOCIAL = [
  { nome: "Instagram", chiavi: ["contact:instagram", "instagram"], base: "https://www.instagram.com/", dominio: "instagram.com" },
  { nome: "Facebook", chiavi: ["contact:facebook", "facebook"], base: "https://www.facebook.com/", dominio: "facebook.com" },
  { nome: "TikTok", chiavi: ["contact:tiktok", "tiktok"], base: "https://www.tiktok.com/@", dominio: "tiktok.com" },
];

function socialDa(tag) {
  const trovati = [];
  for (const s of SOCIAL) {
    const grezzo = s.chiavi.map((k) => tag[k]).find(Boolean);
    const v = String(grezzo || "").split(";")[0].trim();
    if (!v) continue;
    let url = null;
    if (/^(https?:\/\/|www\.)/i.test(v) || v.includes(".com/")) {
      const link = linkSicuro(v);
      const dominio = link ? dominioDi(link) : null;
      if (dominio && (dominio === s.dominio || dominio.endsWith(`.${s.dominio}`))) url = link;
    } else {
      const nome = v.replace(/^@/, "");
      if (/^[\w.-]{1,60}$/.test(nome)) url = s.base + nome;
    }
    if (url) trovati.push({ nome: s.nome, url });
  }
  return trovati;
}

function indirizzoDa(tag) {
  // Più numeri civici, in OpenStreetMap, si separano col punto e virgola:
  // «199;200». Per strada si scrive «199/200».
  const civico = String(tag["addr:housenumber"] || "").split(";").map((x) => x.trim()).filter(Boolean).join("/");
  const via = [tag["addr:street"] || tag["addr:place"], civico].filter(Boolean).join(" ");
  const citta = [tag["addr:postcode"], tag["addr:city"]].filter(Boolean).join(" ");
  return [via, citta].filter(Boolean).join(", ") || null;
}

// Gli orari in OpenStreetMap sono scritti in una sintassi sua, in inglese:
// «Mo-Fr 09:30-20:00; Su off». Si traducono le parole, non si interpreta la
// grammatica: quella può diventare complicata quanto vuole, e un orario
// tradotto a metà è meglio di uno interpretato male.
const GIORNI = { Mo: "Lun", Tu: "Mar", We: "Mer", Th: "Gio", Fr: "Ven", Sa: "Sab", Su: "Dom", PH: "Festivi" };

function orariDa(testo) {
  const t = String(testo || "").trim();
  if (!t) return null;
  if (t === "24/7") return ["Sempre aperto"];
  return t
    .split(";")
    .map((r) =>
      r
        .trim()
        .replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, (g) => GIORNI[g])
        .replace(/\b(off|closed)\b/gi, "chiuso")
        .replace(/,(?=\d)/g, ", "),
    )
    .filter(Boolean);
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

    const sito = linkSicuro(tag.website || tag["contact:website"]);
    const telefono = String(tag.phone || tag["contact:phone"] || "").split(";")[0].trim() || null;
    puliti.push({
      id: `${e.type || "n"}${e.id}`,
      nome,
      genere: tag.shop || null,
      // Il punto del negozio, non quello di chi guarda: serve a metterlo
      // sulla mappa.
      lat,
      lon,
      indirizzo: indirizzoDa(tag),
      telefono,
      orari: orariDa(tag.opening_hours),
      sito,
      social: socialDa(tag),
      // Se un sito non ce l'ha, almeno si deve poterci arrivare.
      mappa: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=19/${lat}/${lon}`,
      // Le indicazioni le apre l'app di mappe del telefono, che sa già
      // dove sei: noi non dobbiamo passarle niente.
      indicazioni: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,
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
      for (const campo of ["sito", "inCatalogo", "indirizzo", "telefono", "orari"]) {
        if (!gemello[campo] && n[campo]) gemello[campo] = n[campo];
      }
      if (!gemello.social.length && n.social.length) gemello.social = n.social;
      continue;
    }
    tenuti.push(n);
    if (tenuti.length >= quanti) break;
  }
  return tenuti;
}
