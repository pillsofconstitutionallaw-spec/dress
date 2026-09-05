// Solo lato server: legge la chiave segreta.
// Non importare mai questo file da un componente client.

// Il modello preferito. Si cambia con GEMINI_MODEL senza toccare il codice.
const rawModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
export const MODEL = rawModel.replace(/^models\//, "");

/**
 * Se il nome del modello non esiste più, se ne cerca uno che esiste.
 *
 * I nomi dei modelli invecchiano, e quando invecchiano l'API risponde 404.
 * Da qui in poi succedeva questo: nessun fornitore rispondeva — Mistral era
 * a corto di richieste, Groq non guarda le immagini — e l'app ripiegava sui
 * risultati d'esempio. Cioè gli annunci di vendita uscivano tutti uguali,
 * con scritto "Capo in buone condizioni", e sembrava che a scriverli male
 * fosse il modello. Non c'era nessun modello: c'era un nome sbagliato.
 *
 * Scriverne un altro a mano rimanderebbe il problema di qualche mese.
 * Chiedere quali esistono, invece, non invecchia.
 */
let modelloVerificato = null;

export function scegliModello(elenco, preferito = MODEL) {
  const utili = (elenco || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map((m) => String(m.name || "").replace(/^models\//, ""))
    .filter(Boolean);

  if (utili.includes(preferito)) return preferito;

  // Fra quelli che restano: prima i "flash", che sono i veloci e i gratuiti,
  // e fra quelli il più recente — che nei nomi di Google è il numero più
  // alto. Niente anteprime e niente sperimentali: su quelli l'accesso può
  // sparire da un giorno all'altro, ed è così che si torna al 404.
  const buoni = utili.filter((m) => !/preview|exp|thinking|tuning/.test(m));
  const flash = buoni.filter((m) => m.includes("flash") && !m.includes("lite"));
  const ordinati = (flash.length ? flash : buoni).sort().reverse();
  return ordinati[0] || null;
}

async function modelloDaUsare(key) {
  if (modelloVerificato) return modelloVerificato;
  return MODEL;
}

async function cercaModelloVivo(key) {
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
    headers: { "x-goog-api-key": key },
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  return scegliModello(json?.models || []);
}

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

  const chiedi = async (modello) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modello}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

  let res;
  try {
    res = await chiedi(await modelloDaUsare(key));

    // 404 vuol dire "quel modello non esiste": si chiede quali esistono e si
    // riprova, una volta sola. La risposta si tiene per le chiamate dopo,
    // così l'elenco lo si chiede una volta per processo e non a ogni foto.
    if (res.status === 404) {
      const vivo = await cercaModelloVivo(key);
      if (vivo) {
        modelloVerificato = vivo;
        res = await chiedi(vivo);
      }
    }
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
