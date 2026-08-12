import { vintedListingUrl } from "@/lib/data";
import { colorPrompt, resellPrompt } from "./prompts";

const API_URL = (process.env.AI_API_URL || "").replace(/\/$/, "");
const MODEL = process.env.AI_MODEL || "gpt-4o-mini";
const API_KEY = process.env.AI_API_KEY || "";

function extractText(json) {
  if (!json) return "";
  if (typeof json === "string") return json;
  if (json.choices?.[0]?.message?.content) return json.choices[0].message.content;
  if (json.choices?.[0]?.text) return json.choices[0].text;
  if (json.output_text) return json.output_text;
  if (json.results?.[0]?.output_text) return json.results[0].output_text;
  if (json.candidates?.[0]?.message?.content) return json.candidates[0].message.content;
  return "";
}

async function request(content) {
  if (!API_URL) throw new Error("NO_AI_API_URL");
  const headers = { "Content-Type": "application/json" };
  if (API_KEY) headers.Authorization = `Bearer ${API_KEY}`;

  const body = {
    model: MODEL,
    messages: [{ role: "user", content }],
    temperature: 0.7,
    max_tokens: 1200,
  };

  const res = await fetch(API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`AI_PROVIDER_ERROR ${res.status}: ${detail.slice(0, 300)}`);
  }

  const json = await res.json();
  const text = extractText(json).replace(/```json/gi, "").replace(/```/g, "").trim();
  return JSON.parse(text);
}

export const local = {
  name: "local",

  async analyzeColor({ profile = {}, closeup = null, fullbody = null } = {}) {
    const parts = [colorPrompt(profile)];
    if (closeup) parts.push("[IMAGE_CLOSEUP]", closeup);
    if (fullbody) parts.push("[IMAGE_FULLBODY]", fullbody);
    const content = parts.join("\n\n");
    const data = await request(content);
    return {
      season: data.season || "",
      styleReading: data.styleReading || null,
      palette: Array.isArray(data.palette) ? data.palette.slice(0, 5) : [],
    };
  },

  async resell({ image = null } = {}) {
    if (!image) throw new Error("NO_IMAGE");
    const content = `${resellPrompt()}\n\n[IMAGE] ${image}`;
    const data = await request(content);
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
