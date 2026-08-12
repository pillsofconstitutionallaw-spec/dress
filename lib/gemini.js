// Solo lato server: legge la chiave segreta.
// Non importare mai questo file da un componente client.

// gemini-2.5-flash è il modello del tier gratuito: veloce, legge le immagini
// e costa zero. Si cambia con GEMINI_MODEL senza toccare il codice.
const rawModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
export const MODEL = rawModel.replace(/^models\//, "");

const TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 45000);

export function hasKey() {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * Chiede a Gemini una risposta in JSON.
 *
 * @param parts  array di { text } e/o { inlineData: { mimeType, data } }
 * @param schema forma del JSON atteso (facoltativa ma consigliata): il modello
 *               è obbligato a rispettarla, così non serve sperare che risponda bene.
 */
export async function generateJSON(parts, schema = null) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("NO_KEY");

  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: "application/json",
      ...(schema ? { responseSchema: schema } : {}),
    },
  };

  // Senza scadenza una richiesta bloccata terrebbe l'utente ad aspettare
  // per sempre: meglio fallire e ripiegare sui risultati d'esempio.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    throw new Error(e.name === "AbortError" ? "GEMINI_TIMEOUT" : `GEMINI_RETE: ${e.message}`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`GEMINI_${res.status}: ${detail.slice(0, 300)}`);
  }

  const json = await res.json();

  // Il modello può fermarsi prima di finire: meglio saperlo che ricevere
  // un JSON troncato e illeggibile.
  const candidate = json?.candidates?.[0];
  if (candidate?.finishReason && !["STOP", "MAX_TOKENS"].includes(candidate.finishReason)) {
    throw new Error(`GEMINI_INTERROTTO: ${candidate.finishReason}`);
  }

  const text = candidate?.content?.parts?.map((p) => p.text).join("") || "";
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  if (!cleaned) throw new Error("GEMINI_RISPOSTA_VUOTA");

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`GEMINI_JSON_NON_VALIDO: ${cleaned.slice(0, 120)}`);
  }
}

// Trasforma una data URL ("data:image/jpeg;base64,…") in un'immagine per Gemini.
export function imagePart(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) return null;
  const [meta, data] = dataUrl.split(",");
  const mimeType = meta.slice(5, meta.indexOf(";")) || "image/jpeg";
  return { inlineData: { mimeType, data } };
}
