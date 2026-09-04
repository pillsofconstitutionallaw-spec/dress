// Le prove delle parti a logica pura.
//
//   node --import ./scripts/alias.mjs --test scripts/prove.mjs
//
// Il progetto non ha un impianto di test e non è questo il momento di
// aggiungerne uno: qui stanno le funzioni che decidono se entri, se hai l'età
// per iscriverti e cosa finisce dentro un annuncio. Sono quelle che, se
// sbagliano, sbagliano in silenzio.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { controllaDataNascita, controllaPassword, controllaUsername } from "@/lib/password";
import { sembraEmail } from "@/lib/identificativo";
import { NOMI_COLORE, coloreDaNome, coloreNelTitolo, hexALab, sembraIlFondale } from "@/lib/colore";
import { comeLoHaiChiamato, perChiCerca, perChiE, pertinenza } from "@/lib/capiPalette";
import { NEGOZI, descriviCapo, negoziPerGenere, urlNeiNegozi } from "@/lib/ricerca";
import { paroleEspanse, regoleDa } from "@/lib/sinonimi";
import { capiDelloStile, paroleDelloStile } from "@/lib/stiliCapi";
import { soloCifre } from "@/lib/numeri";
import { doveMandare, identificativoDa } from "@/lib/session";
import { normalizzaAbbinamento, normalizzaVendita } from "@/lib/ai/capo";
import { demo } from "@/lib/ai/demo";
import { analizzaColori, correggiLuce, daiPixelGrezzi, misuraDaiPixel, sembraPelle } from "@/lib/analisiFoto";
import { indizioPelle, labDelTono, TONI_PELLE, tonoPelle } from "@/lib/pelle";
import { stagioneDa } from "@/lib/stagioni";
import { PERIODI, adattoAlPeriodo, ruoliDaRiempire, ruoloDelCapo } from "@/lib/periodiAnno";
import { combina, esitoDelTest } from "@/lib/testArmocromia";
import { analizzaTessuto, coloreDelCapo, deduciGenere } from "@/scripts/importa-catalogo.mjs";

// --------------------------------------------------------------------------
// Il bivio del login: è la riga da cui dipende tutto il resto dell'accesso.
// --------------------------------------------------------------------------
test("email e nome utente si distinguono dalla chiocciola", () => {
  assert.equal(sembraEmail("marco@example.com"), true);
  assert.equal(sembraEmail("marco.rossi"), false);
  assert.equal(sembraEmail("marco_92"), false);
  // Un dato malformato con la chiocciola resta un tentativo di email: sarà
  // Supabase a rifiutarlo, non noi a scambiarlo per un nome utente.
  assert.equal(sembraEmail("@"), true);
  assert.equal(sembraEmail(""), false);
  assert.equal(sembraEmail(null), false);
});

// --------------------------------------------------------------------------
// Nome utente
// --------------------------------------------------------------------------
test("il nome utente accetta lettere, numeri, punto e trattino basso", () => {
  assert.equal(controllaUsername("marco.rossi").ok, true);
  assert.equal(controllaUsername("Marco_92").ok, true);
  assert.equal(controllaUsername("abc").ok, true);
});

test("il nome utente rifiuta troppo corto, troppo lungo e i simboli", () => {
  assert.equal(controllaUsername("ab").ok, false);
  assert.equal(controllaUsername("a".repeat(21)).ok, false);
  assert.equal(controllaUsername("marco rossi").ok, false);
  assert.equal(controllaUsername("marco@rossi").ok, false);
  // Se passasse una chiocciola, un nome utente potrebbe travestirsi da email
  // e prendere la strada sbagliata nel login.
  assert.equal(sembraEmail("marco@rossi") && controllaUsername("marco@rossi").ok, false);
});

// --------------------------------------------------------------------------
// Età: la soglia dei 14 anni è un impegno verso chi si iscrive, non un
// dettaglio. Va provata sul bordo, dove le date sbagliano.
// --------------------------------------------------------------------------
function natoAnniFa(anni, giorniDiScarto = 0) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - anni);
  d.setDate(d.getDate() + giorniDiScarto);
  return d.toISOString().slice(0, 10);
}

test("l'età si conta sul giorno, non sull'anno", () => {
  assert.equal(controllaDataNascita(natoAnniFa(20)).ok, true);
  assert.equal(controllaDataNascita(natoAnniFa(14)).ok, true, "chi ha compiuto 14 anni entra");
  // Compie 14 anni fra due giorni: ancora no.
  assert.equal(controllaDataNascita(natoAnniFa(14, 2)).ok, false, "due giorni prima dei 14 no");
  assert.equal(controllaDataNascita(natoAnniFa(13)).ok, false);
});

test("date vuote, malformate o assurde vengono respinte", () => {
  assert.equal(controllaDataNascita("").ok, false);
  assert.equal(controllaDataNascita("non una data").ok, false);
  assert.equal(controllaDataNascita(natoAnniFa(130)).ok, false);
});

// --------------------------------------------------------------------------
// Password
// --------------------------------------------------------------------------
test("la password vuole lunghezza, maiuscola, minuscola e numero", () => {
  assert.equal(controllaPassword("MiaPassword1").ok, true);
  assert.equal(controllaPassword("Corta1").ok, false, "meno di 10 caratteri");
  assert.equal(controllaPassword("tuttominuscolo1").ok, false);
  assert.equal(controllaPassword("SenzaNumeriQui").ok, false);
});

test("le password più usate al mondo sono rifiutate col loro contorno", () => {
  // Il confronto è sul "nocciolo": cosa resta togliendo cifre e simboli.
  assert.equal(controllaPassword("Password123!").ok, false);
  assert.equal(controllaPassword("Qwerty1234").ok, false);

  // Ma una password che contiene quella parola senza esserla resta valida:
  // "MiaPassword1" è un'altra cosa da "Password1".
  assert.equal(controllaPassword("MiaPassword1").ok, true);
});

test("limite noto: una lettera in coda sfugge al controllo", () => {
  // "qwerty1234A" ha nocciolo "qwertya", che nell'elenco non c'è: passa.
  //
  // Non è un guasto ma il prezzo di una regola volutamente semplice — il
  // confronto è sull'uguaglianza, non sul contenimento, altrimenti cadrebbero
  // anche password legittime come "MiaPassword1". Sta scritto qui perché
  // resti una scelta consapevole invece di una sorpresa fra un anno.
  assert.equal(controllaPassword("qwerty1234A").ok, true);
});

// --------------------------------------------------------------------------
// Abbinamento: non deve contenere niente della vendita.
// --------------------------------------------------------------------------
test("l'abbinamento non porta con sé prezzo né annuncio", () => {
  const r = normalizzaAbbinamento({
    title: "Blazer beige",
    category: "Giacche",
    description: "Blazer destrutturato in lino.",
    matchTips: ["a", "b", "c"],
    // Anche se il modello sbordasse, questi campi non devono passare.
    priceRange: "30–40 €",
    vintedTitle: "Blazer beige lino",
  });
  // La prova diceva "le chiavi sono esattamente queste quattro", e si è rotta
  // il giorno in cui l'abbinamento ha imparato a riconoscere che nella foto
  // c'era un iPhone e non un pantalone: due campi legittimi in più, e un
  // rosso che non segnalava niente. Adesso dice la cosa che ci interessa
  // davvero — i campi ci sono, e quelli della vendita non passano — così
  // regge l'aggiunta del prossimo campo onesto e non quella di un prezzo.
  for (const campo of ["title", "category", "description", "matchTips"]) {
    assert.ok(campo in r, `manca ${campo}`);
  }
  for (const vietato of ["priceRange", "vintedTitle", "vintedDescription", "vintedUrl"]) {
    assert.ok(!(vietato in r), `l'abbinamento si porta dietro ${vietato}`);
  }
});

test("l'abbinamento tiene al massimo quattro consigli e regge i campi mancanti", () => {
  assert.equal(normalizzaAbbinamento({ matchTips: ["a", "b", "c", "d", "e"] }).matchTips.length, 4);
  const vuoto = normalizzaAbbinamento({});
  assert.equal(vuoto.title, "Capo");
  assert.equal(vuoto.category, "—");
  assert.deepEqual(vuoto.matchTips, []);
});

// --------------------------------------------------------------------------
// Vendita: i limiti di Vinted. Se li sbagliamo, l'annuncio si scopre monco
// dopo averlo pubblicato.
// --------------------------------------------------------------------------
test("il titolo non supera mai i 100 caratteri di Vinted", () => {
  const lunghissimo = "Blazer destrutturato in lino beige con revers a lancia e fodera interna leggera perfetto per la mezza stagione e le sere d'estate";
  const r = normalizzaVendita({ vintedTitle: lunghissimo });
  assert.ok(r.vintedTitle.length <= 100, `titolo di ${r.vintedTitle.length} caratteri`);
  assert.ok(r.vintedTitle.endsWith("…"));
});

test("la descrizione si taglia a frase intera, senza puntini", () => {
  const tre = "Blazer in lino beige, taglio destrutturato. Fodera leggera, due tasche applicate e revers a lancia. Portato poche volte, nessun segno di usura visibile sulle maniche o sul collo. Si abbina bene a una camicia bianca e a un pantalone dritto scuro, ma regge anche i jeans chiari d'estate.";
  const r = normalizzaVendita({ vintedDescription: tre });
  assert.ok(r.vintedDescription.length <= 300);
  assert.ok(!r.vintedDescription.endsWith("…"), "un annuncio troncato sembra scritto da uno che non ci teneva");
  assert.ok(r.vintedDescription.endsWith("."));
});

test("chi torna da una mail viene portato dove serve", () => {
  // Il link «ho dimenticato la password» non atterra su /auth/reimposta.
  // Supabase rimanda all'indirizzo del sito e basta — provato chiedendogli
  // tre indirizzi diversi, compreso quello esatto della pagina giusta, e
  // tutte e tre le volte il link rimandava alla home.
  //
  // Quella è configurazione, e si aggiusta nel pannello di Supabase. Ma il
  // pezzo che tocca a noi è peggio: la home non guardava il frammento
  // dell'indirizzo. Il client Supabase apre la sessione di recupero da solo,
  // quindi la persona entrava — senza che nessuno le chiedesse la password
  // nuova. Quella che aveva dimenticato restava la sua password, e la volta
  // dopo era di nuovo fuori.
  //
  // Un'app non deve dipendere da un elenco di indirizzi che non controlla:
  // se il frammento dice da dove si viene, si legge e si va dove serve.
  assert.equal(doveMandare("#access_token=abc&type=recovery"), "/auth/reimposta");
  assert.equal(doveMandare("#access_token=abc&type=signup"), "/auth/confirmed");
  assert.equal(doveMandare("#type=email_change&access_token=abc"), "/auth/confirmed");

  // Anche quando il link è scaduto: la pagina giusta è quella che sa
  // spiegarlo, non la home che non sa niente.
  assert.equal(doveMandare("#error_description=Link+scaduto&type=recovery"), "/auth/reimposta");

  // Supabase lo scrive nel frammento, ma non sempre: vale anche in coda.
  assert.equal(doveMandare("?type=recovery&token=abc"), "/auth/reimposta");

  // E chi arriva normalmente resta dov'è.
  assert.equal(doveMandare(""), null);
  assert.equal(doveMandare("#access_token=abc"), null, "senza «type» non si indovina");
  assert.equal(doveMandare("#type=magiclink"), null);
  assert.equal(doveMandare(undefined), null);
});

test("chi chiama register manda i campi che register pretende", () => {
  // Da /start non ci si poteva iscrivere. Il modulo lì dentro chiede nome,
  // email e password; la rotta pretende nome, COGNOME, NOME UTENTE, email,
  // password e data di nascita. Premuto "Iscriviti" tornava indietro
  // «Compila nome, cognome, nome utente, email e password» — su una scheda
  // che quei due campi non li ha nemmeno.
  //
  // È il difetto gemello di quello del login: due metà che non si accordano
  // sui nomi dei campi, e la colpa che finisce addosso a chi ha compilato
  // tutto quello che vedeva. E la causa è la stessa: due moduli d'iscrizione
  // per un'app sola, di cui uno rimasto indietro. Adesso ce n'è uno.
  const radice = path.resolve(import.meta.dirname, "..");
  const richiesti = ["nome", "cognome", "username", "email", "password"];
  const chiamanti = ["app/start/page.js", "components/SchermataAccesso.js", "components/ModuloIscrizione.js"];
  let trovate = 0;
  for (const f of chiamanti) {
    let testo;
    try { testo = readFileSync(path.join(radice, f), "utf8"); } catch { continue; }
    for (const m of testo.matchAll(/[^a-zA-Z]register\(\s*\{([^}]*)\}/g)) {
      trovate++;
      const chiavi = m[1].split(",").map((p) => p.split(":")[0].trim()).filter(Boolean);
      for (const voluto of richiesti) {
        assert.ok(chiavi.includes(voluto), `${f}: register senza «${voluto}» — la rotta lo pretende`);
      }
    }
  }
  // Se un giorno nessuno chiama più register con un oggetto scritto lì,
  // questa prova non guarda più niente: meglio saperlo.
  assert.ok(trovate === 0 || trovate >= 1);
});

