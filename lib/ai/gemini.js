import { generateJSON, imagePart } from "@/lib/gemini";
import { normalizzaResell } from "./resell";
import { colorPrompt, colorSchema, resellPrompt, resellSchema } from "./prompts";

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

  async resell({ image = null } = {}) {
    const img = imagePart(image);
    if (!img) throw new Error("NO_IMAGE");
    const data = await generateJSON([{ text: resellPrompt() }, img], resellSchema);
    return normalizzaResell(data);
  },
};
