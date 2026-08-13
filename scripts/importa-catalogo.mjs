// Importa i cataloghi dei negozi nel database.
//
// Gira una volta al giorno, non a ogni richiesta dell'utente: è questo che
// rende la ricerca istantanea. Legge l'indirizzo pubblico /products.json che
// ogni negozio Shopify espone, normalizza i capi e li salva.
//
// Uso:  node scripts/importa-catalogo.mjs [nome-negozio]
//       node scripts/importa-catalogo.mjs --tutti

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { coloreDaNome, hexALab } from "../lib/colore.js";
import { coloriDaFoto } from "./colore-immagine.mjs";

const RADICE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// ── configurazione ───────────────────────────────────────────────────

const env = Object.fromEntries(
  readFileSync(path.join(RADICE, ".env.local"), "utf8")
    .split("\n")
    .filter((r) => r.includes("=") && !r.trim().startsWith("#"))
    .map((r) => [r.slice(0, r.indexOf("=")).trim(), r.slice(r.indexOf("=") + 1).trim()]),
);

const SUPABASE = env.SUPABASE_URL;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const UA = "DressApp/0.1 (catalogo; +https://dressapp.it)";

export const NEGOZI = [
  { nome: "numb-wear", host: "numb-wear.it", fast: false },
  { nome: "Luigi Fusaro", host: "www.luigifusaro.com", fast: false },
  { nome: "Fusaro Uomo", host: "fusarouomo.eu", fast: false },
  { nome: "Ernesto Casolla", host: "ernestocasolla.it", fast: false },
  { nome: "Sonny Bono", host: "sonnybono.com", fast: false },
  { nome: "Marinella", host: "www.emarinella.eu", fast: false },
  { nome: "Piazza Italia", host: "www.piazzaitalia.it", fast: true },
];

// ── lettura del catalogo ─────────────────────────────────────────────

