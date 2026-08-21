import { generateJSON, imagePart } from "@/lib/gemini";
import { normalizzaAbbinamento, normalizzaVendita } from "./capo";
import { abbinaPrompt, abbinaSchema, colorPrompt, colorSchema, vendiPrompt, vendiSchema } from "./prompts";

// Provider "gemini". Implementa la STESSA interfaccia di demo.js.
// Per aggiungere un altro provider (Mistral, OpenAI, un tuo modello),
// basta creare un file con le stesse due funzioni e registrarlo in index.js.
export const gemini = {
  name: "gemini",

  async analyzeColor({ profile = {}, closeup = null, fullbody = null } = {}) {
    const parts = [{ text: colorPrompt(profile) }];
    const cp = imagePart(closeup);
    const fb = imagePart(fullbody);
    if (cp) parts.push(cp);
    if (fb) parts.push(fb);

    const data = await generateJSON(parts, colorSchema);
    return {
      season: data.season || "",
      styleReading: data.styleReading || null,
      palette: Array.isArray(data.palette) ? data.palette.slice(0, 5) : [],
      // Il tetto di cinque lo chiediamo nel prompt, ma lo imponiamo anche qui:
      // se il modello ne manda otto, non è l'utente a doverseli leggere.
      stili: Array.isArray(data.stili) ? data.stili.slice(0, 5) : [],
    };
  },

  async abbina({ image = null } = {}) {
    const img = imagePart(image);
    if (!img) throw new Error("NO_IMAGE");
    const data = await generateJSON([{ text: abbinaPrompt() }, img], abbinaSchema);
    return normalizzaAbbinamento(data);
  },

  async vendi({ image = null } = {}) {
    const img = imagePart(image);
    if (!img) throw new Error("NO_IMAGE");
    const data = await generateJSON([{ text: vendiPrompt() }, img], vendiSchema);
    return normalizzaVendita(data);
  },
};