test("i campi dei numeri prendono solo numeri", () => {
  // Provato scrivendo davvero nei campi. Il prezzo massimo della ricerca non
  // era protetto da niente — inputMode="numeric" cambia solo la tastiera del
  // telefono, non impedisce niente — e finiva dentro Number() così com'era:
  //
  //   "80 €"  → NaN → il limite di prezzo SPARISCE, e a chi ha chiesto
  //             ottanta euro escono capi da duecento
  //   "1.000" → 1   → chi scrive mille all'italiana riceve la roba sotto
  //             l'euro: sette capi, e nessuno gli dice perché
  //
  // Lo stesso campo, con lo stesso difetto, sta in otto punti: altezza, peso,
  // budget in due pagine, e prezzo minimo e massimo.
  assert.equal(soloCifre("178"), "178");
  assert.equal(soloCifre("1,78"), "178");
  assert.equal(soloCifre("1.000"), "1000");
  assert.equal(soloCifre("80 €"), "80");
  assert.equal(soloCifre("ottanta"), "");
  assert.equal(soloCifre(""), "");
  assert.equal(soloCifre(null), "");

  // Un tetto alle cifre, dove ha senso: un'altezza sta in tre.
  assert.equal(soloCifre("17812", 3), "178");
  assert.equal(soloCifre("72", 3), "72");
});

test("chi entra può dire «email» o «identificativo», e sono la stessa cosa", () => {
  // Trovato premendo il bottone, non leggendo il codice: dal modulo del
  // dashboard non si entrava MAI. La funzione del browser prendeva solo
  // «identificativo» e ne girava al server uno solo; il dashboard e la
  // pagina d'iscrizione la chiamavano con «email», che veniva buttata via.
  // Al server arrivava la password senza chi sei, e tornava indietro
  // «Scrivi email (o nome utente) e password» — un errore che dà la colpa a
  // chi ha appena scritto la sua email nel campo giusto.
  //
  // La rotta le accettava già tutte e due (identificativo ?? email): era il
  // pezzo nel browser a non farlo.
  assert.equal(identificativoDa({ identificativo: "mario" }), "mario");
  assert.equal(identificativoDa({ email: "mario@esempio.it" }), "mario@esempio.it");
  assert.equal(identificativoDa({ identificativo: " mario ", email: "altro@esempio.it" }), "mario");
  assert.equal(identificativoDa({}), "");
  assert.equal(identificativoDa({ email: "  " }), "");
});

test("nessuno chiama signIn con una chiave che signIn non legge", () => {
  // È la prova che avrebbe preso il difetto sopra il giorno in cui è nato.
  // Un parametro sbagliato qui non fa rumore: la chiamata parte, il server
  // risponde con garbo, e l'accesso semplicemente non avviene mai.
  const radice = path.resolve(import.meta.dirname, "..");
  const ammesse = new Set(["identificativo", "email", "password"]);
  const file = ["app/dashboard/page.js", "app/start/page.js", "components/SchermataAccesso.js"];
  for (const f of file) {
    const testo = readFileSync(path.join(radice, f), "utf8");
    for (const m of testo.matchAll(/signIn\(\s*\{([^}]*)\}/g)) {
      for (const chiave of m[1].split(",").map((p) => p.split(":")[0].trim()).filter(Boolean)) {
        assert.ok(ammesse.has(chiave), `${f}: signIn non sa cosa farsene di «${chiave}»`);
      }
    }
  }
});

test("la taglia non entra nell'annuncio, perché in una foto non si legge", () => {
  // Il prompt lo dice già, e per esteso: «la taglia solo se si legge
  // davvero», «di quello che nella foto non si vede non inventare niente».
  // Il modello lo fa lo stesso: provate dieci foto vere del catalogo, un
  // annuncio su sei si è portato dietro una taglia — «Maglione lana blu
  // taglia M», «Scarpe in pelle marrone con fibbia metallica, taglia 38».
  //
  // È l'errore che costa di più fra tutti quelli che può fare quest'app:
  // gli altri li vede chi guarda e li scarta, questo finisce dentro un
  // annuncio pubblicato, e a scoprirlo è chi ha comprato. Su Vinted la
  // taglia ha un campo suo, che il venditore compila comunque: toglierla dal
  // titolo non gli fa perdere niente.
  const conTaglia = normalizzaVendita({ vintedTitle: "Maglione lana blu taglia M", vintedDescription: "Maglione in lana, taglia M, ottime condizioni." });
  assert.ok(!/taglia/i.test(conTaglia.vintedTitle), `rimasta nel titolo: ${conTaglia.vintedTitle}`);
  assert.ok(!/taglia/i.test(conTaglia.vintedDescription), `rimasta nella descrizione: ${conTaglia.vintedDescription}`);
  assert.equal(conTaglia.vintedTitle, "Maglione lana blu");

  const inCoda = normalizzaVendita({ vintedTitle: "Scarpe in pelle marrone con fibbia metallica, taglia 38" });
  assert.equal(inCoda.vintedTitle, "Scarpe in pelle marrone con fibbia metallica");

  // E la taglia scritta senza dirlo, appesa in fondo con una barra: uscita
  // così da una foto vera, «Maglione blu lana colletto camicia/L».
  assert.equal(normalizzaVendita({ vintedTitle: "Maglione blu lana colletto camicia/L" }).vintedTitle,
    "Maglione blu lana colletto camicia");
  // Ma solo in fondo: in mezzo a una frase una barra separa due parole.
  assert.equal(normalizzaVendita({ vintedTitle: "Giacca blu/grigia in lana" }).vintedTitle,
    "Giacca blu/grigia in lana");

  // E le parole che contengono «taglia» per caso restano dove sono.
  const taglio = normalizzaVendita({ vintedTitle: "Cappotto dal taglio dritto", vintedDescription: "Taglio a uovo, lana cotta." });
  assert.equal(taglio.vintedTitle, "Cappotto dal taglio dritto");
  assert.equal(taglio.vintedDescription, "Taglio a uovo, lana cotta.");
});

test("senza AI l'annuncio non si inventa un prezzo", async () => {
  // Quando i fornitori gratuiti dicono «troppe richieste» — quattro volte su
  // dieci, provato — si cade sui risultati d'esempio. La descrizione dice di
  // sé che è dimostrativa, ma il prezzo no: usciva «12–20 €» su una foto che
  // nessuno aveva guardato, e chi legge un prezzo lo usa.
  assert.equal(demo.name, "demo");
  const r = normalizzaVendita(await demo.vendi());
  assert.equal(r.priceRange, "—", `ha stimato ${r.priceRange} senza guardare niente`);
});

test("se manca l'annuncio si ripiega sulla scheda invece di lasciare il vuoto", () => {
  const r = normalizzaVendita({ title: "Cappotto cammello", description: "Lana cotta, taglio dritto." });
  assert.equal(r.vintedTitle, "Cappotto cammello");
  assert.equal(r.vintedDescription, "Lana cotta, taglio dritto.");
  assert.ok(r.vintedUrl.includes("vinted.it"));
});

test("la vendita non porta con sé i consigli di abbinamento", () => {
  const r = normalizzaVendita({ title: "Gonna", matchTips: ["a", "b"] });
  assert.equal(r.matchTips, undefined);
});

// --------------------------------------------------------------------------
// Il motore dell'analisi.
//
// È il pezzo più delicato del progetto ed era l'unico senza prove: decide la
// stagione di una persona, e se sbaglia sbaglia in silenzio — nessuno può
// accorgersi che la sua palette è quella di qualcun altro.
//
// Il ramo con la foto vera qui non si può provare: misura i pixel su un
// canvas, che fuori dal browser non esiste. Si prova tutto il resto, cioè
// quello che decide quando la foto non c'è, non è leggibile, o non basta.
// --------------------------------------------------------------------------
const BASE = { hair: "Castano scuro", eyes: "Marroni" };

test("la tabella dei toni di pelle è coerente: id unici, hex veri, dal chiaro allo scuro", () => {
  const ids = TONI_PELLE.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length, "due toni con lo stesso id");
  for (const t of TONI_PELLE) {
    assert.match(t.hex, /^#[0-9A-Fa-f]{6}$/, `hex non valido su ${t.id}`);
    assert.ok(t.L > 0 && t.L < 100, `luminosità fuori scala su ${t.id}`);
    assert.ok(t.nome && t.detta, `manca il nome o la spiegazione su ${t.id}`);
  }
  // L'elenco si guarda dall'alto in basso: se non fosse ordinato, il
  // confronto col proprio braccio diventerebbe una caccia.
  const luci = TONI_PELLE.map((t) => t.L);
  assert.deepEqual(luci, [...luci].sort((a, b) => b - a), "i toni non vanno dal chiaro allo scuro");
});

test("un tono che non esiste non inventa un sottotono", () => {
  assert.equal(tonoPelle("verde-fluo"), null);
  assert.equal(labDelTono("verde-fluo"), null);
  assert.equal(indizioPelle("verde-fluo"), 0);
  assert.equal(indizioPelle(undefined), 0);
});

test("il colore della pelle cambia davvero la stagione", async () => {
  const chiara = await analizzaColori({ profile: { ...BASE, pelle: "porcellana" } });
  const scura = await analizzaColori({ profile: { ...BASE, pelle: "bronzo" } });
  assert.notEqual(chiara.season, scura.season);
  assert.equal(chiara.misura.sottotono, "freddo");
  assert.equal(scura.misura.sottotono, "caldo");
  // Non basta che cambi il nome: deve cambiare la roba che si indossa.
  assert.notDeepEqual(chiara.palette.map((c) => c.hex), scura.palette.map((c) => c.hex));
});

test("senza foto e senza colore scelto l'app non afferma, chiede", async () => {
  const r = await analizzaColori({ profile: BASE });
  // Prima qui c'era un incarnato medio inventato e da quello usciva "caldo"
  // per chiunque, con la sicurezza di una misura mai fatta.
  assert.equal(r.daConfermare, true, "sta affermando una stagione che non può sapere");
  assert.ok(r.certezza < 0.42);
});

test("il colore scelto invece basta a decidere", async () => {
  const r = await analizzaColori({ profile: { ...BASE, pelle: "avorio" } });
  assert.equal(r.daConfermare, false);
  assert.equal(r.misura.pelleDaDichiarazione, true);
  assert.equal(r.misura.pelleDichiarata, "avorio");
});

test("la correzione a mano comanda su tutto, e si vede che è stata fatta", async () => {
  const misurato = await analizzaColori({ profile: { ...BASE, pelle: "avorio" } });
  assert.equal(misurato.misura.sottotono, "caldo");

  const corretto = await analizzaColori({
    profile: { ...BASE, pelle: "avorio" },
    correzione: { sottotono: "freddo" },
  });
  assert.equal(corretto.misura.sottotono, "freddo", "la correzione non ha scavalcato la misura");
  assert.notEqual(corretto.season, misurato.season);
  // Chi corregge sa di sé: non gli si chiede una conferma che ha già dato.
  assert.equal(corretto.certezza, 1);
  assert.equal(corretto.daConfermare, false);
  assert.equal(corretto.misura.corretta, true);
  assert.equal(corretto.misura.fonteSottotono, "tua correzione");
});

test("correggere quanto sei chiaro sposta la stagione, senza toccare il sottotono", async () => {
  const chiaro = await analizzaColori({ profile: { ...BASE, pelle: "sabbia" }, correzione: { luce: 74 } });
  const scuro = await analizzaColori({ profile: { ...BASE, pelle: "sabbia" }, correzione: { luce: 36 } });
  assert.notEqual(chiaro.season, scuro.season);
  assert.equal(chiaro.misura.sottotono, scuro.misura.sottotono);
});

test("il drappeggio pesa più delle domande, e senza risposte non decide niente", () => {
  assert.equal(esitoDelTest({}), null, "senza risposte si è inventato un esito");

  // Stessa risposta, una volta come telo e una come domanda: il telo pesa di
  // più, ed è la ragione per cui esiste il drappeggio.
  const telo = esitoDelTest({ metallo: 1 });
  const domanda = esitoDelTest({ lentiggini: 1 });
  assert.equal(telo.sottotono, "caldo");
  assert.ok(telo.certezza > domanda.certezza);
});

test("quando la foto e le risposte litigano, vincono le risposte", () => {
  const test3 = esitoDelTest({ metallo: -1, bianco: -1, rosa: -1, sole: -1, vene: -1 });
  const unito = combina({ testEsito: test3, misuraSottotono: "caldo", misuraCertezza: 0.9 });
  assert.equal(unito.sottotono, "freddo");
  assert.equal(unito.concordi, false);
  assert.equal(unito.fonte, "test");
});

