// Mettere da parte le persone.
//
//   node scripts/salva-profili.mjs
//
// Il catalogo si ripesca dai negozi: sono ottantottomila capi e un'ora di
// macchina. Le persone iscritte no. Quelle vivono in un posto solo, e la
// notte del 21 settembre 2026 quel posto è stato cancellato per sbaglio —
// con dentro tutto: chi si era iscritto, la sua analisi dei colori, i capi
// che si era salvato. Sul piano gratuito di Supabase non esiste nessun
// salvataggio automatico, e non c'era niente da cui tornare indietro.
//
// Si salvano DUE tabelle, e la seconda è quella che di solito si dimentica:
//
//   public.profiles  i dati — nome, palette, preferiti, completi salvati
//   auth.users       le credenziali, cioè la possibilità di rientrare
//
// Senza auth.users si riporterebbero indietro i dati di persone che non
// possono più entrare a vederli. È un salvataggio che sembra completo e non
// serve a niente, ed è il modo più facile di sbagliarlo.
//
// Il file che ne esce contiene email, date di nascita e impronte di
// password. Va dove si mettono le cose di quel tipo: non in questo
// repository, che è pubblico, e non fra gli artefatti di GitHub, che su un
// repository pubblico sono scaricabili da chiunque.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { readFileSync } from "node:fs";
import pg from "pg";

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

// Dove finisce il file. Fuori dal repository non si può mettere in modo
// automatico — dipende da come è fatto il computer di chi lo lancia — quindi
// finisce in una cartella che .gitignore tiene fuori, e c'è una prova che
// controlla che ci resti.
export const CARTELLA = "salvataggi";

/** Il nome dice cosa c'è dentro e di quando è, senza doverlo aprire. */
export function nomeDelFile(quando = new Date()) {
  const g = quando.toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return `persone-${g}.json`;
}

if (import.meta.main) {
  const env = leggiAmbiente();
  const riferimento = (env.SUPABASE_URL || "").match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
  const password = env.SUPABASE_DB_PASSWORD;
  const regione = env.SUPABASE_REGIONE || "eu-west-1";

  if (!riferimento) console.error("Manca SUPABASE_URL, o non ha la forma https://<riferimento>.supabase.co");
  if (!password) console.error("Manca SUPABASE_DB_PASSWORD.");
  if (!riferimento || !password) process.exit(1);

  const cliente = new pg.Client({
    host: `aws-1-${regione}.pooler.supabase.com`,
    port: 5432,
    user: `postgres.${riferimento}`,
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  await cliente.connect();

  // «select *» e non un elenco di colonne scelte: è un salvataggio, e una
  // colonna aggiunta l'anno prossimo deve finirci dentro da sola. Un elenco
  // scritto a mano invecchia in silenzio, ed è la seconda causa di
  // salvataggi che sembrano completi.
  const utenti = await cliente.query("select * from auth.users order by created_at");
  const profili = await cliente.query("select * from public.profiles order by created_at");
  await cliente.end();

  mkdirSync(path.join(RADICE, CARTELLA), { recursive: true });
  const dove = path.join(RADICE, CARTELLA, nomeDelFile());
  writeFileSync(
    dove,
    JSON.stringify(
      { progetto: riferimento, quando: new Date().toISOString(), utenti: utenti.rows, profili: profili.rows },
      null,
      2,
    ),
  );

  console.log(`${utenti.rowCount} utenti e ${profili.rowCount} profili in ${CARTELLA}/${path.basename(dove)}`);
  if (!utenti.rowCount) {
    console.log("Nessuno è iscritto: il file c'è ed è vuoto, il che è una notizia, non un guasto.");
  }
}