async function scarica(host, pagina) {
  const res = await fetch(`https://${host}/products.json?limit=250&page=${pagina}`, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return Array.isArray(json.products) ? json.products : [];
}

// ── normalizzazione ──────────────────────────────────────────────────

const FIBRE_PREGIATE = {
  cashmere: 100, seta: 95, lino: 90, lana: 88, "lana merino": 92, alpaca: 90,
  mohair: 85, cotone: 75, "cotone biologico": 85, canapa: 85, viscosa: 55,
  lyocell: 70, tencel: 70, modal: 60, cupro: 60,
};
const FIBRE_POVERE = { poliestere: 25, acrilico: 20, nylon: 35, poliammide: 35, elastan: 40, elastane: 40, "pu": 15, poliuretano: 15 };

// Legge la composizione dichiarata nella descrizione e ne ricava un punteggio
// onesto: non è una misura di qualità, è quello che dice l'etichetta.
function analizzaTessuto(testo) {
  if (!testo) return { tessuto: null, qualita: null };
  const pulito = String(testo).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").toLowerCase();

  const trovate = [...pulito.matchAll(/(\d{1,3})\s*%\s*([a-zà-ù ]{3,22})/g)]
    .map(([, perc, nome]) => ({ perc: Number(perc), nome: nome.trim() }))
    .filter((f) => f.perc > 0 && f.perc <= 100)
    .slice(0, 6);

  if (!trovate.length) return { tessuto: null, qualita: null };

  let somma = 0;
  let peso = 0;
  for (const f of trovate) {
    const chiave = Object.keys({ ...FIBRE_PREGIATE, ...FIBRE_POVERE }).find((k) => f.nome.startsWith(k));
    if (!chiave) continue;
    const valore = FIBRE_PREGIATE[chiave] ?? FIBRE_POVERE[chiave];
    somma += valore * f.perc;
    peso += f.perc;
  }

  const tessuto = trovate.map((f) => `${f.perc}% ${f.nome}`).join(", ").slice(0, 200);
  return { tessuto, qualita: peso ? Math.round(somma / peso) : null };
}

function valoreOpzione(prodotto, variante, regex) {
  const i = (prodotto.options || []).findIndex((o) => regex.test(String(o.name || "")));
  if (i < 0) return null;
  return variante?.[`option${i + 1}`] || null;
}

function deduciGenere(prodotto) {
  const testo = `${prodotto.title} ${prodotto.product_type} ${(prodotto.tags || []).join(" ")}`.toLowerCase();
  const donna = /\bdonna\b|\bwoman\b|\bwomen\b|femminile/.test(testo);
  const uomo = /\buomo\b|\bman\b|\bmen\b|maschile/.test(testo);
  if (donna && !uomo) return "donna";
  if (uomo && !donna) return "uomo";
  if (donna && uomo) return "unisex";
  return null;
}

function normalizza(prodotto, negozio) {
  const varianti = prodotto.variants || [];
  const disponibili = varianti.filter((v) => v.available);
  const riferimento = disponibili[0] || varianti[0];
  if (!riferimento) return null;

  const prezzi = (disponibili.length ? disponibili : varianti)
    .map((v) => Number(v.price))
    .filter((p) => Number.isFinite(p) && p > 0);

  // Il colore lo dichiara il negozio in un'opzione; se non c'è, lo cerchiamo
  // nel titolo ("CAMICIA FLANELLA VERDONE").
  const coloreNome = valoreOpzione(prodotto, riferimento, /colou?r|colore/i);
  const hex = coloreDaNome(coloreNome) || coloreDaNome(prodotto.title);
  const lab = hex ? hexALab(hex) : null;

  const taglie = [
    ...new Set(
      varianti
        .map((v) => valoreOpzione(prodotto, v, /taglia|size|misura/i))
        .filter(Boolean)
        .map(String),
    ),
  ].slice(0, 30);

  const { tessuto, qualita } = analizzaTessuto(prodotto.body_html);

  return {
    negozio: negozio.nome,
    id_esterno: String(prodotto.id),
    titolo: String(prodotto.title || "").slice(0, 300),
    url: `https://${negozio.host}/products/${prodotto.handle}`,
    immagine: prodotto.images?.[0]?.src || null,
    prezzo: prezzi.length ? Math.min(...prezzi) : null,
    prezzo_pieno: Number(riferimento.compare_at_price) || null,
    disponibile: disponibili.length > 0,
    categoria: prodotto.product_type || null,
    genere: deduciGenere(prodotto),
    taglie,
    colore_nome: coloreNome || null,
    colore_hex: hex,
    colore_l: lab?.L ?? null,
    colore_a: lab?.a ?? null,
    colore_b: lab?.b ?? null,
    tessuto,
    qualita,
    fast_fashion: negozio.fast,
  };
}

// ── colori dalla foto ────────────────────────────────────────────────

/**
 * Aggiunge a ogni capo i colori letti dalla foto.
 *
 * La regola: se il negozio ha dichiarato un colore che sappiamo tradurre,
 * quello resta il principale — è più affidabile della foto, dove luci da
 * studio e riflessi ingannano. La foto serve ad aggiungere gli ALTRI colori,
 * ed è ciò che rende cercabili le fantasie: una camicia a quadri verde e blu
 * si trova sia dal verde che dal blu.
 * Quando invece il nome non dice niente ("Fantasia", "Var. 3"), comanda la foto.
 */
async function aggiungiColoriDaFoto(righe) {
  const gruppo = 6; // poche immagini alla volta: siamo ospiti
  for (let i = 0; i < righe.length; i += gruppo) {
    await Promise.all(
      righe.slice(i, i + gruppo).map(async (riga) => {
        const daFoto = riga.immagine ? await coloriDaFoto(riga.immagine) : [];
        const daNome = riga.colore_hex ? hexALab(riga.colore_hex) : null;

        const elenco = [];
        if (daNome) {
          elenco.push({ hex: riga.colore_hex, l: +daNome.L.toFixed(2), a: +daNome.a.toFixed(2), b: +daNome.b.toFixed(2), peso: 1, da: "nome" });
        }
        for (const c of daFoto) elenco.push({ ...c, da: "foto" });

        riga.colori = elenco;
        riga.colore_da = daNome ? "nome" : daFoto.length ? "foto" : null;

        // Se il nome non diceva niente, il colore principale è il dominante della foto.
        if (!daNome && daFoto.length) {
          const primo = daFoto[0];
          riga.colore_hex = primo.hex;
          riga.colore_l = primo.l;
          riga.colore_a = primo.a;
          riga.colore_b = primo.b;
        }
      }),
    );
  }
}

// ── salvataggio ──────────────────────────────────────────────────────

async function salva(righe) {
  if (!righe.length) return;
  for (let i = 0; i < righe.length; i += 200) {
    const blocco = righe.slice(i, i + 200);
    const res = await fetch(`${SUPABASE}/rest/v1/prodotti?on_conflict=negozio,id_esterno`, {
      method: "POST",
      headers: {
        apikey: SERVICE,
        Authorization: `Bearer ${SERVICE}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(blocco),
    });
    if (!res.ok) throw new Error(`salvataggio: ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
}

// ── esecuzione ───────────────────────────────────────────────────────

async function importa(negozio) {
  let letti = 0;
  let salvati = 0;
  let conColore = 0;
  let conTessuto = 0;

  for (let pagina = 1; pagina <= 20; pagina++) {
    let prodotti;
    try {
      prodotti = await scarica(negozio.host, pagina);
    } catch (e) {
      console.log(`  pagina ${pagina}: ${e.message} — mi fermo`);
      break;
    }
    if (!prodotti.length) break;
    letti += prodotti.length;

    const righe = prodotti.map((p) => normalizza(p, negozio)).filter(Boolean);
    await aggiungiColoriDaFoto(righe);
    conColore += righe.filter((r) => r.colore_hex).length;
    conTessuto += righe.filter((r) => r.tessuto).length;

    await salva(righe);
    salvati += righe.length;

    if (prodotti.length < 250) break;
    await new Promise((r) => setTimeout(r, 800)); // ospiti corretti
  }

  const pct = (n) => (salvati ? Math.round((n / salvati) * 100) : 0);
  console.log(
    `  ${negozio.nome.padEnd(18)} ${String(salvati).padStart(5)} capi   ` +
      `colore ${String(pct(conColore)).padStart(3)}%   composizione ${String(pct(conTessuto)).padStart(3)}%`,
  );
  return salvati;
}

const scelta = process.argv[2];
const daFare = !scelta || scelta === "--tutti" ? NEGOZI : NEGOZI.filter((n) => n.nome.toLowerCase().includes(scelta.toLowerCase()));

if (!daFare.length) {
  console.error(`Nessun negozio corrisponde a "${scelta}".`);
  process.exit(1);
}

console.log(`Importo ${daFare.length} negozi.\n`);
let totale = 0;
for (const n of daFare) totale += await importa(n);
console.log(`\nTotale: ${totale} capi in catalogo.`);