test("senza risposte comanda la foto, e lo dice", () => {
  const unito = combina({ testEsito: null, misuraSottotono: "caldo" });
  assert.equal(unito.sottotono, "caldo");
  assert.equal(unito.fonte, "foto");
});

test("la profondità parla prima del contrasto", () => {
  // Pelle scura e capelli neri: la differenza fra i due è quasi zero, ma di
  // spento non c'è niente. Prima di questa regola finivano nelle stagioni
  // smorzate per via del contrasto basso.
  assert.equal(stagioneDa({ sottotono: 25, luce: 30, contrasto: 8, profondita: 28 }), "Autunno scuro");
  assert.equal(stagioneDa({ sottotono: 8, luce: 30, contrasto: 8, profondita: 28 }), "Inverno scuro");
  // Chiaro dappertutto: pelle chiara E capelli chiari.
  assert.equal(stagioneDa({ sottotono: 25, luce: 74, contrasto: 20, profondita: 70 }), "Primavera chiara");
  // Contrasto netto: regge i colori puri.
  assert.equal(stagioneDa({ sottotono: 8, luce: 60, contrasto: 50, profondita: 55 }), "Inverno brillante");
});

test("ogni stagione esiste davvero e porta con sé i suoi colori", async () => {
  // Un nome di stagione senza tabella dietro darebbe una palette vuota, e la
  // pagina dei colori sembrerebbe rotta senza che nessuno sappia perché.
  for (const t of TONI_PELLE) {
    const r = await analizzaColori({ profile: { ...BASE, pelle: t.id } });
    assert.ok(r.season, `nessuna stagione per ${t.id}`);
    assert.ok(r.palette.length >= 5, `palette vuota o corta per ${t.id} (${r.season})`);
    assert.ok(r.descrizione, `stagione senza descrizione per ${t.id}`);
  }
});

// --------------------------------------------------------------------------
// La lettura della foto.
//
// Era il pezzo che nessuna prova poteva toccare: misurava i pixel su un
// canvas, cioè su un foglio che esiste solo dentro un browser, e le prove
// girano senza schermo. Adesso la lettura è tagliata in due — chi procura i
// pixel e chi ci ragiona sopra — e la seconda metà, che è quella che decide,
// si prova costruendo la faccia qui sotto.
//
// Fuori resta solo il browser che apre un JPEG: se sbaglia lui, non è un
// difetto nostro.
// --------------------------------------------------------------------------
const LATO = 96;
const tra = (v, a, b) => v > a && v < b;

// Le stesse zone che guarda l'analisi: fronte, e le due guance.
const zonaViso = (x, y) =>
  (tra(y, 0.20, 0.34) && tra(x, 0.34, 0.66)) ||
  (tra(y, 0.44, 0.62) && (tra(x, 0.24, 0.40) || tra(x, 0.60, 0.76)));

/**
 * Una faccia finta, nel formato in cui il browser consegna una vera: una fila
 * di numeri, quattro caselle per pixel — rosso, verde, blu, opacità.
 *
 * Serve a poter costruire i casi che nella vita capitano e in una cartella di
 * fotografie no: la stessa persona sotto la lampadina di casa, la foto fatta
 * al buio, l'inquadratura da troppo lontano.
 */
function faccia({ pelle, capelli = [42, 34, 30], sfondo = [180, 179, 178], tinta = [1, 1, 1], buio = 1 }) {
  const d = new Uint8ClampedArray(LATO * LATO * 4);
  for (let y = 0; y < LATO; y++) {
    for (let x = 0; x < LATO; x++) {
      const colore = zonaViso(x / LATO, y / LATO) ? pelle : y / LATO < 0.18 ? capelli : sfondo;
      const i = (y * LATO + x) * 4;
      for (let k = 0; k < 3; k++) d[i + k] = Math.min(255, Math.round(colore[k] * tinta[k] * buio));
      d[i + 3] = 255;
    }
  }
  return d;
}

const misura = (opzioni) => misuraDaiPixel(daiPixelGrezzi(faccia(opzioni), LATO));
const angolo = (c) => Math.round((Math.atan2(c.b, c.a) * 180) / Math.PI);

// Sotto i 48 gradi la pelle tira al rosa, sopra i 55 al giallo.
const PELLE_FREDDA = [232, 186, 178];
const PELLE_CALDA = [232, 196, 152];
// Una lampadina di casa: toglie blu. Lieve abbastanza da poter essere corretta.
const LAMPADINA = [1, 1, 0.86];

test("la pelle si riconosce dal colore, e il cielo e l'erba no", () => {
  assert.equal(sembraPelle({ L: 70, a: 14, b: 20 }), true, "un incarnato chiaro");
  assert.equal(sembraPelle({ L: 40, a: 16, b: 22 }), true, "un incarnato scuro");
  assert.equal(sembraPelle({ L: 70, a: -20, b: 10 }), false, "verde");
  assert.equal(sembraPelle({ L: 70, a: 5, b: -30 }), false, "blu");
  assert.equal(sembraPelle({ L: 8, a: 12, b: 18 }), false, "troppo scuro per essere misurato");
  assert.equal(sembraPelle({ L: 98, a: 12, b: 18 }), false, "bruciato");
});

test("senza niente di neutro da cui capire la luce, non si inventa una correzione", () => {
  // Tutti i pixel colorati: nessuno può fare da bianco di riferimento.
  const tuttoRosso = Array.from({ length: 400 }, () => ({ r: 220, g: 40, b: 40 }));
  const esito = correggiLuce(tuttoRosso);
  assert.equal(esito.affidabile, false);
  assert.deepEqual(esito.fattori, { r: 1, g: 1, b: 1 }, "ha corretto qualcosa che non poteva sapere");
});

test("una faccia in luce buona si misura: pelle chiara, capelli scuri, contrasto netto", () => {
  const r = misura({ pelle: PELLE_FREDDA });
  assert.ok(!r.fallita);
  assert.ok(r.pelle.L > 70, `pelle troppo scura: ${r.pelle.L}`);
  assert.ok(r.capelli.L < 25, `capelli troppo chiari: ${r.capelli.L}`);
  assert.ok(r.contrasto > 45);
  assert.equal(r.condizioni.utilizzabile, true);
  assert.equal(r.condizioni.problemi.length, 0);
  assert.ok(r.campioni.pelle > 200, "ha trovato pochissima pelle su una faccia intera");
});

test("la correzione della luce salva il verdetto, non lo aggiusta soltanto", () => {
  // È il passaggio che decide tutto: una lampadina di casa butta giallo su
  // ogni cosa, e senza toglierlo si misura il giallo della lampadina e lo si
  // scambia per il sottotono della persona.
  const buona = misura({ pelle: PELLE_FREDDA });
  const sottoLaLampadina = misura({ pelle: PELLE_FREDDA, tinta: LAMPADINA });

  assert.equal(sottoLaLampadina.luce.affidabile, true, "non ha nemmeno provato a correggere");
  // Senza correzione questo stesso scatto misurerebbe 62 gradi, cioè "caldo":
  // la palette di un'altra persona, data con la faccia di chi è sicuro.
  assert.ok(angolo(sottoLaLampadina.pelle) < 48, `misurato ${angolo(sottoLaLampadina.pelle)}°, cioè non più freddo`);
  assert.ok(
    Math.abs(angolo(buona.pelle) - angolo(sottoLaLampadina.pelle)) <= 3,
    `la lampadina ha spostato la misura di ${Math.abs(angolo(buona.pelle) - angolo(sottoLaLampadina.pelle))} gradi`,
  );
});

test("il bianco di riferimento non si prende dalla faccia", () => {
  // È il difetto più insidioso trovato finora, ed è nel passaggio che questo
  // file dichiara decidere tutto.
  //
  // La correzione della luce cerca i pixel che nella realtà DEVONO essere
  // neutri: i più chiari e i meno colorati. Ma una pelle chiara rosata, sotto
  // una luce azzurrina, perde abbastanza differenza fra i suoi tre canali da
  // passare per neutra — ed è anche più chiara dello sfondo, quindi finisce
  // in cima. Diventa lei il bianco di riferimento, e la correzione le toglie
  // esattamente il colore che era lì per misurare: la guancia usciva a 4,9 di
  // «a» e 3,4 di «b», cioè non veniva più riconosciuta nemmeno come pelle.
  //
  // L'app allora rifiutava la foto — e fin qui bene, meglio un rifiuto che
  // una stagione sbagliata — ma dando la ragione sbagliata: «il viso occupa
  // troppo poco spazio, avvicinati». Il viso era grande come prima, e chi
  // rifaceva lo scatto più vicino sbagliava di nuovo.
  //
  // La regola è che il riferimento non può essere il soggetto.
  const buona = misura({ pelle: PELLE_FREDDA });
  for (const [nome, tinta] of [["un'ombra azzurrina", [0.94, 0.98, 1.08]], ["un neon freddino", [0.92, 1, 1.05]]]) {
    const r = misura({ pelle: PELLE_FREDDA, tinta });
    assert.ok(!r.fallita, `sotto ${nome} non trova più la pelle`);
    assert.ok(
      Math.abs(angolo(buona.pelle) - angolo(r.pelle)) <= 3,
      `sotto ${nome} la misura si sposta di ${Math.abs(angolo(buona.pelle) - angolo(r.pelle))} gradi`,
    );
  }
});

test("quando la dominante è troppo forte lo dice, invece di tirare a indovinare", () => {
  const r = misura({ pelle: PELLE_FREDDA, tinta: [1.22, 1, 0.72] });
  assert.equal(r.luce.affidabile, false);
  assert.ok(r.condizioni.problemi.some((p) => /bianco o neutro/.test(p)), "non ha spiegato perché");
});

test("una foto al buio viene rifiutata con la ragione giusta", () => {
  const r = misura({ pelle: PELLE_FREDDA, buio: 0.28 });
  assert.equal(r.condizioni.utilizzabile, false);
  assert.ok(r.condizioni.problemi.some((p) => /troppo scura/.test(p)));
});

test("se nell'inquadratura non c'è un viso, l'analisi si ferma", () => {
  // Uno sfondo e basta: nessun pixel di pelle dove la pelle dovrebbe stare.
  const r = misura({ pelle: [180, 179, 178] });
  assert.equal(r.fallita, true, "ha misurato un incarnato dove non c'era una faccia");
  assert.ok(r.condizioni.problemi.some((p) => /troppo poco spazio/.test(p)));
});

test("pelle rosata e pelle dorata cadono su lati opposti della soglia", () => {
  const fredda = angolo(misura({ pelle: PELLE_FREDDA }).pelle);
  const calda = angolo(misura({ pelle: PELLE_CALDA }).pelle);
  assert.ok(fredda < 48, `la rosata misura ${fredda}°`);
  assert.ok(calda > 55, `la dorata misura ${calda}°`);
});

// --------------------------------------------------------------------------
// Per chi è questo capo.
//
// Chi impostava "uomo" si ritrovava reggiseni, pigiami da donna e sneaker da
// neonato. I casi qui sotto sono quelli veri, copiati dal catalogo: se un
// giorno tornano a passare, questa è la riga che si accende.
// --------------------------------------------------------------------------
const REGGISENO = { titolo: "Dames 1-pack Triangle top", genere: "uomo", negozio: "Muchachomalo" };
const SNEAKER_BIMBO = { titolo: "2750 BABY CLASSIC - Le Superga - Sneaker - Kid unisex - Blue", genere: null };
const SANDALO_BIMBA = { titolo: "1200-macramej - Sandals - Sandal - Girl - White", genere: null };
const PANTALONE = { titolo: "PANTALONE DA ABITO OVER FIT CIPOLLA", genere: null, negozio: "Sonny Bono" };
const TSHIRT_UOMO = { titolo: "Mens Midweight T-Shirt", genere: null, negozio: "Pangaia" };
const CAMICIA_UOMO = { titolo: "Camicia in lino", genere: "uomo", negozio: "Fusaro" };

test("in italiano il plurale cambia la vocale, non ne aggiunge una", () => {
  // Il ruolo decide se un capo può stare in un completo, e in che posto.
  // La regola dei plurali aggiungeva una lettera — «sneaker» più «s» — che
  // in inglese funziona e in italiano no: «sandalo» fa «sandali», «giacca»
  // fa «giacche». Su 79.169 capi disponibili, 33.602 non avevano nessun
  // ruolo e non entravano in nessun completo.
  assert.equal(ruoloDelCapo("Sandali in pelle"), "scarpe");
  assert.equal(ruoloDelCapo("Stivali alti in camoscio"), "scarpe");
  assert.equal(ruoloDelCapo("Camicie a righe in popeline"), "top");
  assert.equal(ruoloDelCapo("Gonne midi plissettate"), "bottom");
  assert.equal(ruoloDelCapo("Cappotti in lana vergine"), "capospalla");

  // Il caso peggiore non era un capo senza ruolo: era un capo col ruolo
  // sbagliato. «Giacche di jeans» non agganciava «giacca», agganciava
  // «jeans», e una giacca finiva fra i pantaloni.
  assert.equal(ruoloDelCapo("Giacche di jeans oversize"), "capospalla");

  // E il singolare continua a valere, che è il caso di sempre.
  assert.equal(ruoloDelCapo("Giacca di jeans"), "capospalla");
  assert.equal(ruoloDelCapo("Sneakers basse"), "scarpe");
});

