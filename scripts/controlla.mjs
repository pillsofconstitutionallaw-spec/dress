// Il controllo: il catalogo vero passato dentro le decisioni dell'app.
//
//   npm run controlla              → tutto
//   npm run controlla -- colore    → una sezione sola
//   npm run controlla -- ruolo 30  → e con più esempi
//
// Solo lettura: non scrive niente, né sul database né su disco.
//
// ── perché esiste ────────────────────────────────────────────────────
//
// Quattro cose, in quest'app, vengono decise da elenchi di parole: per chi è
// un capo, di che colore è, quanto vale il suo tessuto e che posto occupa in
// un completo. Sbagliano in silenzio — nessun errore, nessuna riga rossa,
// solo un consiglio che non convince — e le prove non le prendono, perché le
// prove sanno solo quello che ci abbiamo già messo dentro.
//
// I difetti veri stanno nei dati veri, e in un solo pomeriggio sono usciti
// da qui: 23.322 capi con l'etichetta e senza punteggio perché la tabella
// delle fibre parlava solo italiano; 1.670 capi senza colore perché il
// vocabolario aveva «bianco» e i negozi scrivono «bianca»; 33.602 capi che
// non entravano in nessun completo perché «giacche» non contiene «giacca».
// Tre volte lo stesso difetto in tre elenchi diversi.
//
// ── come si legge ────────────────────────────────────────────────────
//
// I numeri in cima a ogni sezione dicono quanto grande è il buco. Ma la
// parte che conta è l'ELENCO IN FONDO: le parole che non sappiamo leggere,
// messe in fila per quanti capi ci costano. È lì che si vede il difetto —
// «pants» in cima a una lista di duemila capi senza ruolo è una diagnosi,
// «il 42% non ha un ruolo» è solo un numero.
//
// E un disaccordo non è di per sé un difetto: «vuoto, ma il nome dice donna»
// sono le millecento gonne che vogliamo riconoscere. Vanno guardati i
// titoli, sempre.

import { readFileSync } from "node:fs";
import path from "node:path";
import { perChiE } from "@/lib/capiPalette";
import { coloreDaNome, coloreNelTitolo, NOMI_COLORE } from "@/lib/colore";
import { ruoloDelCapo } from "@/lib/periodiAnno";
import { analizzaTessuto } from "@/scripts/importa-catalogo.mjs";

const RADICE = path.resolve(import.meta.dirname, "..");
const env = Object.fromEntries(
  readFileSync(path.join(RADICE, ".env.local"), "utf8")
    .split("\n")
    .filter((r) => r.includes("=") && !r.trim().startsWith("#"))
    .map((r) => [r.slice(0, r.indexOf("=")).trim(), r.slice(r.indexOf("=") + 1).trim()]),
);
if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Mancano SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const argomenti = process.argv.slice(2);
const SEZIONI = argomenti.filter((a) => !/^\d+$/.test(a));
const QUANTI = Number(argomenti.find((a) => /^\d+$/.test(a))) || 14;
const vuole = (nome) => !SEZIONI.length || SEZIONI.includes(nome);

// ── il catalogo, una volta sola ──────────────────────────────────────
const CAMPI = "id,negozio,titolo,categoria,genere,colore_nome,colore_hex,tessuto,qualita,disponibile";
const capi = [];
for (let da = 0; ; da += 1000) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/prodotti?select=${CAMPI}&order=id&offset=${da}&limit=1000`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const blocco = await res.json();
  capi.push(...blocco);
  process.stdout.write(`\rletti ${capi.length} capi   `);
  if (blocco.length < 1000) break;
}
const vivi = capi.filter((c) => c.disponibile);
console.log(`\n\n${capi.length} capi in catalogo, ${vivi.length} disponibili.`);

// ── gli attrezzi ─────────────────────────────────────────────────────
const conta = (righe, chiave) => {
  const m = new Map();
  for (const r of righe) {
    const k = chiave(r);
    if (k) m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m].sort((a, b) => b[1] - a[1]);
};

const titolo = (t) => console.log(`\n\n── ${t} ${"─".repeat(Math.max(0, 62 - t.length))}`);

const elenco = (righe, quante = QUANTI) => {
  for (const [k, n] of righe.slice(0, quante)) console.log(`   ${String(n).padStart(6)}  ${k}`);
  if (righe.length > quante) console.log(`          …e altre ${righe.length - quante}`);
};

// Gli esempi si pescano a passo regolare e non dalla cima: in cima c'è
// sempre lo stesso negozio, e un difetto che ne riguarda uno solo non si
// distingue da uno che li riguarda tutti.
const assaggio = (righe, quanti = 8) => {
  const passo = Math.max(1, Math.floor(righe.length / quanti));
  for (let i = 0; i < righe.length && i / passo < quanti; i += passo) {
    const c = righe[i];
    console.log(`      ${String(c.negozio).slice(0, 14).padEnd(14)} ${String(c.titolo).slice(0, 56)}`);
  }
};

const PAROLE_DA_SALTARE = new Set([
  "con", "in", "the", "and", "di", "da", "per", "of", "donna", "uomo", "women", "men", "womens",
  "mens", "new", "pack", "one", "cotton", "organic", "classic", "core", "black", "white", "blue",
  "green", "red", "pink", "grey", "gray", "navy", "light", "dark", "vintage", "size", "logo",
  "print", "printed", "silk", "wool", "leather", "unisex", "kids", "high", "sartorial",
]);

// Le parole più frequenti in un mucchio di capi. È l'attrezzo che ha trovato
// «pants» fra i capi senza ruolo: da sola una parola non dice niente, in
// cima a duemila capi è una diagnosi.
const paroleDi = (righe) => {
  const m = new Map();
  for (const c of righe) {
    const testo = `${c.titolo || ""} ${c.categoria || ""}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    for (const p of new Set(testo.replace(/[^a-z\s]/g, " ").split(/\s+/))) {
      if (p.length < 3 || PAROLE_DA_SALTARE.has(p)) continue;
      m.set(p, (m.get(p) || 0) + 1);
    }
  }
  return [...m].sort((a, b) => b[1] - a[1]);
};

