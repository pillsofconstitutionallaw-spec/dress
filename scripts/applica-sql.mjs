// Rimettere in piedi il database da zero.
//
//   node scripts/applica-sql.mjs                      (legge .env.local)
//   node scripts/applica-sql.mjs --prova              (non scrive: dice solo cosa farebbe)
//
// Questo file nasce la notte in cui il progetto Supabase è stato cancellato
// per sbaglio. Il catalogo si ripesca dai negozi e lo schema stava tutto in
// sql/, quindi non era perduto niente di irrecuperabile — ma rimetterlo su ha
// voluto dire incollare dodici file a mano dentro una pagina web, uno per
// uno, alle due di notte, sperando di ricordarsi l'ordine.
//
// L'ordine non è alfabetico e non è indifferente:
//
//   · profiles prima di tutto ciò che vi si appoggia;
//   · prodotti prima di chi gli aggiunge colonne o indici;
//   · i tre file che definiscono capi_per_palette si sovrascrivono a vicenda,
//     e vince l'ultimo applicato. Quella funzione oggi non la chiama più
//     nessuno — l'app usa capi_per_palette_v2 — ma se un giorno tornasse
//     utile deve essere la versione giusta, non quella di due settimane prima.
//
// Serve la password del database, che Supabase mostra una volta sola quando
// si crea il progetto. Se è andata persa si rigenera da
// Settings → Database → Reset database password.

import { readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const RADICE = path.resolve(import.meta.dirname, "..");
const PROVA = process.argv.includes("--prova");

// L'ordine di applicazione. Chi aggiunge un file nuovo lo aggiunge QUI, non
// si limita a metterlo nella cartella: un file che nessuno nomina non viene
// applicato, e il guasto si scopre mesi dopo su un database ricostruito.
const ORDINE = [
  "supabase_init.sql",      // le persone: profiles, e chi entra si crea il profilo
  "profili_completi.sql",   // la versione buona di handle_new_user, e le colonne in più
  "prodotti.sql",           // il catalogo: tabella, indici, lettura libera
  "genere_capi.sql",        // da chi è portato un capo
  "ricerca_testo.sql",      // la colonna «cerca» e l'indice trigram che la rende veloce
  "colore_vicino.sql",      // i colori come punti nello spazio, con indice geometrico
  "capi_in_saldo.sql",      // quanto costava prima
  "ricerca_capi.sql",       // capi_per_palette, prima versione
  "ricerca_parole.sql",     //   "        "     con i sinonimi
  "ricerca_colori.sql",     //   "        "     con la distanza sui colori
  "ricerca_indice.sql",     // capi_per_palette_v2: è questa che usa l'app
  "tendenze.sql",           // i tagli di moda, contati una volta a notte
];

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
const riferimento = (env.SUPABASE_URL || "").match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
const password = env.SUPABASE_DB_PASSWORD;
// La regione sta nel nome del pooler, e da fuori non si indovina: il nome
// diretto del database risponde solo in IPv6, che molte reti di casa non
// hanno. Si mette in chiaro, così chi legge sa dov'è la macchina.
const regione = env.SUPABASE_REGIONE || "eu-west-3";

if (!riferimento || !password) {
  // Quale delle due manca, non «una delle due»: alle due di notte la
  // differenza fra le due risposte sono venti minuti.
  if (!riferimento) console.error("Manca SUPABASE_URL, o non ha la forma https://<riferimento>.supabase.co");
  if (!password) console.error("Manca SUPABASE_DB_PASSWORD — è la password scelta quando si crea il progetto.");
  console.error("Si scrivono in .env.local, o si passano nell'ambiente.");
  process.exit(1);
}

console.log(`Progetto ${riferimento}, regione ${regione}.`);
if (PROVA) {
  ORDINE.forEach((f, i) => console.log(`  ${String(i + 1).padStart(2)}. ${f}`));
  process.exit(0);
}

const cliente = new pg.Client({
  host: `aws-1-${regione}.pooler.supabase.com`,
  port: 5432,
  user: `postgres.${riferimento}`,
  password,
  database: "postgres",
  // Il pooler di Supabase presenta un certificato che non risale a una radice
  // di sistema. La connessione resta cifrata; quello che non si verifica è
  // l'identità, e l'indirizzo lo abbiamo costruito noi da un riferimento che
  // arriva dalla configurazione, non da un collegamento su cui si è cliccato.
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  // I file grandi creano indici su centomila righe: non è una domanda che
  // qualcuno sta aspettando, e il limite dei ruoli qui non si applica.
  statement_timeout: 600000,
});

await cliente.connect();
console.log("Connesso.\n");

let falliti = 0;
for (const nome of ORDINE) {
  const testo = readFileSync(path.join(RADICE, "sql", nome), "utf8");
  process.stdout.write(`  ${nome.padEnd(24)}`);
  try {
    await cliente.query(`begin; ${testo}\n; commit;`);
    console.log("fatto");
  } catch (e) {
    falliti++;
    console.log(`FALLITO — ${e.message}`);
    // Ogni file nella sua transazione, e dopo un errore si disfa.
    //
    // Senza, il primo file che sbaglia manda la connessione in «transazione
    // interrotta» e da lì in poi TUTTI rispondono lo stesso errore, che non
    // è il loro: la prima volta che è successo sembravano rotti sette file
    // su dodici, e rotti erano tre. Quattro diagnosi false in una riga sola.
    await cliente.query("rollback").catch(() => {});
  }
}

await cliente.end();
console.log(falliti ? `\n${falliti} file su ${ORDINE.length} non sono passati.` : `\nTutti e ${ORDINE.length} applicati.`);
process.exit(falliti ? 1 : 0);