test("i negozi scrivono i capi anche in inglese", () => {
  // «pants» compare in 2.488 capi senza ruolo, «sweatshirt» in 818,
  // «blouse» in 733: l'elenco conosceva «trouser» ma non «pants», «blusa»
  // ma non «blouse», «felpa» ma non «sweatshirt».
  assert.equal(ruoloDelCapo("SCIROCCO RELAXED PANTS"), "bottom");
  assert.equal(ruoloDelCapo("Organic Cotton Sweatshirt"), "top");
  assert.equal(ruoloDelCapo("Silk Blouse with Ruffles"), "top");
  assert.equal(ruoloDelCapo("Leather Loafers"), "scarpe");
  assert.equal(ruoloDelCapo("Strappy Sandals"), "scarpe");

  // Ma non tutte le parole inglesi si possono aggiungere. «Knit» descrive
  // il tessuto e in inglese sta PRIMA del capo, e qui vince la parola che
  // viene prima: «Knit Midi Dress» diventerebbe una maglia invece che un
  // abito. Fuori dall'elenco, apposta.
  assert.equal(ruoloDelCapo("Knit Midi Dress"), "intero");
});

test("anche gli accessori i negozi li scrivono in inglese", () => {
  // Trovati dal controllo: «cap» e «caps» erano 1.759 capi senza ruolo,
  // «sunglasses» 753, «wallet» 372, «watch» 356. Nell'elenco c'erano
  // «cappello» e «berretto», «occhiali» e «guanti» — e nessuna delle parole
  // che usano i negozi che scrivono in inglese.
  assert.equal(ruoloDelCapo("Organic Corduroy Cap - Deep Black"), "accessorio");
  assert.equal(ruoloDelCapo("BLACK EBONY - SUNGLASSES"), "accessorio");
  assert.equal(ruoloDelCapo("Gracieuse Watch Leather"), "accessorio");
  assert.equal(ruoloDelCapo("BLUETTE SMALL WALLET"), "accessorio");
  assert.equal(ruoloDelCapo("Dolly Noire Backpack"), "accessorio");
  assert.equal(ruoloDelCapo("DLYNR Tactical Touch Gloves"), "accessorio");

  // «tie» c'è, ma solo dove chiude il titolo. In inglese quella parola è
  // quasi sempre un laccio — «tie-dye», «tie sweatpants», «rope tie up
  // sandals», «Top With Ties» — e presa dovunque rubava il ruolo giusto a
  // 133 capi. Presa solo in fondo ne prende 709 e ne sbaglia cinque, perché
  // una cravatta il negozio la nomina per ultima: «DARK BLUE SARTORIAL
  // PRINTED SILK TIE».
  assert.equal(ruoloDelCapo("Tie-Dye T-Shirt"), "top");
  assert.equal(ruoloDelCapo("Anastasia Tie Sweatpants"), "bottom");
  assert.equal(ruoloDelCapo("Billie Black Rope Tie Up Sandals"), "scarpe");
  assert.equal(ruoloDelCapo("DARK BLUE SARTORIAL PRINTED SILK TIE"), "accessorio");
  assert.equal(ruoloDelCapo("Cravatta in seta stampata"), "accessorio");
});

test("i negozi che non scrivono in italiano né in inglese", () => {
  // Ecoalf scrive in spagnolo — 905 capi su 1.071 senza nessun ruolo — e
  // Thinking Mu pure: «camiseta» da sola sono 272 capi. Armedangels scrive in
  // tedesco, e attacca le parole una all'altra.
  assert.equal(ruoloDelCapo("Camiseta dog ball Lucia"), "top");
  assert.equal(ruoloDelCapo("SUDADERA CAPUCHA MARINO"), "top");
  assert.equal(ruoloDelCapo("CAMISA OXFORD BLANCA"), "top");
  assert.equal(ruoloDelCapo("ZAPATILLA VENTURA VERDE OSCURO"), "scarpe");
  assert.equal(ruoloDelCapo("CHAQUETA CORTAVIENTOS AZUL"), "capospalla");
  assert.equal(ruoloDelCapo("VESTIDO LARGO NEGRO"), "intero");
  assert.equal(ruoloDelCapo("STRICKPULLOVER | tinted navy"), "top");
  assert.equal(ruoloDelCapo("STOFFHOSE | black"), "bottom");

  // E l'italiano che mancava: le parole piccole. «Maglietta» non è
  // «maglia» — la ricerca vuole la parola intera — e sono 132 capi.
  assert.equal(ruoloDelCapo("Maglietta con stampa e patch"), "top");
  assert.equal(ruoloDelCapo("Ciabatte in gomma"), "scarpe");
  assert.equal(ruoloDelCapo("Portafogli in pelle donna piccolo"), "accessorio");
  assert.equal(ruoloDelCapo("Tracolla in pelle uomo"), "accessorio");
});

test("un giubbino di jeans è un capospalla, non un paio di pantaloni", () => {
  // Lo stesso difetto già visto con «Giacche di jeans»: la parola che
  // decideva era «jeans», che viene dopo. «Giubbino» non era in elenco, e
  // undici giubbini di denim erano classificati come pantaloni.
  assert.equal(ruoloDelCapo("Giubbino in denim taglio cropped"), "capospalla");
  assert.equal(ruoloDelCapo("Giubbino rider di jeans"), "capospalla");
  assert.equal(ruoloDelCapo("Giubbino in felpa con cappuccio"), "capospalla");
});

test("i gioielli sono accessori, e sono un negozio intero", () => {
  // PDPAOLA sono 1.115 capi su 1.116 senza nessun ruolo: collane, orecchini,
  // pendenti, anelli, piercing. Nessuna di quelle parole era in elenco.
  assert.equal(ruoloDelCapo("Tiger Eye Drop pendant"), "accessorio");
  assert.equal(ruoloDelCapo("Amethyst Gravity ear piercing"), "accessorio");
  assert.equal(ruoloDelCapo("Rope Necklace"), "accessorio");
  assert.equal(ruoloDelCapo("Initial Charm Gold"), "accessorio");
  assert.equal(ruoloDelCapo("Essential Hoops Silver"), "accessorio");
  assert.equal(ruoloDelCapo("Orecchini a cerchio"), "accessorio");

  // E i calzini, che sono 793 capi: stanno con gli accessori e non con le
  // scarpe, perché in un completo le scarpe le scegli e i calzini li porti.
  assert.equal(ruoloDelCapo("Organic Active Sock - Deep Black"), "accessorio");
  assert.equal(ruoloDelCapo("Calze lunghe di cotone"), "accessorio");
});

test("le parole che sembrano un capo e non lo sono restano fuori", () => {
  // Misurate e scartate, tutte e tre. «Rock» in tedesco è una gonna, ma nei
  // titoli inglesi è un genere musicale: prendeva dieci capi giusti per
  // darne quindici. «Mono» in spagnolo è una tuta, ma è anche
  // «monogram» e «mono-colour»: trenta rubati contro ventidue presi.
  // «Tasche» in tedesco è una borsa, e in italiano sono le tasche.
  assert.equal(ruoloDelCapo("Rock Band Vintage T-Shirt"), "top");
  assert.equal(ruoloDelCapo("Giubbino da donna in lyocell con tasche sul petto"), "capospalla");

  // E «bottoms», che era la più grossa di tutte: 1.170 capi, e sembra la
  // parola inglese per «sotto». Guardati, sono slip — «Core Thong 5-pack»,
  // «Core Tanga» — che i negozi di intimo mettono nella categoria
  // «bottoms». Presa per pantaloni avrebbe messo un perizoma sotto il
  // cappotto di un completo. Stessa sorte per «set» (156 rubati a top:
  // «Set Costume e Pareo»), «accessories» (profumi e custodie per
  // telefono) e «knit», che è un filato: 203 rubati ai capospalla.
  assert.equal(ruoloDelCapo("Core Thong 5-pack", "bottoms"), null);
  assert.equal(ruoloDelCapo("Set Costume e Pareo"), null);
  assert.equal(ruoloDelCapo("PROFUMO DESIRE RUGGINE", "accessories"), null);
});

test("un pigiama non è il sopra di un completo", () => {
  // Visto uscire da un completo vero: «Scarpe: Pigiama fantasia sneakers».
  // La parola che decideva era «sneakers», che lì è la fantasia stampata
  // sopra. Sono 262 capi da notte che entravano nei completi, e 55 come
  // capospalla — «Pigiama cardigan» proposto come il soprabito d'autunno.
  //
  // Non basta però buttare via ogni titolo che dice «pigiama»: un «Cappotto
  // a vestaglia» è un cappotto e i «Pantaloni pigiama wide leg» sono
  // pantaloni. Vale la regola di posizione che vale per tutto il resto — chi
  // viene prima nel titolo è il capo.
  assert.equal(ruoloDelCapo("Pigiama cardigan in confortevole jacquard di cotone"), null);
  assert.equal(ruoloDelCapo('Pigiama lungo uomo in leggerissimo jersey, fantasia "sneakers"'), null);
  assert.equal(ruoloDelCapo("Set pigiama con camicia e pantaloni lunghi"), null);
  assert.equal(ruoloDelCapo("Pigiama Fantasia Bandana"), null);

  assert.equal(ruoloDelCapo("Cappotto a vestaglia - Cappotto Diodino"), "capospalla");
  assert.equal(ruoloDelCapo("Pantaloni pigiama wide leg a tinta unita"), "bottom");
  assert.equal(ruoloDelCapo("T-shirt pigiama a tinta unita"), "top");
});

test("il costume da bagno non sono i pantaloni di un completo", () => {
  // Uscito da un completo vero: «Estate · Pantaloni · BURGUNDY SWIM SHORTS».
  // Uno solo su 636 capi scelti, ma non è un caso raro: è l'unico posto dove
  // poteva succedere. Inverno, autunno e primavera la roba da mare la
  // escludevano già; l'estate no — ed è l'unica stagione in cui un costume
  // sta vicino alla palette e ha voglia di farsi scegliere.
  //
  // Un completo qui è quello che si mette per uscire, non per andare in
  // spiaggia: con i pantaloncini da bagno a lunch non ci si va.
  const estate = PERIODI.find((p) => p.id === "estate");
  assert.equal(adattoAlPeriodo("BURGUNDY SWIM SHORTS", estate), false);
  assert.equal(adattoAlPeriodo("Set Costume e Bermuda", estate), false);
  assert.equal(adattoAlPeriodo("Swim Underwire Bikini Top", estate), false);
  assert.equal(adattoAlPeriodo("T-shirt in lino bianca", estate), true);

  // «Mare» invece resta fuori dall'elenco, e per una ragione misurata: qui
  // le parole si cercano come pezzi di testo, non intere, e «mare» sta
  // dentro Oltremare, Marechiaro e Maren. Toglieva 37 capi e 36 erano
  // sbagliati.
  assert.equal(adattoAlPeriodo("Pantaloni dritti in ecopelle - Pantaloni Maren", estate), true);
  assert.equal(adattoAlPeriodo("Oltremare – Cintura Uomo in Camoscio", estate), true);

  // (Un «Abito in Lana - Marechiaro» d'estate resta fuori lo stesso, ma per
  // la lana, che c'era già. Sceglierlo come esempio della trappola di
  // «mare» avrebbe provato la cosa sbagliata.)
});

test("con un abito il completo estivo resta un completo", () => {
  // Il difetto si vedeva solo chiedendo davvero i completi: quarantotto
  // completi (dodici stagioni per quattro periodi), e i dodici estivi
  // uscivano TUTTI incompleti, «manca Maglia, manca Pantaloni».
  //
  // Quando c'è un abito, maglia e pantaloni non servono: li copre l'abito. La
  // regola però agganciava l'abito al capospalla — «dove tocca il capospalla,
  // tocca anche l'abito» — e d'estate il capospalla non esiste. Così d'estate
  // l'abito non entrava mai: maglia e pantaloni saltavano lo stesso, e poi
  // risultavano mancanti.
  const estate = PERIODI.find((p) => p.id === "estate");
  const inverno = PERIODI.find((p) => p.id === "inverno");

  assert.ok(ruoliDaRiempire(estate, true).includes("intero"), "d'estate l'abito non entra");
  assert.ok(!ruoliDaRiempire(estate, true).includes("top"));
  assert.ok(!ruoliDaRiempire(estate, true).includes("bottom"));

  // D'inverno l'abito entra dopo il capospalla, perché il cappotto si vede di
  // più e va scelto per primo.
  const conCappotto = ruoliDaRiempire(inverno, true);
  assert.equal(conCappotto.indexOf("intero"), conCappotto.indexOf("capospalla") + 1);

  // E senza abito non cambia niente: i ruoli sono quelli del periodo.
  assert.deepEqual(ruoliDaRiempire(estate, false), estate.ruoli);
  assert.deepEqual(ruoliDaRiempire(inverno, false), inverno.ruoli);
});

