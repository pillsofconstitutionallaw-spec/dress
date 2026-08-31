// Rimette il genere ai capi che ce l'hanno scritto nel titolo.
//
//   node scripts/sistema-genere.mjs           → guarda e basta, non tocca niente
//   node scripts/sistema-genere.mjs --scrivi  → applica, dopo aver salvato una copia
//
// Serve una volta sola, sul catalogo già importato. Da qui in avanti ci pensa
// importa-catalogo.mjs, che adesso legge anche l'olandese, i plurali inglesi e
// le parole dei capi da bambino.
//
// Perché il dato è sbagliato: il genere veniva dal valore predefinito del
// negozio, e il singolo capo poteva smentirlo solo con otto parole, tutte
// singolari, tutte italiane o inglesi. Così "Dames 1-pack Triangle top" —
// olandese per donna — è finito schedato uomo, perché Muchachomalo vende
// soprattutto boxer da uomo.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

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

// \m e \M sono l'inizio e la fine di parola in PostgreSQL. Servono: senza,
// "men" aggancerebbe "women" e "boy" aggancerebbe "boyfriend", che sui jeans
// è una vestibilità da donna.
// "baby" da solo prendeva "Baby Blue" e "Baby Pink", che sono colori, e
// "Baby Tee", che è una maglietta da adulta: tre bikini, una gonna vintage e
// un paio di décolleté sarebbero spariti dall'app per sempre. Se ne accorge
// solo chi guarda i titoli veri prima di scrivere.
const BAMBINO = String.raw`\m(bambin[oaie]|bimb[oaie]|kids?|infant|toddler|junior|girls?|boys?|neonat[oi]|newborn)\M|\mbab(y|ies)\M(?!\s*(blue|blu|pink|rosa|tee|doll|girl))`;
const DONNA = String.raw`\m(donn[ae]|femminile|wom[ae]n|womens|lad(y|ies)|dames|femmes?|mujer|damen)\M`;
const UOMO = String.raw`\m(uomo|uomini|maschile|m[ae]n|mens|heren|hommes?|hombre|herren)\M`;

// I bambini per primi: qualunque altra parola ci sia, se c'è scritto "kid" o
// "baby" quel capo non è di un adulto. Poi donna e uomo, ma solo quando il
// titolo lo dice ed è l'unico dei due a dirlo — dove ci sono tutte e due il
// capo è unisex e non lo tocchiamo.
const PASSI = [
  { a: "bambino", dove: [`titolo=imatch.${BAMBINO}`] },
  { a: "donna", dove: [`titolo=imatch.${DONNA}`, `titolo=not.imatch.${UOMO}`] },
  { a: "uomo", dove: [`titolo=imatch.${UOMO}`, `titolo=not.imatch.${DONNA}`] },
];

/**
 * "Il genere non è già questo, e non è bambino."
 *
 * Scritto come `genere=not.eq.X` sembrava dire proprio questo, e invece
 * buttava via le righe col genere VUOTO: in SQL il confronto con niente non
 * dà falso, dà niente, e una riga che risponde "niente" non passa il filtro.
 * Erano esattamente le righe che ci interessano di più — le Superga da
 * bambino non hanno un genere scritto — e l'anteprima ne contava 331 invece
 * di quasi mille. Va detto per esteso: o è vuoto, oppure è diverso da
 * entrambi.
 */
const daSistemare = (a) =>
  a === "bambino"
    ? "or=(genere.is.null,genere.neq.bambino)"
    : `or=(genere.is.null,and(genere.neq.${a},genere.neq.bambino))`;

const intestazioni = { apikey: SERVIZIO, Authorization: `Bearer ${SERVIZIO}` };

async function chiedi(percorso, opzioni = {}) {
  const res = await fetch(`${SUPABASE}/rest/v1/${percorso}`, {
    ...opzioni,
    headers: { ...intestazioni, ...(opzioni.headers || {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res;
}

// Chi cambierebbe: solo le righe che oggi hanno un valore diverso da quello
// che il titolo dichiara. Riscrivere un valore già giusto sarebbe rumore.
async function daCambiare({ a, dove }) {
  const filtri = [...dove, daSistemare(a)].join("&");
  const righe = [];
  for (let da = 0; ; da += 1000) {
    const res = await chiedi(`prodotti?select=id,negozio,titolo,genere&${filtri}&order=id&offset=${da}&limit=1000`);
    const blocco = await res.json();
    righe.push(...blocco);
    if (blocco.length < 1000) break;
  }
  return righe;
}

const conta = (righe) => {
  const per = new Map();
  for (const r of righe) per.set(r.genere, (per.get(r.genere) || 0) + 1);
  return [...per].map(([g, n]) => `${g === null ? "(vuoto)" : g}: ${n}`).join(", ");
};

const piani = [];
for (const passo of PASSI) {
  const righe = await daCambiare(passo);
  piani.push({ passo, righe });
  console.log(`\n→ ${righe.length} capi diventerebbero «${passo.a}»   (adesso sono ${conta(righe) || "—"})`);
  for (const r of righe.slice(0, 6)) console.log(`     ${String(r.genere).padEnd(8)} ${r.negozio.padEnd(16).slice(0, 16)} ${r.titolo.slice(0, 58)}`);
  if (righe.length > 6) console.log(`     …e altri ${righe.length - 6}`);
}

const totale = piani.reduce((s, p) => s + p.righe.length, 0);
if (!SCRIVI) {
  console.log(`\nIn tutto cambierebbero ${totale} capi. Non ho scritto niente.`);
  console.log("Per applicare:  node scripts/sistema-genere.mjs --scrivi");
  process.exit(0);
}

// La copia PRIMA di toccare: il vecchio valore altrimenti non si recupera,
// e "l'ho già scritto" non è una risposta accettabile davanti a un errore.
const copia = path.join(RADICE, `genere-prima-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`);
writeFileSync(copia, JSON.stringify(piani.flatMap((p) => p.righe.map((r) => ({ id: r.id, genere: r.genere }))), null, 1));
console.log(`\nCopia dei valori di prima: ${path.basename(copia)}`);

for (const { passo, righe } of piani) {
  for (let i = 0; i < righe.length; i += 200) {
    const gruppo = righe.slice(i, i + 200);
    await chiedi(`prodotti?id=in.(${gruppo.map((r) => r.id).join(",")})`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ genere: passo.a }),
    });
    process.stdout.write(`\r  «${passo.a}»: ${Math.min(i + 200, righe.length)}/${righe.length}   `);
  }
  console.log();
}
console.log(`\nFatto: ${totale} capi sistemati.`);
