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
  assert.deepEqual(Object.keys(r).sort(), ["category", "description", "matchTips", "title"]);
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