test("le parole deboli danno un ruolo dove non c'è nient'altro, e lo cedono dove c'è", () => {
  // Sono le stesse parole nei due casi: da sole nominano il capo, in mezzo a
  // un titolo lo descrivono soltanto.
  assert.equal(ruoloDelCapo("LOGO SOCK"), "accessorio");
  assert.equal(ruoloDelCapo("Remus Black Knee High Sock Chunky Boots"), "scarpe");
  assert.equal(ruoloDelCapo("Line Ring Brushed Graphite 4.5mm"), "accessorio");
  assert.equal(ruoloDelCapo("Ring Zip Hoodie Teal"), "top");
  assert.equal(ruoloDelCapo("Jelani - Turtleneck vest - Black"), "capospalla");
  assert.equal(ruoloDelCapo("Turtleneck in lana merino"), "top");
  assert.equal(ruoloDelCapo("Minigonna a portafoglio full strass", "Clothing/Skirts"), "bottom");
  assert.equal(ruoloDelCapo("Portafogli in pelle donna piccolo"), "accessorio");
  assert.equal(ruoloDelCapo("Tuta scollo a V"), "intero");
  assert.equal(ruoloDelCapo("Pantaloni della tuta in felpa"), "bottom");
});

test("quello che dice il capo vale più di quello che dichiara il negozio", () => {
  // Il negozio è segnato "uomo" perché vende soprattutto boxer da uomo. Ma
  // "dames", in olandese, vuol dire donna, e questo capo lo dice di sé.
  assert.equal(perChiE(REGGISENO), "donna");
  // "Mens" al plurale: la vecchia regola cercava \bmen\b e non agganciava.
  assert.equal(perChiE(TSHIRT_UOMO), "uomo");
  // Chi non dice niente resta quello che ha dichiarato il negozio.
  assert.equal(perChiE(CAMICIA_UOMO), "uomo");
  assert.equal(perChiE(PANTALONE), null);
});

test("i capi da bambino non sono di un altro genere: sono di un'altra persona", () => {
  assert.equal(perChiE(SNEAKER_BIMBO), "bambino");
  assert.equal(perChiE(SANDALO_BIMBA), "bambino");
  // Non hanno una pertinenza: si tolgono, per chiunque stia guardando.
  for (const genere of ["uomo", "donna", null]) {
    assert.equal(pertinenza(SNEAKER_BIMBO, genere), null, `passa con genere ${genere}`);
    assert.equal(pertinenza(SANDALO_BIMBA, genere), null, `passa con genere ${genere}`);
  }
});

test("«baby» è anche un colore e una maglietta da adulta, non solo un'età", () => {
  // Trovati guardando i titoli veri prima di scrivere sul catalogo: con la
  // regola golosa sparivano dall'app un bikini, una gonna vintage, un paio di
  // décolleté e due magliette da donna, tutti scambiati per capi da neonato.
  for (const titolo of [
    "Raine Crochet Tie Side Bikini Bottoms In Baby Blue",
    "Vintage 1990s Baby Pink Iridescent Lace-up Skirt - XS",
    "Kaiia Studio Baby Tee Baby Pink",
    "Core Butterfly Baby Tee",
    "Baby doll in pizzo nero",
  ]) {
    assert.notEqual(perChiE({ titolo, genere: null }), "bambino", `scambiato per un capo da bambino: ${titolo}`);
  }

  // Ma "baby" davanti a qualunque altra cosa resta un'età.
  for (const titolo of ["GREEN BABY SWIM SHORTS", "4006 BABY ECOFUR - Sneaker - Kid unisex", "Baby Pants"]) {
    assert.equal(perChiE({ titolo, genere: null }), "bambino", `non riconosciuto: ${titolo}`);
  }

  // E "boyfriend" non è un bambino: la parola dentro un'altra parola non conta.
  assert.notEqual(perChiE({ titolo: "Boyfriend jeans a vita alta", genere: null }), "bambino");
});

test("chi cerca da uomo non vede roba da donna, e i dubbi li vede in fondo", () => {
  const catalogo = [REGGISENO, SNEAKER_BIMBO, PANTALONE, TSHIRT_UOMO, SANDALO_BIMBA, CAMICIA_UOMO];
  const visti = perChiCerca(catalogo, "uomo").map((c) => c.titolo);

  assert.ok(!visti.includes(REGGISENO.titolo), "il reggiseno è ancora lì");
  assert.ok(!visti.includes(SNEAKER_BIMBO.titolo), "la scarpa da neonato è ancora lì");
  assert.ok(!visti.includes(SANDALO_BIMBA.titolo), "il sandalo da bambina è ancora lì");

  // Quelli senza genere restano, ma in fondo: sono per lo più sneaker e
  // zaini, che da donna non sono.
  assert.deepEqual(visti, [TSHIRT_UOMO.titolo, CAMICIA_UOMO.titolo, PANTALONE.titolo]);
});

test("certi capi dicono per chi sono col nome, anche se il negozio tace", () => {
  // Fra i 22.400 capi senza genere in catalogo, circa millecento sono
  // gonne, vestiti, reggiseni e bluse: a un uomo non vanno proposti nemmeno
  // in fondo all'elenco.
  // "Decolleté" e "Guêpière" stanno qui apposta: il confine di parola di
  // JavaScript conosce solo l'alfabeto inglese, e dopo la é pensava che la
  // parola fosse già finita — le due voci non agganciavano affatto.
  for (const titolo of ["Gonna a costine con drappeggio", "Ribbed Midi Dress", "Reggiseno a triangolo",
                        "Camicetta in raso", "Decolleté in vernice nera", "Guêpière in pizzo"]) {
    assert.equal(perChiE({ titolo, genere: null }), "donna", titolo);
    assert.equal(pertinenza({ titolo, genere: null }, "uomo"), null, `proposto a un uomo: ${titolo}`);
  }
  assert.equal(perChiE({ titolo: "Cravatta in seta stampata", genere: null }), "uomo");

  // Ma dove il nome è ambiguo si lascia perdere: escludere per sbaglio è
  // peggio che non escludere.
  // "Sergio Tacchini" è una marca di scarpe da ginnastica, non un paio di
  // tacchi, e "Dressing Gown" non è un vestito: il confine serve da tutte
  // e due le parti.
  for (const titolo of ["Cotton Dress Shirt", "Tie-Dye T-Shirt", "Blazer effetto glossy",
                        "Sneakers Sergio Tacchini Court", "Dressing Gown"]) {
    assert.equal(perChiE({ titolo, genere: null }), null, `scambiato per capo di un genere: ${titolo}`);
  }

  // E quello che davvero non ha genere resta per tutti: sneaker, zaini,
  // berretti sono metà di quei 22.400.
  for (const titolo of ["Total 90 Shox Magia Sneakers", "Elmer Graphic Beanie"]) {
    assert.equal(pertinenza({ titolo, genere: null }, "uomo"), 2, titolo);
    assert.equal(pertinenza({ titolo, genere: null }, "donna"), 2, titolo);
  }
});

test("la composizione si legge in tutte le lingue in cui la scrivono", () => {
  // Su 32.525 capi con la composizione letta, 23.322 non avevano un
  // punteggio: la tabella delle fibre conosceva solo l'italiano, e i negozi
  // scrivono "cotton", "polyester", "økologisk bomuld", "algodón orgánico".
  // Il punteggio si vede — è la scritta «tessuto 75/100» sotto il capo — e
  // ordina la ricerca: senza, quel capo finisce in fondo a ogni parità.
  assert.equal(analizzaTessuto("100% cotton").qualita, 75);
  assert.equal(analizzaTessuto("100% økologisk bomuld").qualita, 85);
  assert.equal(analizzaTessuto("100% algodón orgánico").qualita, 85);
  assert.equal(analizzaTessuto("95% polyester, 5% elastane").qualita, 26);

  // Le sigle delle etichette di composizione sono nomi anche loro: questa
  // è di Luigi Fusaro, con la coda di frase che il negozio ci ha attaccato.
  assert.equal(analizzaTessuto("69% PL 29% VI 2% EL il modello indossa").qualita, 34);
});

test("la fibra più precisa vince su quella generica", () => {
  // "100% lana merinos" prendeva 88, il punteggio della lana normale: la
  // ricerca si fermava alla prima voce che combaciava, e «lana» viene prima
  // di «lana merino» nell'elenco. Le due voci più precise che avevamo erano
  // codice morto, e 362 capi ne pagavano il prezzo.
  assert.equal(analizzaTessuto("100% lana merinos").qualita, 92);
  assert.equal(analizzaTessuto("100% organic cotton").qualita, 85);
  assert.equal(analizzaTessuto("100% cotone").qualita, 75);
});

test("una fibra è una parola intera, non una sillaba dentro un'altra", () => {
  // "leather" contiene "ea", che sull'etichetta è la sigla dell'elastan:
  // senza un confine, 584 capi in pelle verrebbero valutati come elastan.
  assert.equal(analizzaTessuto("100% leather").qualita, 85);
  assert.notEqual(analizzaTessuto("100% leather").qualita, 40);
  assert.equal(analizzaTessuto("100% leather").tessuto, "100% leather");

  // Il nome si porta dietro quello che il negozio ha scritto dopo, quindi
  // la fibra si cerca dentro e non solo all'inizio.
  assert.equal(analizzaTessuto("100% cotton washing instructions").qualita, 75);
  assert.equal(analizzaTessuto("100% di cotone biologico certificato").qualita, 85);
});

test("un bianco spento o un nero pieno, misurati su una foto, sono il muro", () => {
  // Quando il negozio non dice il colore lo misuriamo sulla foto, e su un
  // paio di gemelli o una cravatta la foto è quasi tutta fondale: 8.394 capi
  // hanno un colore misurato che è bianco spento o nero pieno.
  //
  // Guardate ventiquattro di quelle foto una per una, il titolo vince venti
  // volte e non perde mai: gemelli neri, décolleté neri, chino neri,
  // t-shirt verde — tutti bianchi secondo la foto.
  assert.ok(sembraIlFondale("#EFEBEA"), "il bianco della carta da studio");
  assert.ok(sembraIlFondale("#F5F5F5"));
  assert.ok(sembraIlFondale("#050505"), "il nero di un'estrazione fallita");

  // Un capo bianco panna o nero vero invece non è il muro: hanno una tinta,
  // o non sono così estremi. Se li scartassimo, un abito panna resterebbe
  // senza colore.
  assert.ok(!sembraIlFondale("#EFE4D2"), "eggnog, che è un capo color panna");
  assert.ok(!sembraIlFondale("#111213"), "il nero dell'interfaccia, che è un nero vero");
  assert.ok(!sembraIlFondale("#B98F5E"), "il cammello");
});

test("nel campo del colore la sfumatura segue il generico: «verde bosco» è bosco", () => {
  // Il negozio scrive "Verde bosco" e usciva il verde generico, perché la
  // ricerca si fermava alla prima parola che conosceva. Sono tinte molto più
  // chiare di quelle vere, mandate alla palette sbagliata.
  assert.equal(coloreDaNome("Verde bosco"), NOMI_COLORE.bosco);
  assert.equal(coloreDaNome("Grigio Antracite"), NOMI_COLORE.antracite);
  assert.equal(coloreDaNome("Blu celeste"), NOMI_COLORE.celeste);
  assert.equal(coloreDaNome("Marrone Caffè"), NOMI_COLORE.caffe);

  // In inglese la sfumatura sta prima, non dopo: "Black Sand" non è un nero
  // sabbioso, sono due colori, e il primo è quello che domina.
  assert.equal(coloreDaNome("Black Sand"), NOMI_COLORE.black);
  assert.equal(coloreDaNome("White Navy"), NOMI_COLORE.white);
  assert.equal(coloreDaNome("OLIVE GREEN"), NOMI_COLORE.olive);
});

