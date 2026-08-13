import { vintedListingUrl } from "@/lib/data";
import { colorPrompt, resellPrompt } from "./prompts";

// Un provider solo per tutti quelli che parlano la lingua di OpenAI.
//
// Mistral, Groq, OpenRouter, Together, DeepInfra e una decina d'altri
// espongono lo stesso identico formato: cambia l'indirizzo e la chiave, non
// il codice. È questo che ci permette di tenerne quattro in fila senza
// scrivere quattro volte la stessa cosa.

export function creaProvider({ nome, url, chiave, modello, vista = false, timeout = 30000 }) {
  async function chiedi(testo, immagini = []) {
    if (!chiave) throw new Error(`${nome.toUpperCase()}_SENZA_CHIAVE`);

    // Le immagini si passano nel formato che tutti hanno copiato da OpenAI —
    // ma solo a chi sa guardarle. A un modello di solo testo un'immagine non
    // fa fallire la richiesta: la fa fallire in modo confuso, ed è peggio.
    const contenuto = vista && immagini.length
      ? [{ type: "text", text: testo }, ...immagini.map((u) => ({ type: "image_url", image_url: { url: u } }))]
      : testo;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${chiave}` },
        body: JSON.stringify({
          model: modello,
          messages: [{ role: "user", content: contenuto }],
          temperature: 0.7,
          max_tokens: 900,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });
    } catch (e) {
      throw new Error(e.name === "AbortError" ? `${nome}_TIMEOUT` : `${nome}_RETE`);
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const dettaglio = await res.text().catch(() => "");
      throw new Error(`${nome}_${res.status}: ${dettaglio.slice(0, 160)}`);
    }

    const json = await res.json();
    const testoRisposta = json?.choices?.[0]?.message?.content || "";
    const pulito = testoRisposta.replace(/```json/gi, "").replace(/```/g, "").trim();
    if (!pulito) throw new Error(`${nome}_RISPOSTA_VUOTA`);

    try {
      return JSON.parse(pulito);
    } catch {
      throw new Error(`${nome}_JSON_NON_VALIDO`);
    }
  }

  return {
    name: nome,
    disponibile: () => Boolean(chiave),

    vista,

    // Le foto NON vengono mai inviate qui. L'analisi la fa il motore nel
    // telefono; a questo serve solo il risultato, e le parole si scrivono
    // benissimo da tre numeri. È la differenza fra "non conserviamo le foto"
    // e "le foto non escono dal dispositivo": solo la seconda è una garanzia.
    async analyzeColor({ profile = {}, misura = null } = {}) {
      const data = await chiedi(colorPrompt(profile, misura), []);
      return {
        season: data.season || "",
        styleReading: data.styleReading || null,
        palette: Array.isArray(data.palette) ? data.palette.slice(0, 5) : [],
        stili: Array.isArray(data.stili) ? data.stili.slice(0, 5) : [],
      };
    },

    async resell({ image = null } = {}) {
      if (!vista) throw new Error(`${nome}_SENZA_VISTA`);
      const immagini = typeof image === "string" && image.startsWith("data:") ? [image] : [];
      if (!immagini.length) throw new Error("NO_IMAGE");
      const data = await chiedi(resellPrompt(), immagini);
      return {
        title: data.title || "Capo",
        category: data.category || "—",
        description: data.description || "",
        priceRange: data.priceRange || "—",
        matchTips: Array.isArray(data.matchTips) ? data.matchTips.slice(0, 4) : [],
        vintedUrl: vintedListingUrl(data.title || "capo abbigliamento"),
      };
    },
  };
}

// I fornitori che accettiamo, in ordine di preferenza.
//
// Mistral per primo perché è europeo: con selfie di persone reali, restare
// dentro il GDPR senza trasferimenti fuori dall'Unione vale più della velocità.
export const FORNITORI = [
  {
    nome: "mistral",
    url: "https://api.mistral.ai/v1/chat/completions",
    chiave: () => process.env.MISTRAL_API_KEY,
    modello: () => process.env.MISTRAL_MODEL || "mistral-small-latest",
    vista: true,
  },
  {
    nome: "groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    chiave: () => process.env.GROQ_API_KEY,
    modello: () => process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    // Su Groq i modelli con la vista vanno e vengono: qui serve per le parole,
    // e la foto la legge già il nostro motore.
    vista: false,
  },
  {
    nome: "openrouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    chiave: () => process.env.OPENROUTER_API_KEY,
    modello: () => process.env.OPENROUTER_MODEL || "meta-llama/llama-3.2-11b-vision-instruct:free",
    vista: true,
  },
  {
    nome: "personale",
    url: process.env.AI_API_URL || "",
    chiave: () => process.env.AI_API_KEY,
    modello: () => process.env.AI_MODEL || "gpt-4o-mini",
    vista: true,
  },
];
