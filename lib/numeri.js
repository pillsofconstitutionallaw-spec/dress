// Un campo che vuole un numero deve prendere solo numeri.
//
// «inputMode="numeric"» non basta e non è per questo: cambia la tastiera che
// il telefono tira su, e non impedisce niente — né a chi scrive da computer,
// né a chi incolla, né a chi la tastiera se la ignora.
//
// Senza filtro quello che si scrive finisce dentro Number() così com'è, e
// Number() non protesta: risponde. Provato sulla ricerca vera:
//
//   "80 €"  → NaN → il limite di prezzo SPARISCE, e a chi ha chiesto ottanta
//             euro escono capi da duecento
//   "1.000" → 1   → chi scrive mille all'italiana riceve la roba sotto
//             l'euro: sette capi, e nessuno gli dice perché
//
// Sono i due modi peggiori di sbagliare: nessuno dei due dà errore, e in
// tutti e due l'utente vede un catalogo che non è quello che ha chiesto.
//
// Questa regola esisteva già, scritta a mano dentro il campo della data di
// nascita — dove funziona da sempre. Non era mai uscita di lì.

export function soloCifre(testo, max = 9) {
  return String(testo ?? "").replace(/\D/g, "").slice(0, max);
}
