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
import { comeLoHaiChiamato, perChiCerca, perChiE, pertinenza } from "@/lib/capiPalette";
import { NEGOZI, descriviCapo, negoziPerGenere, urlNeiNegozi } from "@/lib/ricerca";
import { paroleEspanse, regoleDa } from "@/lib/sinonimi";
import { normalizzaAbbinamento, normalizzaVendita } from "@/lib/ai/capo";
import { analizzaColori, correggiLuce, daiPixelGrezzi, misuraDaiPixel, sembraPelle } from "@/lib/analisiFoto";
import { indizioPelle, labDelTono, TONI_PELLE, tonoPelle } from "@/lib/pelle";
import { stagioneDa } from "@/lib/stagioni";
import { combina, esitoDelTest } from "@/lib/testArmocromia";
import { deduciGenere } from "@/scripts/importa-catalogo.mjs";

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
