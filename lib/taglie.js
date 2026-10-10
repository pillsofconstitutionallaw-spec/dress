// Le taglie che uno porta di solito.
//
// Al posto del peso. Il peso si chiedeva «per proporti la taglia giusta», e
// non serviva a niente: nessuna parte dell'app lo usava, e per passare dai
// chili alla taglia servirebbero le tabelle di ogni marca, che non abbiamo.
// La taglia invece la sa chiunque a memoria, non mette a disagio nessuno, e
// si confronta direttamente con quelle che i negozi scrivono sui capi.
//
// Lettere sopra e sotto, numeri per le scarpe: sono le scale che nel catalogo
// compaiono più spesso, e le uniche su cui si può dire con sicurezza «questo
// capo nella tua taglia non c'è».

export const TAGLIE_LETTERE = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL"];
export const TAGLIE_SCARPE = ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47"];

export const DOMANDE_TAGLIA = [
  { id: "tagliaSopra", nome: "Sopra", detta: "magliette, camicie, maglioni, giacche", scala: TAGLIE_LETTERE },
  { id: "tagliaSotto", nome: "Sotto", detta: "pantaloni, gonne, jeans", scala: TAGLIE_LETTERE },
  { id: "tagliaScarpe", nome: "Scarpe", detta: "numero europeo", scala: TAGLIE_SCARPE },
];

/** Le taglie di un profilo in una riga: «Sopra M · Sotto S · Scarpe 39». */
export function taglieInBreve(profilo = {}) {
  return DOMANDE_TAGLIA.filter((d) => profilo[d.id])
    .map((d) => `${d.nome} ${profilo[d.id]}`)
    .join(" · ");
}

/**
 * Il profilo senza i dati che non teniamo più.
 *
 * Il peso c'era nei profili salvati prima che smettessimo di chiederlo. Non
 * lo usiamo, e un dato che non si usa non si conserva: si toglie quando il
 * profilo si rilegge, e al primo salvataggio sparisce anche dall'account.
 */
export function senzaDatiInutili(profilo) {
  if (!profilo || typeof profilo !== "object") return profilo;
  const { weight, ...resto } = profilo;
  return resto;
}