// ── per chi è ────────────────────────────────────────────────────────
if (vuole("genere")) {
  titolo("per chi è il capo");
  const gruppi = new Map();
  for (const c of capi) {
    const detto = perChiE(c);
    if (detto === (c.genere || null)) continue;
    const salvato = c.genere || "vuoto";
    const nome = !c.genere ? `vuoto, ma il nome dice «${detto}»`
      : detto === "bambino" ? `salvato «${salvato}», il nome dice bambino`
      : c.genere === "bambino" ? `salvato bambino, il nome dice «${detto}»`
      : `SCONTRO: salvato «${salvato}», il nome dice «${detto}»`;
    if (!gruppi.has(nome)) gruppi.set(nome, []);
    gruppi.get(nome).push(c);
  }
  console.log(`   in disaccordo col dato salvato: ${[...gruppi.values()].reduce((s, v) => s + v.length, 0)} capi\n`);
  for (const [nome, righe] of [...gruppi].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`   ${String(righe.length).padStart(6)}  ${nome}`);
    if (/SCONTRO|bambino, il nome/.test(nome)) assaggio(righe, 4);
  }
}

// ── di che colore ────────────────────────────────────────────────────
if (vuole("colore")) {
  titolo("di che colore è");
  const daVocabolario = new Set(Object.values(NOMI_COLORE));
  const senzaColore = vivi.filter((c) => !c.colore_hex);
  const daNome = vivi.filter((c) => c.colore_hex && daVocabolario.has(c.colore_hex));
  const daFoto = vivi.filter((c) => c.colore_hex && !daVocabolario.has(c.colore_hex));
  console.log(`   senza nessun colore:     ${String(senzaColore.length).padStart(6)}  (invisibili alla ricerca per palette)`);
  console.log(`   colore letto da un nome: ${String(daNome.length).padStart(6)}`);
  console.log(`   colore misurato su foto: ${String(daFoto.length).padStart(6)}`);

  // Le foto che hanno misurato il fondale invece del capo: bianco spento o
  // nero pieno sono il muro dello studio, non un vestito.
  //
  // ── quello che è già stato provato, e non funziona ──
  //
  // Dove il titolo un colore lo dice, vince il titolo: è una regola che c'è
  // già, e ha sistemato 316 capi. Per gli altri — quelli qui sotto — sono
  // state provate tre strade e misurate tutte e tre, guardando ventiquattro
  // foto per volta con i due colori affiancati:
  //
  //   togliere il fondo prima di raggruppare  → 5 meglio, 4 peggio
  //   prendere il primo gruppo che non è muro → 6 meglio, 3 peggio
  //   ritagliare più stretto il centro        → nessun effetto
  //
  // Il motivo per cui nessuna funziona si legge nei pesi: su questi capi il
  // gruppo del muro pesa 0,72 · 0,89 · 0,95 · 0,99, e nessun gruppo ha una
  // tinta sopra 8. Il capo non forma proprio un gruppo suo — è piccolo E
  // spostato — quindi l'informazione è persa prima che si scelga. E le
  // perdite hanno uno schema: sono capi bianchi su fondo bianco, dove il
  // muro e il capo sono davvero lo stesso colore.
  //
  // Per recuperarli servirebbe trovare l'oggetto dentro l'inquadratura, che
  // è un'altra tecnica.
  //
  // ── e non vanno nemmeno cancellati ──
  //
  // La tentazione dopo tutto questo è toglierglielo, il colore: meglio
  // niente che sbagliato, un capo invisibile alla ricerca invece che un capo
  // che esce nella palette di un altro. Misurata anche questa, ed è la
  // risposta contraria.
  //
  // Guardati ventiquattro di questi capi — uno per negozio, la foto accanto
  // al colore che gli diamo — quattordici ce l'hanno GIUSTO. Non è un caso:
  // sono capi davvero bianchi, neri o argento fotografati su fondo bianco, e
  // lì il muro e il capo hanno lo stesso colore per davvero. Gli sbagliati
  // sono sei — una felpa nera Benetton segnata quasi bianca, un sandalo nude
  // segnato bianco, una camicia beige — e quattro stanno nel mezzo.
  //
  // Cancellarli tutti vorrebbe dire rendere invisibili quattordici capi
  // giusti per toglierne sei sbagliati. Restano dove sono.
  //
  // Sui numeri: la riga qui sotto conta 5.379, cioè i colori MISURATI che
  // sono quasi bianchi o quasi neri — i colori letti da un nome li ha già
  // tolti «daFoto», ed è giusto così. Quelli guardati sono i 4.455 in cui
  // nemmeno il negozio ha scritto un nome leggibile: gli altri un colore
  // dichiarato ce l'hanno, e vince quello.
  //
  // La trappola, per chi rifà il conto da fuori: sembraIlFondale() risponde
  // di sì anche al bianco del vocabolario (#F7F7F5), che non è stato
  // misurato ma letto. Contando senza distinguere vengono fuori quasi
  // novemila capi invece di quattromila e mezzo, e i quattromila di
  // differenza sono magliette bianche marcate benissimo. È successo.
  //
  // La strada percorribile, intanto, è l'elenco qui sotto: un nome di colore
  // letto è un capo che la foto non deve indovinare.
  const sospette = daFoto.filter((c) => /^#(0[0-9A-F]|1[0-2])/i.test(c.colore_hex) || /^#(E[89A-F]|F)/i.test(c.colore_hex));
  console.log(`      …di cui quasi bianche o nere: ${sospette.length}  (il muro dello studio — vedi il commento)`);

  const illeggibili = vivi.filter((c) => c.colore_nome && !coloreDaNome(c.colore_nome));
  console.log(`\n   i nomi di colore che il negozio scrive e noi non sappiamo leggere: ${illeggibili.length}`);
  elenco(conta(illeggibili, (c) => String(c.colore_nome).toLowerCase().trim()));

  const soloDalTitolo = vivi.filter((c) => !c.colore_nome && coloreNelTitolo(c.titolo));
  console.log(`\n   colore pescato da una parola del titolo (il negozio non l'ha detto): ${soloDalTitolo.length}`);
}

// ── quanto vale il tessuto ───────────────────────────────────────────
if (vuole("tessuto")) {
  titolo("quanto vale il tessuto");
  const conEtichetta = vivi.filter((c) => c.tessuto);
  const senzaVoto = conEtichetta.filter((c) => analizzaTessuto(c.tessuto).qualita === null);
  console.log(`   con la composizione letta: ${String(conEtichetta.length).padStart(6)}`);
  console.log(`   …e senza punteggio:        ${String(senzaVoto.length).padStart(6)}  (${Math.round((senzaVoto.length / Math.max(1, conEtichetta.length)) * 100)}%)`);
  console.log(`   senza nemmeno l'etichetta: ${String(vivi.length - conEtichetta.length).padStart(6)}`);

  // Solo i nomi che DAVVERO non sappiamo leggere. Contare tutti i nomi che
  // compaiono in un capo senza voto è una diagnosi sbagliata: un capo può
  // restare senza voto perché ne capiamo meno di metà, e allora nell'elenco
  // finisce anche «recycled polyester», che sappiamo leggere benissimo. Un
  // attrezzo che manda a caccia della cosa sbagliata è peggio di niente.
  const leggibile = new Map();
  const sappiamoLeggerla = (nome) => {
    if (!leggibile.has(nome)) leggibile.set(nome, analizzaTessuto(`100% ${nome}`).qualita !== null);
    return leggibile.get(nome);
  };

  const fibre = new Map();
  let perLaSoglia = 0;
  for (const c of senzaVoto) {
    let almenoUna = false;
    for (const pezzo of String(c.tessuto).split(", ")) {
      const nome = pezzo.replace(/^\d+%\s*/, "").trim();
      if (!nome) continue;
      if (sappiamoLeggerla(nome)) { almenoUna = true; continue; }
      fibre.set(nome, (fibre.get(nome) || 0) + 1);
    }
    if (almenoUna) perLaSoglia++;
  }
  console.log(`\n   di questi, ${perLaSoglia} una fibra la sappiamo leggere: il voto manca perché`);
  console.log(`   non arriviamo a capire metà del capo, ed è giusto che manchi.`);
  console.log(`\n   le fibre che davvero non sappiamo leggere:`);
  elenco([...fibre].sort((a, b) => b[1] - a[1]));
}

// ── che posto occupa in un completo ──────────────────────────────────
if (vuole("ruolo")) {
  titolo("che posto occupa in un completo");
  const senzaRuolo = vivi.filter((c) => !ruoloDelCapo(c.titolo, c.categoria));
  console.log(`   senza ruolo: ${senzaRuolo.length}  (${Math.round((senzaRuolo.length / vivi.length) * 100)}% — non entrano in nessun completo)\n`);
  elenco(conta(vivi, (c) => ruoloDelCapo(c.titolo, c.categoria) || "(nessuno)"), 8);

  console.log(`\n   le parole più frequenti fra i capi senza ruolo:`);
  console.log(`   (una che si ripete e descrive un capo è una parola che manca all'elenco)`);
  elenco(paroleDi(senzaRuolo));
}

console.log("\n");
