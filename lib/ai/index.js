import { hasKey } from "@/lib/gemini";
import { demo } from "./demo";
import { gemini } from "./gemini";
import { creaProvider, FORNITORI } from "./openai-compatibile";

// Chi scrive le parole.
//
// L'analisi dei colori e degli stili NON passa più di qui: la fa Dress, nel
// telefono, e funziona sempre. All'AI resta la rifinitura — la lettura dello
// stile, i capi da cui partire. È un compito piccolo, poche centinaia di
// caratteri per utente, e per questo un tier gratuito basta.
//
// Ma un tier gratuito prima o poi si esaurisce. Perciò non ne teniamo uno:
// li proviamo in fila. Quando il primo dice di no, risponde il secondo, e
// l'utente non se ne accorge.

function catena() {
  const disponibili = [];

  for (const f of FORNITORI) {
    const chiave = f.chiave();
    const url = typeof f.url === "function" ? f.url() : f.url;
    if (!chiave || !url) continue;
    disponibili.push(creaProvider({ nome: f.nome, url, chiave, modello: f.modello() }));
  }

  // Gemini resta in coda: funziona, ma è quello che si è già esaurito una volta.
  if (hasKey()) disponibili.push(gemini);

  return disponibili;
}

export function getProvider() {
  const preferito = (process.env.AI_PROVIDER || "").toLowerCase();
  if (preferito === "demo") return demo;

  const lista = catena();
  if (preferito) {
    const scelto = lista.find((p) => p.name === preferito);
    if (scelto) return scelto;
  }
  return lista[0] || demo;
}

/**
 * Esegue un compito provando i fornitori in fila.
 *
 * Non è un ripiego di emergenza: è il funzionamento normale. Con quattro
 * tier gratuiti in fila, la probabilità che nessuno risponda è quella che
 * cadano tutti insieme — e anche allora l'app resta in piedi, perché la
 * parte che conta l'ha già calcolata da sola.
 */
export async function run(task, args) {
  const preferito = (process.env.AI_PROVIDER || "").toLowerCase();
  const lista = preferito === "demo" ? [] : catena();

  const inciampi = [];
  for (const provider of lista) {
    try {
      const dati = await provider[task](args);
      return { source: provider.name, ...dati };
    } catch (e) {
      inciampi.push(`${provider.name}: ${String(e.message || e).slice(0, 80)}`);
    }
  }

  // Nessuno ha risposto: i risultati d'esempio, con dentro cosa è andato storto.
  const dati = await demo[task](args);
  return {
    source: "demo",
    ...dati,
    ...(inciampi.length ? { note: inciampi.join(" | ").slice(0, 300) } : {}),
  };
}

// Per la pagina di stato: chi è collegato e chi no.
export function fornitoriAttivi() {
  return catena().map((p) => p.name);
}
