// Ricontare i tagli, una volta a notte.
//
//   node scripts/aggiorna-tendenze.mjs
//
// Gira dopo l'importazione, quando il catalogo è fresco. Scorre i titoli
// cercando quattordici tagli — baggy, cargo, vita alta, skinny... — e mette i
// conteggi in una tabella che /api/tendenze legge in un istante.
//
// Prima si contava a ogni visita. Ha retto finché il catalogo era piccolo:
// a centouno mila capi erano tre secondi, a centoquattordici sono sei, e il
// database ne concede otto. Non era ancora rotto, era in arrivo — e lo
// sarebbe diventato di notte, senza che nessuno lo vedesse succedere.

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

const risposta = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/aggiorna_tendenze`, {
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
  console.log(`Tendenze aggiornate: ${corpo.trim()} tagli contati.`);
  process.exit(0);
}

// 42883 è «questa funzione non esiste»: vuol dire che sql/tendenze.sql non è
// ancora stato applicato al database. Non è un guasto di stanotte, è un passo
// di installazione che manca — e intanto /api/tendenze conta da sé, come
// faceva prima. Quindi si dice forte e si lascia verde il lavoro, invece di
// far vedere rosso ogni notte per una cosa che nessuno può risolvere qui.
if (/42883|could not find the function|schema cache/i.test(corpo)) {
  console.warn("La funzione aggiorna_tendenze() non c'è ancora nel database.");
  console.warn("Va applicato sql/tendenze.sql dall'editor SQL di Supabase.");
  console.warn("Finché manca, le tendenze si contano a ogni visita: funzionano, ma lente.");
  process.exit(0);
}

console.error(`Le tendenze non si sono aggiornate (HTTP ${risposta.status}): ${corpo}`);
process.exit(1);