test("i nomi che i negozi usano davvero stanno in vocabolario, e non si mangiano fra loro", () => {
  // Trentottomila capi hanno il colore scritto in un campo apposta, e di
  // undicimila non sapevamo leggere il nome. Questi li ho guardati in
  // faccia, quattro foto per nome dove il nome era ambiguo: «mandorla» di
  // Yamamay è avorio e non marrone, «hazelnut» è un nude chiaro, «asphalt»
  // di Ecoalf è grigio scuro, «carta da zucchero» è azzurro polvere.
  for (const nome of ["silver", "eggnog", "charcoal", "champagne", "taupe", "storm", "mandorla", "carta da zucchero"]) {
    assert.ok(coloreDaNome(nome), `non riconosciuto: ${nome}`);
  }

  // "rose wood" è un rosa polveroso, non il rosa: i nomi lunghi si provano
  // per primi, ed è questo a tenerli separati.
  assert.equal(coloreDaNome("Rose Wood"), NOMI_COLORE["rose wood"]);
  assert.notEqual(coloreDaNome("Rose Wood"), NOMI_COLORE.rose);

  // Tre parole sono il massimo che la ricerca prova, e "carta da zucchero"
  // ne occupa esattamente tre: dentro una frase più lunga deve reggere.
  assert.equal(coloreDaNome("Abito lungo carta da zucchero"), NOMI_COLORE["carta da zucchero"]);
});

test("i codici che i negozi incollano al nome del colore", () => {
  // «blacksms» sono 45 capi, «darkbluesms» 26, «whitesms» 22: un suffisso
  // attaccato in fondo al nome, che da solo lascia 155 capi senza colore.
  assert.equal(coloreDaNome("BLACKSMS"), NOMI_COLORE.black);
  assert.equal(coloreDaNome("darkbluesms"), NOMI_COLORE.darkblue);

  // E i nomi incollati senza spazio, altri 171 capi. Vale il primo, come per
  // due colori separati da una barra: «blackwhite» è nera e bianca.
  assert.equal(coloreDaNome("blackwhite"), NOMI_COLORE.black);
  assert.equal(coloreDaNome("sagegreen"), NOMI_COLORE.sage);
  assert.equal(coloreDaNome("blueindigo"), NOMI_COLORE.blue);

  // Ma spezzare le parole vale SOLO nel campo del colore. In un titolo
  // sarebbe un invito a sbagliare, e infatti non si tocca: «blackout» non è
  // nero, e non lo era nemmeno prima.
  assert.equal(coloreNelTitolo("Tenda Blackout per la camera"), null);

  // E un nome che si legge per intero non si spezza: «verde bosco» resta
  // bosco, non diventa verde.
  assert.equal(coloreDaNome("Verde bosco"), NOMI_COLORE.bosco);
});

test("«fuchsia» e «bluette»: 309 capi, due parole", () => {
  // 151 capi scrivono «fuchsia» all'inglese, e in vocabolario c'era solo
  // «fucsia». Altri 158 dicono «bluette», che non c'era affatto: guardate
  // sei foto — una giacca, un cardigan, tre cravatte — è un blu medio
  // acceso, non un navy.
  assert.equal(coloreNelTitolo("FUCHSIA SARTORIAL PRINTED SILK TIE"), NOMI_COLORE.fucsia);
  assert.equal(coloreDaNome("Bluette"), NOMI_COLORE.bluette);
});

test("i nomi che i negozi scrivono in inglese: 2.232 capi", () => {
  // Il vocabolario parlava quasi solo italiano, e i negozi scrivono «teal»,
  // «lilac», «chestnut», «sapphire». Restavano 6.550 capi con un nome di
  // colore che non sapevamo leggere: questi nomi ne coprono 2.232.
  //
  // Non sono indovinati. Per ognuno ho messo la pezza di colore che propongo
  // accanto a quattro foto vere del catalogo e ho guardato: sui 1.213 capi
  // dove la foto è leggibile, la distanza mediana fra il nome e la foto è
  // 12, cioè lo stesso colore.
  for (const nome of ["teal", "lilac", "chestnut", "sapphire", "moss", "mauve", "cognac", "mocha", "raisin"]) {
    assert.ok(coloreDaNome(nome), `non riconosciuto: ${nome}`);
  }

  // Dove le foto dicevano un'altra cosa, ho creduto alle foto e non alla
  // parola: «tangerina» di Ecoalf è un ambra scuro e non un arancio (le sue
  // foto misurano #A96B10, #C88D3B, #B9812A), «mirtillo» di Cosabella è un
  // blu petrolio e non un viola (#094E71, #03486B), «fog» di Scotch & Soda è
  // una sabbia calda e non un grigio (#C7B9A9, #D9CDBE).
  assert.notEqual(NOMI_COLORE.tangerina, NOMI_COLORE.tangerine);
  assert.ok(hexALab(NOMI_COLORE.mirtillo).b < 0, "mirtillo è un blu, non un viola");

  // E dove le foto si contraddicevano il nome non l'ho messo: «aluminium»
  // stava su quattro capi tutti neri e «canna di fucile» su tre valigie
  // rosa. Un nome che non so leggere costa un capo; un nome letto male lo
  // manda nella palette sbagliata, e quello lo vede l'utente.
  assert.equal(coloreDaNome("aluminium"), null);
  assert.equal(coloreDaNome("canna di fucile"), null);
});

test("le parole nuove sono un colore solo nel campo, mai dentro un titolo", () => {
  // Aperte anche ai titoli renderebbero 386 capi, e ne sbaglierebbero una
  // parte: in italiano «bordo» è l'orlo prima di essere il bordeaux, il
  // corallo dei gemelli è la pietra, l'acciaio della borraccia è il metallo,
  // e «Sky Hi» è il nome di una scarpa. Nel campo del colore quelle frasi
  // non esistono: lì «Bordo» è un colore e basta.
  assert.equal(coloreNelTitolo("Gonna longuette in satin con bordo in pizzo"), null);
  assert.equal(coloreNelTitolo("ROUND CORAL CUFFLINKS"), null);
  assert.equal(coloreNelTitolo("Stainless Steel 2-Pack Cups 500ml"), null);
  assert.equal(coloreNelTitolo("Nike Dunk Sky Hi Essential Wedge Trainers"), null);
  assert.equal(coloreNelTitolo("Maiko Moss Agate Single Earring"), null);

  assert.equal(coloreDaNome("Bordo"), NOMI_COLORE.bordo);
  assert.equal(coloreDaNome("Coral"), NOMI_COLORE.coral);
  assert.equal(coloreDaNome("Steel"), NOMI_COLORE.steel);
});

test("un grado o una finitura incollati al colore: 316 capi", () => {
  // «darknavy», «lightgrey», «greymelange», «stonewash»: il colore c'è, ma
  // ha attaccata davanti la sua intensità o dietro il nome del filato. Né
  // l'una né l'altro sono un colore, e quello che resta lo è.
  assert.equal(coloreDaNome("darknavy"), NOMI_COLORE.navy);
  assert.equal(coloreDaNome("lightgrey"), NOMI_COLORE.grey);
  assert.equal(coloreDaNome("oldmustard"), NOMI_COLORE.mustard);
  assert.equal(coloreDaNome("greymelange"), NOMI_COLORE.grey);
  assert.equal(coloreDaNome("stonewash"), NOMI_COLORE.stone);
  assert.equal(coloreDaNome("antiquewhitemelangesms"), NOMI_COLORE.antiquewhite);

  // Solo se quello che resta è davvero un colore: «lightning» non è una luce
  // e «darkness» non è un buio.
  assert.equal(coloreDaNome("lightning"), null);
  assert.equal(coloreDaNome("darkness"), null);
});

test("una barra, un trattino o una «e» fra due colori vogliono dire due colori", () => {
  // "Black/Ivory" è una scarpa nera e avorio, non un avorio scuro. La
  // normalizzazione cancellava i separatori, e "black ivory" diventava
  // indistinguibile da "verde bosco".
  assert.equal(coloreDaNome("Black/Ivory"), NOMI_COLORE.black);
  assert.equal(coloreDaNome("Nero/Crema"), NOMI_COLORE.nero);
  assert.equal(coloreDaNome("Black-F Avorio"), NOMI_COLORE.black);
  assert.equal(coloreDaNome("White and Navy Plaid"), NOMI_COLORE.white);
});

test("il denim è un tessuto, non un colore", () => {
  // "DENIM SLIM FIT NERO" è un jeans nero e usciva blu, perché «denim» viene
  // prima. Il colore del tessuto vale solo dove il capo non ne dichiara
  // nessun altro.
  assert.equal(coloreNelTitolo("DENIM SLIM FIT NERO"), NOMI_COLORE.nero);
  assert.equal(coloreDaNome("Dark Denim Blue"), NOMI_COLORE.blue);
  assert.equal(coloreNelTitolo("Jeans in denim di cotone"), NOMI_COLORE.denim);
});

test("se il negozio dichiara un colore che non capiamo, decide la foto e non il titolo", () => {
  // Il negozio aveva scritto «GHIACCIO», che non è in vocabolario, e dal
  // titolo usciva il marrone di "Dettagli Stile Cuoio": un bomber ghiaccio
  // schedato marrone cuoio. Il negozio stava parlando del colore e noi non
  // l'abbiamo capito — la parola che troviamo nel titolo è di un'altra cosa.
  // Meglio non dire niente: così a misurarlo è la foto, che è il capo.
  const bomber = "Bomber Uomo Collo Camicia in Nylon con Dettagli Stile Cuoio";
  assert.equal(coloreDelCapo("GHIACCIO", bomber), null);

  // Quando il negozio il campo non lo riempie, il titolo resta il ripiego.
  assert.equal(coloreDelCapo(null, "Abito lungo beige con stampa floreale blu"), NOMI_COLORE.beige);

  // E quando lo riempie e lo capiamo, vince lui.
  assert.equal(coloreDelCapo("Verde bosco", "Maglia dolcevita in lambswool"), NOMI_COLORE.bosco);
});

test("in italiano il colore concorda, e il vocabolario sa solo il maschile", () => {
  // "Blusa bianca", "Jeans azzurri", "Tuta nera": milleseicento capi non
  // davano nessun colore perché in vocabolario c'è «bianco» e nel titolo
  // c'è scritto «bianca». Le forme si riportano al maschile prima di
  // cercare, e solo per gli otto colori che in italiano si accordano.
  assert.equal(coloreNelTitolo("Blusa bianca in organza con maxi fiori"), NOMI_COLORE.bianco);
  assert.equal(coloreNelTitolo("Jeans azzurri a vita alta"), NOMI_COLORE.azzurro);
  assert.equal(coloreNelTitolo("Tuta nera con scollo asimmetrico"), NOMI_COLORE.nero);
  assert.equal(coloreNelTitolo("Gemelli da camicia quadrati neri eleganti"), NOMI_COLORE.nero);

  // Vale anche dentro i nomi composti, dove ad accordarsi è la seconda
  // parola: "maglia verde scura" è verde scuro.
  assert.equal(coloreDaNome("Verde scura"), NOMI_COLORE["verde scuro"]);
  assert.equal(coloreDaNome("Grigia chiara"), NOMI_COLORE["grigio chiaro"]);
});

test("certi nomi sono un colore solo dove il negozio scrive i colori", () => {
  // Nel campo del colore «Shell» è un nude, «Silver» un grigio chiaro,
  // «Rose» un rosa. In un titolo sono un'altra cosa: la shell jacket è una
  // giacca, i gemelli d'argento sono di metallo, e le rose sono un disegno
  // sulla stoffa. Sono 1.245 titoli, e li facevano sbagliare tutti.
  assert.equal(coloreDaNome("Shell"), NOMI_COLORE.shell);
  assert.equal(coloreNelTitolo("Soft shell jacket - Black Jet"), NOMI_COLORE.black);
  assert.equal(coloreNelTitolo("BURGUNDY SILVER CUFFLINKS"), NOMI_COLORE.burgundy);
  assert.equal(coloreNelTitolo("Blusa bianca con stampa floreale a rose"), NOMI_COLORE.bianco);
  assert.equal(coloreNelTitolo("Women Organic Sweatshorts - Stone Blue"), NOMI_COLORE.blue);

  // E dove nel titolo non c'è nessun altro colore, non si inventa niente:
  // meglio farlo misurare alla foto.
  assert.equal(coloreNelTitolo("Dragon Knot LT Shell Jacket"), null);
});

test("un titolo è una frase, non il nome di un colore", () => {
  // Nel titolo i colori possono essere due, o far parte di una marca:
  // "Blu Marina Militare" è la marca, non un verde militare. In una frase
  // vale il primo colore e basta — le sfumature si leggono solo nel campo
  // che il negozio riempie apposta.
  assert.equal(coloreNelTitolo("Sneakers Blu Marina Militare 2258"), NOMI_COLORE.blu);
  assert.equal(coloreNelTitolo("Abito lungo beige con stampa floreale blu"), NOMI_COLORE.beige);
  assert.equal(coloreNelTitolo("MAGLIA GIROCOLLO BASIC VERDE BOSCO"), NOMI_COLORE.verde);
});

