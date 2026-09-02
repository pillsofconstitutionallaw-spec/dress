// Rilegge il colore dei capi già in catalogo.
//
//   node scripts/sistema-colore.mjs           → guarda e basta, non tocca niente
//   node scripts/sistema-colore.mjs --scrivi  → applica, dopo aver salvato una copia
//
// Serve una volta sola, dopo aver aggiustato come si legge il nome di un
// colore. Da qui in avanti ci pensa importa-catalogo.mjs a ogni importazione.
//
// Tocca SOLO i capi il cui colore è stato dedotto da un nome, e li riconosce
// da questo: un colore preso dal vocabolario è uno degli hex che ci abbiamo
// scritto dentro, mentre uno misurato sulla foto è un hex qualunque. I colori
// letti dalle foto restano dove sono — la foto è il capo, il nome è una parola.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { NOMI_COLORE, coloreDaNome, coloreNelTitolo, hexALab, differenza } from "../lib/colore.js";

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
  const res = await fetch(`${SUPABASE}/rest/v1/${percorso}`, { ...opzioni, headers: { ...intestazioni, ...(opzioni.headers || {}) } });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res;
}

const capi = [];
for (let da = 0; ; da += 1000) {
  const res = await chiedi(`prodotti?select=id,titolo,colore_nome,colore_hex&colore_hex=not.is.null&order=id&offset=${da}&limit=1000`);
  const blocco = await res.json();
  capi.push(...blocco);
  process.stdout.write(`\rletti ${capi.length} capi con un colore   `);
  if (blocco.length < 1000) break;
}
console.log();

const DAL_VOCABOLARIO = new Set(Object.values(NOMI_COLORE));
const daCambiare = [];
for (const capo of capi) {
  if (!DAL_VOCABOLARIO.has(capo.colore_hex)) continue; // questo viene dalla foto
  const hex = coloreDaNome(capo.colore_nome) || coloreNelTitolo(capo.titolo);
  if (!hex || hex === capo.colore_hex) continue;
  const lab = hexALab(hex);
  daCambiare.push({
    id: capo.id, prima: capo.colore_hex, hex,
    l: +lab.L.toFixed(2), a: +lab.a.toFixed(2), b: +lab.b.toFixed(2),
    salto: differenza(hexALab(capo.colore_hex), lab),
    nome: capo.colore_nome, titolo: capo.titolo,
  });
}

const diversi = daCambiare.filter((c) => c.salto > 25);
console.log(`\n${daCambiare.length} capi cambiano colore:`);
console.log(`   ${diversi.length} cambiano davvero colore (oltre 25 di distanza percettiva)`);
console.log(`   ${daCambiare.length - diversi.length} restano nella stessa famiglia`);
console.log("\nun assaggio, dal salto più grosso:");
for (const c of [...daCambiare].sort((a, b) => b.salto - a.salto).slice(0, 8)) {
  console.log(`   ${c.prima} → ${c.hex}  Δ${String(Math.round(c.salto)).padStart(3)}  «${String(c.nome).slice(0, 22).padEnd(22)}» ${String(c.titolo).slice(0, 40)}`);
}

if (!SCRIVI) {
  console.log("\nNon ho scritto niente. Per applicare:  node scripts/sistema-colore.mjs --scrivi");
  process.exit(0);
}

const copia = path.join(RADICE, `colore-prima-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`);
writeFileSync(copia, JSON.stringify(daCambiare.map((c) => ({ id: c.id, colore_hex: c.prima })), null, 1));
console.log(`\nCopia dei colori di prima: ${path.basename(copia)}`);

// Un colore alla volta su tutti gli id che lo prendono: i valori distinti sono
// una manciata, i capi centinaia.
const perColore = new Map();
for (const c of daCambiare) {
  if (!perColore.has(c.hex)) perColore.set(c.hex, { lab: { l: c.l, a: c.a, b: c.b }, ids: [] });
  perColore.get(c.hex).ids.push(c.id);
}

let fatti = 0;
for (const [hex, { lab, ids }] of perColore) {
  for (let i = 0; i < ids.length; i += 200) {
    const gruppo = ids.slice(i, i + 200);
    await chiedi(`prodotti?id=in.(${gruppo.join(",")})`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ colore_hex: hex, colore_l: lab.l, colore_a: lab.a, colore_b: lab.b }),
    });
    fatti += gruppo.length;
    process.stdout.write(`\r  scritti ${fatti}/${daCambiare.length}   `);
  }
}
console.log(`\n\nFatto: ${daCambiare.length} capi sistemati.`);
