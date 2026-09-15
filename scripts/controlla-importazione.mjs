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

async function chiedi(percorso) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${percorso}`, { headers: intestazioni });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 120)}`);
  return res.json();
}

const freschi = await chiedi(`prodotti?select=negozio&aggiornato=gte.${DA_QUANDO}&limit=200000`);
const perNegozio = new Map();
for (const c of freschi) perNegozio.set(c.negozio, (perNegozio.get(c.negozio) || 0) + 1);

console.log(`capi toccati nelle ultime dodici ore: ${freschi.length}`);
console.log(`negozi che ne hanno almeno uno:       ${perNegozio.size} su ${NEGOZI.length}`);

// Qualche negozio che non risponde è normale: cambiano indirizzo, vanno giù
// per manutenzione, mettono il catalogo dietro una porta chiusa. Sotto i due
// terzi invece non è più il negozio, siamo noi.
const SOGLIA = Math.round(NEGOZI.length * 0.66);
const mancanti = NEGOZI.map((n) => n.nome).filter((n) => !perNegozio.has(n));

if (mancanti.length) {
  console.log(`\nnon hanno dato niente (${mancanti.length}): ${mancanti.slice(0, 12).join(", ")}${mancanti.length > 12 ? "…" : ""}`);
}

if (perNegozio.size < SOGLIA) {
  console.error(`\nToccati solo ${perNegozio.size} negozi su ${NEGOZI.length}: sotto i ${SOGLIA} che ci si aspetta.`);
  console.error("Il catalogo non è stato rinfrescato. Meglio saperlo adesso che scoprirlo fra dodici giorni.");
  process.exit(1);
}

console.log("\nIl catalogo è fresco.");