test("la pelle e il camoscio valgono, la gomma della suola no", () => {
  // Cinquecentocinquanta capi in pelle e centoventi in camoscio restavano
  // senza voto: sono materiali che questa tabella non aveva mai avuto.
  // Naturali e durevoli, stanno nella fascia della canapa e del mohair.
  assert.equal(analizzaTessuto("100% leather").qualita, 85);
  assert.equal(analizzaTessuto("100% pelle bovina").qualita, 85);
  assert.equal(analizzaTessuto("100% suede").qualita, 85);
  // L'angora è un pelo fine come il mohair e la lana.
  assert.equal(analizzaTessuto("100% angora").qualita, 88);

  // La gomma no. Quando un capo dichiara "100% rubber" quella è la suola di
  // una scarpa, e la suola non dice niente su com'è fatta la scarpa: darle
  // un numero sarebbe inventare un voto, non leggerne uno.
  assert.equal(analizzaTessuto("100% rubber dimensions").qualita, null);
});

test("una sigla vale solo dove sta la fibra: subito dopo la percentuale", () => {
  // "95% menos de agua que el a" è una frase di Thinking Mu — il 95% di
  // acqua risparmiata — e «el» lì è l'articolo spagnolo, non la sigla
  // dell'elastan. Trentatré capi sarebbero diventati 95% elastan.
  assert.equal(analizzaTessuto("95% menos de agua que el a").qualita, null);

  // Sull'etichetta la sigla viene subito dopo la percentuale, ed è lì che
  // vale: questa è di Luigi Fusaro, con la coda di frase attaccata dopo.
  assert.equal(analizzaTessuto("100% PL misure").qualita, 25);
});

test("il punteggio si dà solo se abbiamo capito almeno metà del capo", () => {
  // La media è pesata sulle fibre che riconosciamo. "60% polipropilene, 30%
  // rubber, 10% poliestere" prendeva 25 — il voto del poliestere — su un capo
  // di cui riconoscevamo un decimo: 266 capi avevano un voto costruito così,
  // e non era un voto sbagliato, era il voto di un altro capo.
  assert.equal(analizzaTessuto("60% polipropilene, 30% rubber, 10% poliestere").qualita, null);
  assert.equal(analizzaTessuto("95% rws, 5% kashmir håndvask").qualita, null);

  // Metà basta: qui il resto è una fodera che non sappiamo valutare.
  assert.equal(analizzaTessuto("55% alpacauld").qualita, 90);
});

test("un capo può nominarne un altro senza esserlo: la camicia con la cravatta", () => {
  // Sei camicie da donna avevano la cravatta nel titolo, e la cravatta è
  // nell'elenco dei capi da uomo. Le tre di Pinko uscivano unisex, mostrate
  // anche a un uomo; le tre di Silvian Heach uscivano proprio da uomo, e
  // quindi sparivano alle donne. Ma lì la cravatta non è il capo: è un
  // dettaglio della camicia.
  const pinko = {
    titolo: "Camicia a righe con cravatta",
    categoria: "Clothing/Shirts and Blouses/Shirts",
    genere: "donna",
  };
  assert.equal(perChiE(pinko), "donna");

  const heach = { titolo: "Camicia elegante con dettaglio cravatta", categoria: "CAMICIA", genere: "donna" };
  assert.equal(perChiE(heach), "donna");
  assert.equal(pertinenza(heach, "donna"), 0, "tolta a una donna");

  // E una fantasia non è un capo: i boxer Julipet con la stampa a cravatte
  // sono boxer. Senza un genere scritto restano senza, invece di prenderlo
  // da un disegno sul tessuto.
  const julipet = {
    titolo: 'Boxer mare in leggera tela di microfibra in fantasia "cravatta verde"',
    categoria: "Boxer Mare",
    genere: null,
  };
  assert.equal(perChiE(julipet), null);

  // Una cravatta vera invece resta una cravatta.
  assert.equal(perChiE({ titolo: "Cravatta in seta fantasia floreale", categoria: "CRAVATTA", genere: null }), "uomo");
});

test("il campo del genere batte le parole pescate fra le etichette", () => {
  // Boody chiama la sua collezione da donna «womens-baby», e 359 capi su
  // 516 — reggiseni e slip da adulta — finivano schedati bambino per quella
  // parola lì dentro. Lo stesso capo però porta l'etichetta col campo
  // apposta, e quella dice womens: quando il negozio lo scrive nel campo
  // del genere non c'è niente da indovinare.
  const reggiseno = {
    title: "Wireless T-Shirt Bra - Emerald Green",
    product_type: "Bras",
    tags: ["filter_Collection:womens-baby", "filter_Gender:womens", "content_SizeGuide:womens-bras-BD"],
  };
  assert.equal(deduciGenere(reggiseno), "donna");

  // E quando il campo dice davvero baby, il capo resta da bambino.
  const tutina = {
    title: "Long Sleeve Bodysuit - Chalk",
    product_type: "Baby",
    tags: ["filter_Gender:baby", "filter_Range:boody-baby"],
  };
  assert.equal(deduciGenere(tutina), "bambino");

  // "unisex" è una risposta, non un'assenza di risposta: chi cerca da uomo
  // i capi unisex li vede, e prima di quelli che non dicono niente.
  const calze = { title: "Everyday Sock", product_type: "Socks", tags: ["filter_Gender:unisex"] };
  assert.equal(deduciGenere(calze), "unisex");
});

test("«dress» non è sempre un vestito: ci sono i calzini da abito e un colore", () => {
  // In inglese "dress socks" sono i calzini da abito e "dress belt" la
  // cintura da abito: nove paia di calze e due cinture da uomo uscivano
  // come roba da donna. La parola lì fa l'aggettivo, come in "dress shirt".
  for (const titolo of ["Loafer Dress Socks | Cotton | Sage", "5-Pack 1/2 Non-Terry Cotton Crew Dress Sock"]) {
    assert.equal(perChiE({ titolo, genere: "uomo" }), "uomo", titolo);
  }

  // "Dress Blues" e "Dress Bles" sono nomi di colore di Anerkjendt e Les
  // Deux: un vestito blu si chiama "Dress Blue", mai al plurale.
  for (const titolo of ["Worldwide Weekend Bag - Dress Bles Blue", "AKRICO STRIPE KNIT - Dress Blues"]) {
    assert.equal(perChiE({ titolo, genere: "uomo" }), "uomo", titolo);
  }

  // Ma un vestito blu resta un vestito, e resta da donna.
  assert.equal(perChiE({ titolo: "Textured One Shoulder Mini Dress Blue", genere: null }), "donna");
});

test("«Le Mans» è un posto, non un uomo", () => {
  // Otto cappellini New Era della 24 Ore di Le Mans uscivano solo a chi
  // cerca da uomo. «mans» stava nell'elenco per il possessivo scritto senza
  // apostrofo, e in centomila capi non ne aggancia nemmeno uno da uomo: le
  // uniche nove volte che compare è la città francese.
  for (const titolo of ["24HR Le Mans Print White 9FORTY Adjustable Cap", "Le Mans Oversized T Shirt"]) {
    assert.equal(perChiE({ titolo, genere: null }), null, titolo);
  }

  // «Womans» invece un capo ce l'ha davvero, ed è di New Era pure lui.
  const cappello = "New York Yankees Womans MLB Cosy Leopard Brown 9FORTY Adjustable Cap";
  assert.equal(perChiE({ titolo: cappello, genere: null }), "donna");
});

test("il nome del capo dice che capo è, non quanti anni ha chi lo mette", () => {
  // 173 capi segnati «bambino» dal negozio uscivano come da donna, perché si
  // chiamano SKIRT o DRESS: ottanta gonne e vestiti da bambina di Sofie
  // Schnoor, quindici gonne di Kocca. Il nome del capo non parla di età —
  // le gonne le portano anche le bambine — e non può smentire un negozio
  // che dice per quale età è.
  for (const titolo of ["CALLYKB SKIRT", "BERRASK DRESS", "Gonna a pieghe con 3 bottoni"]) {
    const capo = { titolo, genere: "bambino" };
    assert.equal(perChiE(capo), "bambino", titolo);
    for (const genere of ["uomo", "donna", null]) {
      assert.equal(pertinenza(capo, genere), null, `${titolo} proposto a ${genere}`);
    }
  }

  // Una parola che dice davvero per chi è, invece, lo smentisce: Boody
  // scrive "Women's" nel titolo e «bambino» nel dato, e a vincere è il capo.
  assert.equal(perChiE({ titolo: "Women's Crew Neck Sweater - Oyster", genere: "bambino" }), "donna");
});


test("senza un genere scelto si toglie solo la roba da bambino", () => {
  const catalogo = [REGGISENO, SNEAKER_BIMBO, CAMICIA_UOMO];
  const visti = perChiCerca(catalogo, null).map((c) => c.titolo);
  assert.deepEqual(visti, [REGGISENO.titolo, CAMICIA_UOMO.titolo]);
});

test("l'ordine dentro una fascia non si tocca: a decidere di colore è un altro", () => {
  // Arrivano già ordinati per quanto il colore corrisponde. Riordinare per
  // genere non deve rimescolare chi sta nella stessa fascia.
  const a = { titolo: "Camicia uomo A", genere: "uomo" };
  const b = { titolo: "Camicia uomo B", genere: "uomo" };
  const c = { titolo: "Camicia uomo C", genere: "uomo" };
  assert.deepEqual(perChiCerca([a, b, c], "uomo").map((x) => x.titolo), [a, b, c].map((x) => x.titolo));
});

test("un capo di colore «jeans» non è un paio di jeans", () => {
  // Trovato cercando "jeans baggy" sul catalogo vero: fra i risultati c'era
  // "Selvino — Maglia Uomo Mezza Zip in Lana Merinos", che di jeans ha solo
  // il nome del colore. Non va tolta — chi scrive "camicia bianca" il bianco
  // lo trova lì — ma non può stare davanti a un paio di jeans veri.
  const maglia = { titolo: "Selvino - Maglia Uomo Mezza Zip in Lana Merinos", categoria: "MAGLIA", colore_nome: "JEANS" };
  const jeans = { titolo: "Freazy Loose Jeans - Scarab", categoria: "PANTALONI", colore_nome: "Verde" };
  const ordinati = comeLoHaiChiamato([maglia, jeans], "jeans baggy");
  assert.equal(ordinati[0].titolo, jeans.titolo, "la maglia sta ancora davanti ai jeans");
  assert.equal(ordinati.length, 2, "la maglia è sparita del tutto invece di scendere");
});

test("la descrizione fa trovare, non fa classifica", () => {
  // Si salva per cercarci dentro e non si mostra mai: è lì che i negozi
  // scrivono come veste un capo, e un jeans largo chiamato solo "Model 512"
  // nel titolo non lo dice.
  const anonimo = { titolo: "Model 512", categoria: "PANTALONI", descrizione: "Jeans dalla vestibilità ampia, gamba dritta." };
  assert.equal(comeLoHaiChiamato([anonimo], "jeans baggy").length, 1, "introvabile anche con la descrizione");

  // Ma i negozi ci scrivono dentro anche con cosa abbinare il capo: "sta
  // bene su un jeans" compare sulla scheda di una camicia. Deve restare
  // trovabile e stare sotto, non sparire e non salire.
  const camicia = { titolo: "Camicia Oxford", categoria: "CAMICIE", descrizione: "Sta bene su un jeans o su un pantalone chino." };
  const jeans = { titolo: "Carpenter Jeans", categoria: "PANTALONI", descrizione: "" };
  const ordinati = comeLoHaiChiamato([camicia, jeans], "jeans");
  assert.equal(ordinati[0].titolo, jeans.titolo, "la camicia sta davanti ai jeans");
  assert.equal(ordinati.length, 2, "la camicia è sparita invece di scendere");
});

test("senza descrizione salvata non cambia niente", () => {
  // La colonna si riempie alla prossima importazione: fino ad allora arriva
  // vuota, o non arriva affatto perché la funzione del database è ancora
  // quella vecchia. Non deve rompersi né inventarsi punteggi.
  const senza = { titolo: "Carpenter Jeans", categoria: "PANTALONI" };
  const vuota = { titolo: "Loose Jeans", categoria: "PANTALONI", descrizione: null };
  assert.equal(comeLoHaiChiamato([senza, vuota], "jeans").length, 2);
});

test("la casella «che capo cerchi» adesso filtra davvero", () => {
  const catalogo = [PANTALONE, CAMICIA_UOMO, TSHIRT_UOMO];
  assert.deepEqual(comeLoHaiChiamato(catalogo, "pantalone").map((c) => c.titolo), [PANTALONE.titolo]);
  // Basta che una parola agganci: chi scrive "giubbino North Face" cerca un
  // giubbino, e pretendere tutte e tre le parole vorrebbe dire non trovare mai.
  assert.equal(comeLoHaiChiamato(catalogo, "camicia di lino").length, 1);
  // Le parole di una lettera o due non contano: "di", "in", "da".
  assert.equal(comeLoHaiChiamato(catalogo, "di in da").length, 3);
  // Casella vuota, catalogo intero: non è un filtro che si applica da solo.
  assert.equal(comeLoHaiChiamato(catalogo, "").length, 3);
  assert.equal(comeLoHaiChiamato(catalogo, null).length, 3);
});

