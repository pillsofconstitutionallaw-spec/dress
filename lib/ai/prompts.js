import { FAMIGLIE_STILI } from "@/lib/data";
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
    // Al massimo cinque: oltre non è più un consiglio, è un elenco.
    stili: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nome: { type: "string" },
          perche: { type: "string" },
          capi: { type: "array", items: { type: "string" } },
        },
        required: ["nome", "perche"],
      },
    },
  },
  required: ["season", "palette", "stili"],
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

// Le regole di condotta valgono per ogni compito: questa app è uno spazio in
// cui la gente carica la propria faccia. Non si commenta il corpo di nessuno.
export const REGOLE_DI_CONDOTTA = `Regole di condotta, non negoziabili:
- Non commentare MAI il peso, la corporatura, la forma del corpo, la pelle, l'età o i tratti del viso, né in bene né in male.
- Non usare mai parole come snellire, slanciare, nascondere, mimetizzare, correggere, difetto, problema, camuffare, allungare la figura.
- Non suggerire di coprire o dissimulare alcuna parte del corpo.
- Non dare per scontato il genere di chi scrive: se il dato non c'è, resta neutro.
- Parla di colori, luce e contrasto — cioè di come la luce cade sulla persona — mai di che aspetto dovrebbe avere.
- Il tono è quello di un amico competente: caldo, concreto, senza compiacenza e senza giudizio.
- Se un dato non basta per dire qualcosa, dillo con semplicità invece di inventare.`;

// L'elenco da cui scegliere, preso da lib/data.js: una fonte sola, altrimenti
// il modello consiglia stili che l'app non conosce e i capi non si trovano.

export function colorPrompt(profile = {}) {
  return `Sei un consulente d'immagine e armocromista professionista.
Analizza la persona nelle foto e i dati forniti, poi proponi una palette colori personale.

${REGOLE_DI_CONDOTTA}

Dati dichiarati:
- Altezza: ${profile.height || "n/d"} cm
- Capelli: ${profile.hair || "n/d"}
- Occhi: ${profile.eyes || "n/d"}
- Stile attuale dichiarato: ${profile.style || "non indicato"}
- Sesso: ${profile.sex || "non indicato"}

Nota sui dati fisici: altezza e taglia servono SOLO a proporre capi della misura
giusta. Non sono materia di commento e non entrano in nessuna frase di risposta.

Istruzioni:
- Deduci la stagione armocromatica (es. Autunno caldo, Inverno freddo, ecc.) dagli incarnati visibili.
- Proponi ESATTAMENTE 5 colori che valorizzano davvero questa persona (mix di neutri di base e colori d'accento).
- Per ogni colore: nome evocativo in italiano, hex plausibile, e una frase brevissima sul perché — parlando del colore, non della persona.
- Se lo stile dichiarato è "non so" o vuoto, aggiungi una breve lettura dello stile percepito dalla foto: descrivi i CAPI e le scelte, mai il corpo.

Poi consiglia gli stili che stanno meglio a questa persona:
- Scegli SOLO da questo elenco, raggruppato per famiglia:
${FAMIGLIE_STILI.map((f) => `  ${f.famiglia}: ${f.stili.join(", ")}`).join("\n")}
- Puoi attingere a famiglie diverse: quasi nessuno appartiene a una sola.
- AL MASSIMO CINQUE, ordinati dal più adatto al meno. Meglio tre azzeccati che cinque a caso.
- Se lo stile dichiarato dalla persona è già nell'elenco e le sta bene, mettilo per primo.
- Per ognuno: una frase sul perché — basata sui colori, sul contrasto e sulle scelte che si vedono nella foto, MAI sulla corporatura.
- E due o tre capi concreti da cui partire ("blazer destrutturato beige", "mocassini in pelle marrone", "sneaker bianche minimal"): devono essere cose comprabili, non concetti.

- Rispondi SOLO con JSON valido, senza testo attorno:
{"season":"...","styleReading":"... o null","palette":[{"name":"...","hex":"#RRGGBB","why":"..."}],"stili":[{"nome":"...","perche":"...","capi":["...","..."]}]}`;
}

export function resellPrompt() {
  return `Sei un esperto di rivendita di abbigliamento second-hand (tipo Vinted).

${REGOLE_DI_CONDOTTA}

Osserva il capo nella foto e produci una scheda di vendita realistica per il mercato italiano.
Includi: titolo accattivante ma onesto, categoria, descrizione di 2-3 frasi, fascia di prezzo realistica in euro per l'usato, e 3 consigli di abbinamento (matchTips).
Rispondi SOLO con JSON valido:
{"title":"...","category":"...","description":"...","priceRange":"XX–YY €","matchTips":["...","...","..."]}`;
}
