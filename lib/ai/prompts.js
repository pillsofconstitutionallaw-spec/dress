// Ogni funzione è una "linea" indipendente: un compito, un prompt.
// Si possono migliorare o sostituire una alla volta, senza toccare il resto.

// Le forme del JSON atteso. Passandole a Gemini il modello è OBBLIGATO a
// rispettarle: niente più risposte fuori formato da ripulire a mano.
export const colorSchema = {
  type: "object",
  properties: {
    season: { type: "string" },
    styleReading: { type: "string" },
    palette: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          hex: { type: "string" },
          why: { type: "string" },
        },
        required: ["name", "hex", "why"],
      },
    },
  },
  required: ["season", "palette"],
};

export const resellSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    category: { type: "string" },
    description: { type: "string" },
    priceRange: { type: "string" },
    matchTips: { type: "array", items: { type: "string" } },
  },
  required: ["title", "category", "description", "priceRange", "matchTips"],
};

export function colorPrompt(profile = {}) {
  return `Sei un consulente d'immagine e armocromista professionista.
Analizza la persona nelle foto e i dati forniti, poi proponi una palette colori personale.

Dati dichiarati:
- Altezza: ${profile.height || "n/d"} cm
- Capelli: ${profile.hair || "n/d"}
- Occhi: ${profile.eyes || "n/d"}
- Stile attuale dichiarato: ${profile.style || "non indicato"}
- Sesso: ${profile.sex || "non indicato"}
- Orientamento (opzionale): ${profile.orientation || "n/d"}

Istruzioni:
- Deduci la stagione armocromatica (es. Autunno caldo, Inverno freddo, ecc.) dagli incarnati visibili.
- Proponi ESATTAMENTE 5 colori che valorizzano davvero questa persona (mix di neutri di base e colori d'accento).
- Per ogni colore: nome evocativo in italiano, hex plausibile, e una frase brevissima sul perché.
- Se lo stile dichiarato è "non so" o vuoto, aggiungi una breve lettura dello stile percepito dalla foto a figura intera.
- Rispondi SOLO con JSON valido, senza testo attorno:
{"season":"...","styleReading":"... o null","palette":[{"name":"...","hex":"#RRGGBB","why":"..."}]}`;
}

export function resellPrompt() {
  return `Sei un esperto di rivendita di abbigliamento second-hand (tipo Vinted).
Osserva il capo nella foto e produci una scheda di vendita realistica per il mercato italiano.
Includi: titolo accattivante ma onesto, categoria, descrizione di 2-3 frasi, fascia di prezzo realistica in euro per l'usato, e 3 consigli di abbinamento (matchTips).
Rispondi SOLO con JSON valido:
{"title":"...","category":"...","description":"...","priceRange":"XX–YY €","matchTips":["...","...","..."]}`;
}
