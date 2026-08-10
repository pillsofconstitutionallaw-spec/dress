// Server-only helper. Calls the Gemini REST API (free tier friendly).
// Never import this from a client component — it reads the secret key.

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export function hasKey() {
  return Boolean(process.env.GEMINI_API_KEY);
}

// parts: array of { text } and/or { inlineData: { mimeType, data(base64) } }
export async function generateJSON(parts) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("NO_KEY");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;

  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`GEMINI_${res.status}: ${detail.slice(0, 300)}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned);
}

// Turn a data URL ("data:image/jpeg;base64,....") into a Gemini image part.
export function imagePart(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) return null;
  const [meta, data] = dataUrl.split(",");
  const mimeType = meta.slice(5, meta.indexOf(";")) || "image/jpeg";
  return { inlineData: { mimeType, data } };
}
