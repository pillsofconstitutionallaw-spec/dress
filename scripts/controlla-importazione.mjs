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

// Quanti capi freschi per negozio, in una domanda sola.
//
// Prima erano centodieci domande — il totale, poi un negozio alla volta — e
// ognuna rileggeva tutta la tabella, perché «aggiornato» non ha un indice (in
// sql/controlla_importazione.sql c'è scritto perché è giusto che non ce
// l'abbia). Col catalogo cresciuto, una lettura intera ha superato gli otto
// secondi che il database concede, e il lavoro falliva con l'importazione
// riuscita. Adesso il conto lo fa una funzione del database, una volta sola,
// con due minuti di tempo.
//
// E si riprova lo stesso, se il server dice di no per qualcosa che passa da
// solo: questo controllo gira col database appena spremuto da un'ora di
// importazione.
const RIPROVE = 4;
const attesa = (ms) => new Promise((r) => setTimeout(r, ms));

async function capiFreschi() {
  for (let tentativo = 1; ; tentativo++) {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/capi_freschi`, {
      method: "POST",
      headers: { ...intestazioni, "Content-Type": "application/json" },
      body: JSON.stringify({ da: DA_QUANDO }),
    });
    if (res.ok) return res.json();

    const testo = (await res.text()).slice(0, 120);
    // Una chiave sbagliata, o la funzione che manca, non migliorano
    // aspettando: vanno dette subito.
    const passeggero = res.status >= 500 || /57014|statement timeout/.test(testo);
    if (!passeggero || tentativo >= RIPROVE) throw new Error(`${res.status} ${testo}`);
    console.log(`  il database è ancora occupato (tentativo ${tentativo}), riprovo fra ${tentativo * 20} secondi`);
    await attesa(tentativo * 20_000);
  }
}

const righe = await capiFreschi();
const perNegozio = new Map(righe.map((r) => [r.negozio, Number(r.quanti)]));
const freschi = righe.reduce((somma, r) => somma + Number(r.quanti), 0);

// Per nome distinto, non per riga dell'elenco: se un negozio ci finisce due
// volte — è successo con Pangaia, due righe identiche — contarlo due volte
// farebbe risultare mancante uno che invece ha risposto. E solo i negozi
// dell'elenco: uno tolto ieri ha ancora capi freschi, ma non conta.
const NOMI = [...new Set(NEGOZI.map((n) => n.nome))];
for (const nome of perNegozio.keys()) if (!NOMI.includes(nome)) perNegozio.delete(nome);

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
