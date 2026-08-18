import { vintedListingUrl } from "@/lib/data";

// La scheda di rivendita, messa in ordine.
//
// La stessa normalizzazione stava copiata in tre file — gemini, i fornitori
// compatibili OpenAI e la demo — e ogni campo nuovo andava aggiunto tre volte.
// Adesso sta qui: i provider chiedono le parole al modello, questo file decide
// che forma hanno quando escono.

// Vinted taglia il titolo a 100 caratteri. Se ne mandiamo di più l'annuncio
// arriva monco, e uno se ne accorge solo dopo averlo pubblicato.
const MAX_TITOLO = 100;
// La descrizione su Vinted ne accetta molti di più, ma "breve" era il punto:
// tre frasi si leggono dal telefono, mezza pagina no.
const MAX_DESCRIZIONE = 300;

function pulisci(testo) {
  return String(testo || "").replace(/\s+/g, " ").trim();
}

function accorcia(testo, limite) {
  const t = pulisci(testo);
  if (t.length <= limite) return t;
  const tagliato = t.slice(0, limite - 1);
  const spazio = tagliato.lastIndexOf(" ");
  const base = spazio > limite * 0.6 ? tagliato.slice(0, spazio) : tagliato;
  return base.replace(/[\s,;:.\-–—]+$/, "") + "…";
}

// Per la descrizione i puntini di sospensione non vanno: un annuncio che si
// interrompe a metà sembra scritto da uno che non ci teneva. Se è lunga si
// taglia all'ultima frase intera che ci sta.
function frasiEntro(testo, limite) {
  const t = pulisci(testo);
  if (t.length <= limite) return t;
  let out = "";
  for (const frase of t.split(/(?<=[.!?])\s+/)) {
    // Anche la prima frase va misurata: se da sola sfora, non ce n'è una
    // intera che ci stia, e si scende ai puntini più sotto.
    const prossima = out ? out + " " + frase : frase;
    if (prossima.length > limite) break;
    out = prossima;
  }
  return out || accorcia(t, limite);
}

export function normalizzaResell(data = {}) {
  const title = pulisci(data.title) || "Capo";
  const description = pulisci(data.description);
  // Se il modello non ha scritto l'annuncio, non lasciamo il riquadro vuoto:
  // la scheda che c'è è già abbastanza per pubblicare.
  const vintedTitle = accorcia(data.vintedTitle || title, MAX_TITOLO);
  const vintedDescription = frasiEntro(data.vintedDescription || description, MAX_DESCRIZIONE);

  return {
    title,
    category: pulisci(data.category) || "—",
    description,
    priceRange: pulisci(data.priceRange) || "—",
    matchTips: Array.isArray(data.matchTips) ? data.matchTips.slice(0, 4) : [],
    vintedTitle,
    vintedDescription,
    vintedUrl: vintedListingUrl(vintedTitle || "capo abbigliamento"),
  };
}
