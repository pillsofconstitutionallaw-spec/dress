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

import { controllaDataNascita, controllaPassword, controllaUsername } from "@/lib/password";
import { sembraEmail } from "@/lib/identificativo";
import { normalizzaAbbinamento, normalizzaVendita } from "@/lib/ai/capo";
import { analizzaColori, correggiLuce, daiPixelGrezzi, misuraDaiPixel, sembraPelle } from "@/lib/analisiFoto";
import { indizioPelle, labDelTono, TONI_PELLE, tonoPelle } from "@/lib/pelle";
import { stagioneDa } from "@/lib/stagioni";
import { combina, esitoDelTest } from "@/lib/testArmocromia";

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
