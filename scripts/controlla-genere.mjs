// Passa tutto il catalogo dentro perChiE e stampa dove non è d'accordo col
// genere salvato.
//
//   npm run controlla        → una decina di esempi per gruppo
//   npm run controlla -- 40  → quaranta
//
// Solo lettura: non scrive niente, né sul database né su disco.
//
// Serve perché i difetti di questa parte non si vedono dalle prove: le prove
// sanno solo quello che ci abbiamo già messo dentro. I casi veri stanno nei
// titoli veri, e sono sempre arrivati da qui — «Decolleté», che il confine di
// parola di JavaScript non agganciava; ottanta gonne da bambina di Sofie
// Schnoor proposte a una donna adulta; otto cappellini della 24 Ore di Le
// Mans mostrati solo agli uomini; il reparto donna di Boody schedato neonati.
// Nessuno di questi si sarebbe fatto trovare senza guardare l'elenco.
//
// Come si legge: ogni gruppo è un disaccordo fra quello che il negozio ha
// salvato e quello che il capo dice di sé. Il disaccordo NON è di per sé un
// difetto — «vuoto, ma il nome dice donna» sono le millecento gonne che
// vogliamo riconoscere. Si guardano i titoli: se fra quelli ce n'è uno che
// non c'entra, quello è il difetto.

import { readFileSync } from "node:fs";
import path from "node:path";
import { perChiE } from "@/lib/capiPalette";

const RADICE = path.resolve(import.meta.dirname, "..");
const env = Object.fromEntries(
  readFileSync(path.join(RADICE, ".env.local"), "utf8")
    .split("\n")
    .filter((r) => r.includes("=") && !r.trim().startsWith("#"))
    .map((r) => [r.slice(0, r.indexOf("=")).trim(), r.slice(r.indexOf("=") + 1).trim()]),
);
const SUPABASE = env.SUPABASE_URL;
const SERVIZIO = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE || !SERVIZIO) throw new Error("Mancano SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in .env.local");

const QUANTI = Number(process.argv[2]) || 10;

// perChiE guarda titolo e categoria: sono le sole colonne che servono, e
// centomila righe intere sarebbero venti megabyte per niente.
const capi = [];
for (let da = 0; ; da += 1000) {
  const res = await fetch(
    `${SUPABASE}/rest/v1/prodotti?select=negozio,titolo,categoria,genere&order=id&offset=${da}&limit=1000`,
    { headers: { apikey: SERVIZIO, Authorization: `Bearer ${SERVIZIO}` } },
  );
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const blocco = await res.json();
  capi.push(...blocco);
  process.stdout.write(`\rletti ${capi.length} capi   `);
  if (blocco.length < 1000) break;
}
console.log("\n");

const gruppi = new Map();
const distribuzione = new Map();
for (const capo of capi) {
  const detto = perChiE(capo);
  const salvato = capo.genere || null;
  const passaggio = `${salvato === null ? "(vuoto)" : salvato} → ${detto === null ? "(niente)" : detto}`;
  distribuzione.set(passaggio, (distribuzione.get(passaggio) || 0) + 1);
  if (detto === salvato) continue;

  const nome = !salvato ? `vuoto, ma il nome dice «${detto}»`
    : detto === "bambino" ? `salvato «${salvato}», il nome dice bambino`
    : salvato === "bambino" ? `salvato bambino, il nome dice «${detto}»`
    : detto === "unisex" ? `salvato «${salvato}», il nome dice tutte e due`
    : `SCONTRO: salvato «${salvato}», il nome dice «${detto}»`;
  if (!gruppi.has(nome)) gruppi.set(nome, []);
  gruppi.get(nome).push(capo);
}

console.log(`${capi.length} capi. Come si distribuiscono (salvato → deciso):`);
for (const [passaggio, n] of [...distribuzione].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(6)}  ${passaggio}`);
}

// Gli esempi si pescano a passo regolare invece che dalla cima: in cima c'è
// sempre lo stesso negozio, e un difetto che riguarda un negozio solo non si
// distingue da uno che li riguarda tutti.
for (const [nome, righe] of [...gruppi].sort((a, b) => b[1].length - a[1].length)) {
  const negozi = new Map();
  for (const c of righe) negozi.set(c.negozio, (negozi.get(c.negozio) || 0) + 1);
  console.log(`\n── ${nome}: ${righe.length}`);
  console.log(`   ${[...negozi].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([n, q]) => `${n} (${q})`).join(", ")}`);
  const passo = Math.max(1, Math.floor(righe.length / QUANTI));
  for (let i = 0; i < righe.length && i / passo < QUANTI; i += passo) {
    const c = righe[i];
    console.log(`     ${String(c.negozio).slice(0, 14).padEnd(14)} ${String(c.titolo).slice(0, 58).padEnd(58)} [${c.categoria || ""}]`);
  }
}
