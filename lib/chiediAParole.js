// Quando il campo «chiedi a parole» ha senso di esserci.
//
// La frase la legge un modello, e i modelli finiscono: la chiave scade, il
// piano gratuito si esaurisce, il fornitore risponde 401 e non lo dice a
// nessuno. Quando succede, il campo resta in pagina e a ogni frase risponde
// «in questo momento non riesco a leggere» — che è onesto la prima volta e
// maleducato la seconda.
//
// Non basta guardare se una chiave è configurata: oggi in .env.local ce n'è
// una che c'è e non vale niente. L'unica prova che qualcuno sappia leggere è
// che abbia letto. Quindi il campo si mostra, e si toglie quando si è visto
// che non serve — per un giorno, perché la chiave può essere sistemata da un
// momento all'altro e non ci sarà nessuno a riaccendere niente a mano.

const UN_GIORNO = 24 * 60 * 60 * 1000;

export function spegniFinoA(adesso = Date.now()) {
  return { fino: adesso + UN_GIORNO };
}

export function mostraIlCampo(memoria, adesso = Date.now()) {
  // Dentro localStorage ci finisce di tutto, anche roba di altre versioni
  // dell'app. Nel dubbio si mostra: un campo di troppo è meno grave di una
  // funzione sparita per sempre.
  const fino = memoria && typeof memoria === "object" ? memoria.fino : null;
  if (typeof fino !== "number" || !Number.isFinite(fino)) return true;
  return adesso >= fino;
}
