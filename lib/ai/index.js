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

// Due linee separate, non una sola.
//
// I compiti sono di due specie e hanno bisogni diversi. Guardare una foto e
// scriverci sopra un annuncio di vendita vuole un modello che VEDE, e ogni
// richiesta costa migliaia di token perché l'immagine viaggia con lei.
// Rifinire delle parole — la lettura dello stile, i capi da cui partire — è
// testo e basta, e costa una frazione.
//
// Tenerli sulla stessa fila li faceva litigare: una manciata di foto
// esauriva il budget al minuto, e da lì in poi anche i compiti di sole
// parole ripiegavano sui risultati d'esempio, senza che c'entrassero
// niente. Adesso ogni linea ha la sua fila e il suo budget.
//
// Si configurano da fuori, senza toccare il codice:
//   AI_FOTO   quale fornitore preferire per i compiti con l'immagine
//   AI_PAROLE quale per quelli di solo testo
//   AI_PROVIDER vale per tutti e due, se le due sopra non ci sono
const COMPITI_CON_FOTO = new Set(["vendi", "abbina"]);

function filaCompleta({ soloVista = false } = {}) {
  const disponibili = [];

  for (const f of FORNITORI) {
    const chiave = f.chiave();
    const url = typeof f.url === "function" ? f.url() : f.url;
    if (!chiave || !url) continue;
    // A un modello di solo testo una foto non si manda: fallirebbe, e
    // fallendo brucerebbe il suo turno nella fila per niente.
    if (soloVista && !f.vista) continue;
    disponibili.push(creaProvider({ nome: f.nome, url, chiave, modello: f.modello(), vista: Boolean(f.vista) }));
  }

  // Gemini resta in coda: funziona, ma è quello che si è già esaurito una volta.
  if (hasKey()) disponibili.push(gemini);

  return disponibili;
}

/** La fila giusta per il compito, col preferito davanti se è indicato. */
export function catena(compito = null) {
  const conFoto = compito ? COMPITI_CON_FOTO.has(compito) : false;
  const lista = filaCompleta({ soloVista: conFoto });

  const preferito = (
    (conFoto ? process.env.AI_FOTO : process.env.AI_PAROLE) ||
    process.env.AI_PROVIDER ||
    ""
  ).toLowerCase();

  if (!preferito || preferito === "demo") return lista;
  // Il preferito passa davanti, gli altri restano dietro come riserva: se
  // sparisse dalla fila, il compito non avrebbe più nessuno a cui chiedere.
  const scelto = lista.find((p) => p.name === preferito);
  return scelto ? [scelto, ...lista.filter((p) => p !== scelto)] : lista;
}

export function getProvider(compito = null) {
  if ((process.env.AI_PROVIDER || "").toLowerCase() === "demo") return demo;
  return catena(compito)[0] || demo;
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
  const spento = (process.env.AI_PROVIDER || "").toLowerCase() === "demo";
  const lista = spento ? [] : catena(task);

  const inciampi = [];
  for (const provider of lista) {
    try {
      const dati = await provider[task](args);
      return { source: provider.name, ...dati };
    } catch (e) {
      // Ottanta caratteri non bastavano a capire perché: il messaggio di
      // Google arrivava tagliato a metà proprio dove diceva la causa.
      inciampi.push(`${provider.name}: ${String(e.message || e).slice(0, 240)}`);
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
