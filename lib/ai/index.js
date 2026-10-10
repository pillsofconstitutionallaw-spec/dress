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

// ── Il tempo, e chi è a riposo ─────────────────────────────────────────
//
// Vercel chiude una funzione dopo trenta secondi (maxDuration nelle rotte),
// e la fila non lo sapeva: Gemini poteva aspettare quarantacinque secondi,
// gli altri trenta ciascuno. Bastava che il primo fosse lento perché la
// funzione venisse chiusa prima di chiedere al secondo, e chi aveva caricato
// la foto di una camicia riceveva un errore invece di un abbinamento — con
// Groq lì, pronto, che non era mai stato interpellato.
//
// Adesso la fila ha un tempo suo, e ognuno ha solo quello che resta.
const TEMPO_FILA_MS = Number(process.env.AI_TEMPO_MS || 25000);
// E nessuno da solo può prendersi tutta la fila. Gemini senza quota non
// risponde né sì né no: resta appeso, e si mangiava i venticinque secondi
// interi mentre Groq, terzo, risponde a una foto in tre. Nove secondi
// bastano a chi funziona e non fanno aspettare per niente chi no.
const TEMPO_FORNITORE_MS = Number(process.env.AI_TEMPO_FORNITORE_MS || 9000);

// Chi ha detto «quota finita» (429) non la ritrova fra un secondo: lo si
// manda in fondo alla fila per dieci minuti, così le foto dopo non
// aspettano un no già sentito. In fondo, non fuori: se tutti gli altri
// cadono, si riprova anche lui.
const RIPOSO_MS = 10 * 60 * 1000;
// Chi è andato fuori tempo riposa meno: può essere stata una lentezza sua
// di un momento, non un no.
const RIPOSO_LENTO_MS = 3 * 60 * 1000;
const aRiposo = new Map();

export function ordinaPerRiposo(lista, riposi = aRiposo, adesso = Date.now()) {
  const stanco = (p) => (riposi.get(p.name) || 0) > adesso;
  return [...lista.filter((p) => !stanco(p)), ...lista.filter(stanco)];
}

export function conScadenza(promessa, ms, nome) {
  let timer;
  const scadenza = new Promise((_, no) => {
    timer = setTimeout(() => no(new Error(`${nome}: tempo finito`)), Math.max(0, ms));
  });
  return Promise.race([promessa, scadenza]).finally(() => clearTimeout(timer));
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
  const lista = spento ? [] : ordinaPerRiposo(catena(task));
  const fine = Date.now() + TEMPO_FILA_MS;

  const inciampi = [];
  for (const provider of lista) {
    // Sotto i due secondi non si comincia nemmeno: nessuno risponde a una
    // foto così in fretta, e il tempo serve a restituire almeno l'esempio.
    const resta = fine - Date.now();
    if (resta < 2000) {
      inciampi.push(`${provider.name}: saltato, tempo finito`);
      continue;
    }
    try {
      const dati = await conScadenza(provider[task](args), Math.min(resta, TEMPO_FORNITORE_MS), provider.name);
      // Gli inciampi si riportano anche quando qualcuno DOPO ha risposto.
      //
      // Prima si scrivevano solo se cadevano tutti, e chi cadeva per primo
      // spariva senza lasciare traccia: l'app sembrava funzionare, e intanto
      // il fornitore in testa alla fila falliva a ogni richiesta. È così che
      // Groq è rimasto rotto per settimane con un modello ritirato, e così
      // che Gemini ha continuato a sbagliare mentre Groq lo copriva.
      return { source: provider.name, ...dati, ...(inciampi.length ? { note: inciampi.join(" | ").slice(0, 400) } : {}) };
    } catch (e) {
      // Ottanta caratteri non bastavano a capire perché: il messaggio di
      // Google arrivava tagliato a metà proprio dove diceva la causa.
      const messaggio = String(e.message || e);
      if (/(^|\D)429(\D|$)/.test(messaggio)) aRiposo.set(provider.name, Date.now() + RIPOSO_MS);
      else if (/tempo finito|_TIMEOUT/.test(messaggio)) aRiposo.set(provider.name, Date.now() + RIPOSO_LENTO_MS);
      inciampi.push(`${provider.name}: ${messaggio.slice(0, 240)}`);
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
