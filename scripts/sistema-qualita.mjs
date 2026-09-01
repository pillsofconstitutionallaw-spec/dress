// Ricalcola il punteggio del tessuto sui capi già in catalogo.
//
//   node scripts/sistema-qualita.mjs           → guarda e basta, non tocca niente
//   node scripts/sistema-qualita.mjs --scrivi  → applica, dopo aver salvato una copia
//
// Serve una volta sola, dopo aver aggiustato la tabella delle fibre. Da qui in
// avanti ci pensa importa-catalogo.mjs a ogni importazione.
//
// Perché il dato è sbagliato: la tabella delle fibre conosceva solo i nomi
// italiani, e i negozi scrivono "cotton", "polyester", "økologisk bomuld".
// Su 32.525 capi con la composizione letta, 23.322 non avevano nessun
// punteggio — e il punteggio si vede sotto il capo e ordina la ricerca.
// Peggio: chi ne aveva uno poteva averlo sbagliato, perché la ricerca della
// fibra si accontentava dell'inizio del nome. "100% puro lino" valeva 15,
// il punteggio del poliuretano, perché "puro" comincia per "pu".
//
// Non serve andare a ribussare ai negozi: la composizione letta è già
// salvata in `tessuto`, e il punteggio si rifà da lì.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { analizzaTessuto } from "./importa-catalogo.mjs";

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

const SCRIVI = process.argv.includes("--scrivi");
const intestazioni = { apikey: SERVIZIO, Authorization: `Bearer ${SERVIZIO}` };

async function chiedi(percorso, opzioni = {}) {
  const res = await fetch(`${SUPABASE}/rest/v1/${percorso}`, {
    ...opzioni,
    headers: { ...intestazioni, ...(opzioni.headers || {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res;
}

const capi = [];
for (let da = 0; ; da += 1000) {
  const res = await chiedi(`prodotti?select=id,tessuto,qualita&tessuto=not.is.null&order=id&offset=${da}&limit=1000`);
  const blocco = await res.json();
  capi.push(...blocco);
  process.stdout.write(`\rletti ${capi.length} capi con l'etichetta   `);
  if (blocco.length < 1000) break;
}
console.log();

const daCambiare = [];
let nuovi = 0;
let persi = 0;
for (const capo of capi) {
  const qualita = analizzaTessuto(capo.tessuto).qualita;
  if (qualita === capo.qualita) continue;
  if (capo.qualita === null) nuovi++;
  if (qualita === null) persi++;
  daCambiare.push({ id: capo.id, prima: capo.qualita, qualita, tessuto: capo.tessuto });
}

console.log(`\n${daCambiare.length} capi cambiano punteggio:`);
console.log(`   ${nuovi} non ne avevano nessuno`);
console.log(`   ${daCambiare.length - nuovi - persi} ne avevano uno diverso`);
console.log(`   ${persi} lo perdono`);
console.log("\nun assaggio, dal salto più grosso:");
for (const c of [...daCambiare].sort((a, b) => Math.abs(b.qualita - b.prima) - Math.abs(a.qualita - a.prima)).slice(0, 8)) {
  console.log(`   ${String(c.prima).padStart(4)} → ${String(c.qualita).padStart(4)}   ${String(c.tessuto).slice(0, 60)}`);
}

if (!SCRIVI) {
  console.log("\nNon ho scritto niente. Per applicare:  node scripts/sistema-qualita.mjs --scrivi");
  process.exit(0);
}

// La copia PRIMA di toccare: il vecchio punteggio altrimenti non si recupera.
const copia = path.join(RADICE, `qualita-prima-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`);
writeFileSync(copia, JSON.stringify(daCambiare.map((c) => ({ id: c.id, qualita: c.prima })), null, 1));
console.log(`\nCopia dei punteggi di prima: ${path.basename(copia)}`);

// Si scrive un valore alla volta su tutti gli id che lo prendono: il punteggio
// è diverso per ogni capo, e mandarne uno per riga sarebbe ventiseimila
// richieste. I valori distinti sono un centinaio.
const perValore = new Map();
for (const c of daCambiare) {
  if (!perValore.has(c.qualita)) perValore.set(c.qualita, []);
  perValore.get(c.qualita).push(c.id);
}

let fatti = 0;
for (const [qualita, ids] of perValore) {
  for (let i = 0; i < ids.length; i += 200) {
    const gruppo = ids.slice(i, i + 200);
    await chiedi(`prodotti?id=in.(${gruppo.join(",")})`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ qualita }),
    });
    fatti += gruppo.length;
    process.stdout.write(`\r  scritti ${fatti}/${daCambiare.length}   `);
  }
}
console.log(`\n\nFatto: ${daCambiare.length} capi sistemati.`);
