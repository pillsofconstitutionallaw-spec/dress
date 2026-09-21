// Cosa si porta adesso, contato sul catalogo invece che indovinato.
//
// Il conteggio vero sta nel database (sql/tendenze.sql) e gira una volta a
// notte, subito dopo l'importazione: scorrere centoquattordicimila titoli
// cercando quattordici parole prende sei secondi, e il database ne concede
// otto. Finché lo si faceva mentre qualcuno aspettava la pagina, era un lancio
// di moneta che peggiorava ogni notte, man mano che il catalogo cresceva.
//
// Qui resta l'unica cosa che ha senso fare a valle: da conteggi grezzi a
// percentuali, in fila dal più portato.

export function conQuote(righe) {
  const tagli = (righe || [])
    // PostgREST restituisce i bigint come stringhe — «"quanti": "1200"» — e
    // sommare stringhe le incolla invece di addizionarle.
    .map((t) => ({ taglio: t.taglio, quanti: Number(t.quanti) || 0 }))
    // Un taglio che in catalogo non c'è diventerebbe un tasto che non porta
    // da nessuna parte: meglio non mostrarlo.
    .filter((t) => t.quanti > 0)
    .sort((a, b) => b.quanti - a.quanti);

  const totale = tagli.reduce((s, t) => s + t.quanti, 0);
  return tagli.map((t) => ({ ...t, quota: totale ? Math.round((t.quanti / totale) * 100) : 0 }));
}