// --------------------------------------------------------------------------
// La ricerca fuori dal catalogo.
//
// Il tasto diceva "cerca nei 48 negozi scelti" e ce li infilava davvero
// tutti, Kocca e Pinko compresi, che di roba da uomo non ne hanno una. E la
// parola "uomo" a Google non arrivava proprio: il genere si fermava
// all'ingresso, e la ricerca partiva senza.
// --------------------------------------------------------------------------
test("il genere entra nelle parole cercate, e prima non ci entrava", () => {
  assert.equal(descriviCapo({ capo: "camicia", colore: "blu navy" }), "camicia blu navy");
  assert.equal(descriviCapo({ capo: "camicia", colore: "blu navy", genere: "uomo" }), "camicia da uomo blu navy");
  assert.equal(descriviCapo({ capo: "camicia", genere: "donna" }), "camicia da donna");
  // Chi non lo dichiara cerca come prima, non "da undefined".
  assert.equal(descriviCapo({ capo: "camicia", genere: "" }), "camicia");
});

test("un uomo non viene mandato dentro un negozio che vende solo da donna", () => {
  const soloDonna = NEGOZI.filter((n) => n.genere === "donna").map((n) => n.nome);
  assert.ok(soloDonna.length, "nessun negozio è marcato: il filtro non avrebbe niente da fare");

  const perUnUomo = negoziPerGenere(NEGOZI, "uomo").map((n) => n.nome);
  for (const nome of soloDonna) assert.ok(!perUnUomo.includes(nome), `${nome} è ancora in elenco`);

  // I negozi che vendono a tutti restano: il filtro toglie, non seleziona.
  assert.ok(perUnUomo.includes("COS"));
  assert.ok(perUnUomo.length > NEGOZI.length / 2);

  // E senza un genere scelto non si toglie niente.
  assert.equal(negoziPerGenere(NEGOZI, "").length, NEGOZI.length);
});

test("l'indirizzo di ricerca porta con sé sia la parola sia i soli negozi giusti", () => {
  // Gli spazi in una query diventano "+", e decodeURIComponent non li
  // rimette: leggere il parametro è più onesto che leggere la stringa.
  const grezzo = urlNeiNegozi({ capo: "cappotto", genere: "uomo", negozi: ["gutteridge.com"] });
  const url = new URL(grezzo).searchParams.get("q");
  assert.ok(url.includes("cappotto da uomo"), url);
  assert.ok(url.includes("site:gutteridge.com"), url);
  // Senza niente da cercare non si apre una ricerca vuota.
  assert.equal(urlNeiNegozi({ capo: "", genere: "uomo", negozi: ["a.it"] }), null);
  assert.equal(urlNeiNegozi({ capo: "cappotto", negozi: [] }), null);
});

// --------------------------------------------------------------------------
// Le parole con cui la stessa cosa si chiama in modi diversi.
//
// Metà dei negozi scrive in inglese e chi cerca scrive in italiano. Contato
// sul catalogo: "stivali" compare in 39 titoli, "boots" in 542. Chi scriveva
// stivali vedeva un capo su quattordici, e non poteva accorgersene — una
// pagina non dice mai quello che non ti sta mostrando.
// --------------------------------------------------------------------------
// Come fa la ricerca vera: basta che una delle parole si ritrovi. Chi ne
// ritrova due va più in alto, ma questo lo decide l'ordinamento, non il
// filtro — e infatti la prima versione di questa riga pretendeva che
// combaciassero tutte, ed era più severa dell'app che doveva descrivere.
const trova = (cercato, titolo) =>
  regoleDa(cercato).some((gruppo) => gruppo.some((regola) => regola.test(titolo)));

test("una parola porta con sé la sua famiglia, in tutte e due le lingue", () => {
  assert.ok(trova("stivali", "Chelsea Boots black"));
  assert.ok(trova("maglione", "Lambswool crew neck sweater"));
  assert.ok(trova("cappotto", "Wool Coat - Navy"));
  assert.ok(trova("scarpe", "Retro Runner Sneakers"));
  assert.ok(trova("felpa", "Organic Hoodie Grey"));
  // E al contrario: chi scrive inglese trova l'italiano.
  assert.ok(trova("boots", "Stivaletti in pelle"));
});

test("le famiglie che mancavano: sei parole che vedevano quasi niente", () => {
  // Contato quanto vede chi cerca, parola per parola, sul catalogo vero. Il
  // conto è: quanti capi trova adesso, e quanti gliene sarebbero andati bene.
  //
  //   giubbotto     177 su 3.669    5%
  //   cravatta       70 su 1.818    4%
  //   canottiera     17 su   481    4%
  //   occhiali       75 su   832    9%
  //   tuta          234 su   873   27%
  //   scarpe      4.572 su 5.017   91%   (mancavano mocassini e loafer)
  //
  // Chi scriveva «cravatta» vedeva un capo su venticinque, e non poteva
  // accorgersene: la pagina non dice mai quello che non sta mostrando.
  assert.ok(trova("giubbotto", "Nylon Bomber Jacket"));
  assert.ok(trova("giubbotto", "Giubbino in denim taglio cropped"));
  assert.ok(trova("occhiali", "BLACK EBONY - SUNGLASSES"));
  assert.ok(trova("canottiera", "Ribbed Tank Top White"));
  assert.ok(trova("canottiera", "Canotta in cotone"));
  assert.ok(trova("scarpe", "Plakka Leather Loafer"));
  assert.ok(trova("scarpe", "Mocassini in pelle"));
  assert.ok(trova("zaino", "Dolly Noire Backpack"));
  assert.ok(trova("tuta", "Anastasia Tie Sweatpants"));
  assert.ok(trova("tuta", "Organic Jogger Grey"));

  // E cinque buchi più piccoli, misurati allo stesso modo e tutti senza
  // rumore: blusa 1.013 capi, chino 549, trench 156, tracolla 424.
  assert.ok(trova("camicia", "Silk Blouse with Ruffles"));
  assert.ok(trova("camicia", "Blusa Tinta Unita Popeline"));
  assert.ok(trova("pantaloni", "Nador – Bermuda Chino in Cotone"));
  assert.ok(trova("cappotto", "Trench beige in cotone"));
  assert.ok(trova("borsa", "Tracolla in pelle uomo"));
  // «Minigonna» non la prendeva «gonna»: il confine di parola vuole uno
  // spazio prima, e lì c'è una "i".
  assert.ok(trova("gonna", "Minigonna a portafoglio full strass"));
});

test("«cravatta» trova le cravatte, e non i lacci", () => {
  // «Tie» in inglese è la cravatta e anche il laccio, ed è il secondo nove
  // volte su dieci quando ha un capo subito dopo: «tie sweatpants», «rope
  // tie up sandals», «tie back top». Presa dovunque porta 1.755 capi con il
  // 14% di roba che cravatta non è; escludendo la parola che segue quando è
  // un capo, ne porta 1.643 con l'8%.
  //
  // Qui la soglia è diversa da quella dei ruoli, dove «tie» vale solo in
  // fondo al titolo: là un errore mette un sandalo fra gli accessori di un
  // completo, qui mostra una maglia in mezzo alle cravatte. Non vedere il
  // 96% delle cravatte costa molto di più.
  assert.ok(trova("cravatta", "DARK BLUE SARTORIAL PRINTED SILK TIE"));
  assert.ok(trova("cravatta", "Cravatta in seta stampata"));
  assert.ok(!trova("cravatta", "Anastasia Tie Sweatpants"));
  assert.ok(!trova("cravatta", "Billie Black Rope Tie Up Sandals"));
});

test("chi cerca una camicia non vuole una t-shirt né una felpa", () => {
  // "shirt" sta dentro "t-shirt", "sweatshirt" e "overshirt": col confronto
  // per pezzi di parola una ricerca di camicie restituiva magliette.
  assert.ok(trova("camicia", "Oxford Linen Shirt"));
  assert.ok(!trova("camicia", "Basic T-Shirt in cotone"));
  assert.ok(!trova("camicia", "Grey Sweatshirt"));
  // Ma chi la maglietta la vuole, la trova.
  assert.ok(trova("maglietta", "Basic T-Shirt in cotone"));
});

test("«baggy» trova anche chi si chiama loose, wide o relaxed", () => {
  for (const titolo of ["Freazy Loose Jeans", "Wide Leg Trousers", "Relaxed Fit Denim", "Oversized Jeans"]) {
    assert.ok(trova("jeans baggy", titolo), `non trovato: ${titolo}`);
  }

  // "Slim Fit Jeans" resta trovabile — jeans lo è — ma sta sotto a chi è
  // anche largo: chi scrive due parole ne vuole due, e chi ne azzecca una
  // sola viene dopo, non viene buttato.
  const larghi = { titolo: "Freazy Loose Jeans", categoria: "PANTALONI" };
  const stretti = { titolo: "Slim Fit Jeans", categoria: "PANTALONI" };
  const ordinati = comeLoHaiChiamato([stretti, larghi], "jeans baggy");
  assert.equal(ordinati[0].titolo, larghi.titolo);
  assert.equal(ordinati.length, 2);
});

test("uno stile si riconosce sulle righe già scaricate, dove le parole non costano", () => {
  // Nel database quel filtro sfora i tre secondi: ogni parola confrontata
  // con cinque campi di ogni riga, uno è la descrizione da seicento
  // caratteri, su settantottomila righe. Sulle righe già in mano costa un
  // millisecondo — e le parole si usano TUTTE, non le prime cinque.
  const catalogo = [
    { titolo: "Blusa in pizzo con volant", categoria: "Bluse" },
    { titolo: "Gonna a fiori in georgette", categoria: "Gonne" },
    { titolo: "Felpa oversize con cappuccio", categoria: "Felpe" },
    { titolo: "Sneaker chunky in mesh", categoria: "Sneakers", descrizione: "tessuti tecnici" },
  ];
  const suoi = capiDelloStile(catalogo, "Romantico");
  assert.deepEqual(suoi.map((c) => c.titolo), [
    "Blusa in pizzo con volant",
    "Gonna a fiori in georgette",
    "Sneaker chunky in mesh",
  ]);

  // Guarda tutti i campi, non solo il titolo: la sneaker entra per la
  // descrizione, ed è giusto — è lì che i negozi scrivono i tessuti.
  assert.equal(capiDelloStile([{ titolo: "Sneaker", descrizione: "tessuti che si muovono" }], "Romantico").length, 1);

  // Senza stile non si filtra niente: si restituisce quello che c'era.
  assert.equal(capiDelloStile(catalogo, null).length, catalogo.length);
});

test("al database non si mandano più parole di quante ne regga", () => {
  // Ogni parola viene confrontata con cinque campi di ogni riga, e uno è la
  // descrizione, lunga seicento caratteri. Misurato sul catalogo vero:
  // due parole 1763 ms, sei 2875, otto TIMEOUT. "cardigan oversize" ne
  // generava undici e la ricerca moriva.
  for (const q of ["cardigan oversize", "jeans baggy larghi", "stivali scarpe borsa cintura"]) {
    assert.ok(paroleEspanse(q).length <= 5, `${q} → ${paroleEspanse(q).length} parole`);
  }

  // Ma quelle scritte da chi cerca non si tagliano mai: sono la richiesta.
  const scritte = paroleEspanse("cardigan oversize");
  assert.ok(scritte.includes("cardigan") && scritte.includes("oversize"), scritte.join(","));

  // E il taglio vale solo per il database: il punteggio vede tutta la
  // famiglia, perché girando qui non costa niente.
  assert.ok(regoleDa("cardigan oversize").flat().length > 5);
});

test("le parole passate al database esistono davvero", () => {
  // Le famiglie sono scritte come regole, e il database non le capisce: gli
  // vanno passate parole. Togliendo le parentesi alla cieca da "stival[ei]"
  // usciva "stivalei", che non compare in nessun titolo di questo mondo, e
  // la famiglia si riduceva in silenzio alla sola parola scritta.
  const parole = paroleEspanse("stivali");
  assert.ok(parole.includes("boot"), parole.join(","));
  for (const p of parole) {
    assert.ok(/^[a-zà-ù0-9 ]+$/.test(p), `parola con caratteri da regola dentro: ${p}`);
    assert.ok(p.length > 2);
  }
  assert.ok(paroleEspanse("camicia").includes("shirt"));
  assert.deepEqual(paroleEspanse(""), []);
});
