import { hasKey } from "@/lib/gemini";
import { demo } from "./demo";
import { gemini } from "./gemini";
import { local } from "./local";

// Registro dei provider disponibili. Aggiungerne uno = una riga qui.
const PROVIDERS = { demo, gemini, local };

// Sceglie il provider in base a AI_PROVIDER (env).
// - "demo"   → sempre risultati d'esempio
// - "gemini" → Gemini se c'è la chiave, altrimenti demo
// - non impostato → auto: Gemini se c'è la chiave, altrimenti demo
export function getProvider() {
  const pref = (process.env.AI_PROVIDER || "").toLowerCase();
  if (pref === "demo") return demo;
  if (PROVIDERS[pref]) return hasKey() ? PROVIDERS[pref] : demo;
  return hasKey() ? gemini : demo;
}

// Esegue un compito e, se il provider reale fallisce, ripiega su demo
// così l'utente riceve sempre una risposta usabile.
export async function run(task, args) {
  const provider = getProvider();
  try {
    const data = await provider[task](args);
    return { source: provider.name, ...data };
  } catch (e) {
    const data = await demo[task](args);
    return { source: "fallback", ...data, note: String(e?.message || e).slice(0, 160) };
  }
}
