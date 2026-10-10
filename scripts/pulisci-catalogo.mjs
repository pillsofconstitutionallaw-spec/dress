// Togliere dal catalogo i capi che non si possono più comprare.
//
//   node scripts/pulisci-catalogo.mjs
//
// Gira dopo l'importazione. Il lavoro vero lo fa sql/pulisci_catalogo.sql,
// dove c'è scritto cosa toglie e perché: qui si chiama e si dice com'è andata.

import { readFileSync } from "node:fs";
import path from "node:path";

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

const risposta = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/pulisci_catalogo`, {
  method: "POST",
  headers: {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  },
  body: "{}",
});
const corpo = await risposta.text();

if (risposta.ok) {
  console.log(`Catalogo pulito: tolti ${corpo.trim()} capi che non si possono più comprare.`);
  process.exit(0);
}

console.error(`La pulizia non è andata (HTTP ${risposta.status}): ${corpo}`);
process.exit(1);
