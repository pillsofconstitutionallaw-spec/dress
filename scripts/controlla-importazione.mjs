// L'importazione è servita a qualcosa?
//
//   node scripts/controlla-importazione.mjs
//
// Gira subito dopo l'importazione, sulla macchina che la fa ogni notte. Non
// controlla che il programma non sia esploso — quello lo sa già chi lo ha
// lanciato — ma che abbia scritto: un'importazione che finisce pulita senza
// toccare una riga è il guasto peggiore di tutti, perché il lavoro risulta
// verde e il catalogo invecchia in silenzio. È esattamente com'è andata la
// volta che il progetto si è fermato: nessun errore da nessuna parte, e
// dodici giorni di prezzi vecchi.
//
// Esce con 1 se il catalogo non è stato rinfrescato abbastanza, così chi
// guarda la lista dei lavori vede rosso invece di verde.

import { readFileSync } from "node:fs";
import path from "node:path";
import { NEGOZI } from "./importa-catalogo.mjs";

const RADICE = path.resolve(import.meta.dirname, "..");

function leggiAmbiente() {
  let daFile = {};
  try {
    daFile = Object.fromEntries(
      readFileSync(path.join(RADICE, ".env.local"), "utf8")
        .split("\n")
        .filter((r) => r.includes("=") && !r.trim().startsWith("#"))
        .map((r) => [r.slice(0, r.indexOf("=")).trim(), r.slice(r.indexOf("=") + 1).trim()]),
    );
  } catch {
    /* nessun file: si va con quello che c'è nell'ambiente */
  }
  return { ...process.env, ...daFile };
}

const env = leggiAmbiente();
if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Mancano SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const intestazioni = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
};

// Dodici ore: abbastanza da coprire un'importazione lenta, poco da non
// scambiare quella di ieri per quella di oggi.
const DA_QUANDO = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

/**
 * Quante righe, senza portarsele dietro.
 *
 * Chiedere le righe e contarle in JavaScript qui non funziona, e la prima
 * versione di questo file ci è cascata: il database ne restituisce al massimo
 * mille per volta, qualunque limite si scriva. Usciva «1000 capi toccati, 29
 * negozi su 109» e il controllo falliva su un'importazione andata benissimo —
 * un allarme falso, che è il modo più veloce di far smettere di guardare gli
 * allarmi. I capi veri erano 88.971.
 *
 * Con «count=exact» il conto lo fa il database e torna in un'intestazione,
 * senza mandare nemmeno una riga.
 */
//
// E si riprova, se il database dice che ci ha messo troppo. Questo controllo
// gira un attimo dopo cinquanta minuti di importazione, cioè col database
// appena spremuto: due notti su tre il primo conteggio è andato oltre il
// limite di tempo (codice 57014) e il lavoro è risultato fallito — con
// l'importazione riuscita e il catalogo fresco. Rifatto a mano poco dopo, lo
// stesso conteggio ci mette 0,75 secondi. Non era un guasto, era fretta.
const RIPROVE = 4;
const attesa = (ms) => new Promise((r) => setTimeout(r, ms));

async function quanti(filtro) {
  for (let tentativo = 1; ; tentativo++) {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/prodotti?select=id&${filtro}`, {
      headers: { ...intestazioni, Prefer: "count=exact", Range: "0-0" },
    });
    if (res.ok) return Number((res.headers.get("content-range") || "").split("/")[1] || 0);

    const testo = (await res.text()).slice(0, 120);
    // Solo gli errori che passano da soli si riprovano: troppo lento, o il
    // server che non risponde un momento. Una chiave sbagliata no — quella
    // non migliora aspettando, e va detta subito.
    const passeggero = res.status >= 500 || /57014|statement timeout/.test(testo);
    if (!passeggero || tentativo >= RIPROVE) throw new Error(`${res.status} ${testo}`);
    console.log(`  il database è ancora occupato (tentativo ${tentativo}), riprovo fra ${tentativo * 20} secondi`);
    await attesa(tentativo * 20_000);
  }
}

const freschi = await quanti(`aggiornato=gte.${DA_QUANDO}`);

// Un negozio alla volta: si chiede una riga sola per sapere se ne ha almeno
// una fresca. Centonove domande piccole costano meno di una grande che poi
// non si può contare.
// Per nome distinto, non per riga dell'elenco: se un negozio ci finisce due
// volte — è successo con Pangaia, due righe identiche — contarlo due volte
// farebbe risultare mancante uno che invece ha risposto.
const NOMI = [...new Set(NEGOZI.map((n) => n.nome))];

const perNegozio = new Map();
for (const nome of NOMI) {
  const n = await quanti(`negozio=eq.${encodeURIComponent(nome)}&aggiornato=gte.${DA_QUANDO}`);
  if (n > 0) perNegozio.set(nome, n);
}

console.log(`capi toccati nelle ultime dodici ore: ${freschi}`);
console.log(`negozi che ne hanno almeno uno:       ${perNegozio.size} su ${NOMI.length}`);

// Qualche negozio che non risponde è normale: cambiano indirizzo, vanno giù
// per manutenzione, mettono il catalogo dietro una porta chiusa. Sotto i due
// terzi invece non è più il negozio, siamo noi.
const SOGLIA = Math.round(NOMI.length * 0.66);
const mancanti = NOMI.filter((n) => !perNegozio.has(n));

if (mancanti.length) {
  console.log(`\nnon hanno dato niente (${mancanti.length}): ${mancanti.slice(0, 12).join(", ")}${mancanti.length > 12 ? "…" : ""}`);
}

if (perNegozio.size < SOGLIA) {
  console.error(`\nToccati solo ${perNegozio.size} negozi su ${NOMI.length}: sotto i ${SOGLIA} che ci si aspetta.`);
  console.error("Il catalogo non è stato rinfrescato. Meglio saperlo adesso che scoprirlo fra dodici giorni.");
  process.exit(1);
}

console.log("\nIl catalogo è fresco.");
