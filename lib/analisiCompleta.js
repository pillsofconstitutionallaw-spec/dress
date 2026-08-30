"use client";

import { analizzaColori } from "@/lib/analisiFoto";
import { consigliaStili } from "@/lib/consigliaStili";
import { leggiVestiti, stiliDaiVestiti } from "@/lib/leggiVestiti";
import { apiFetch, getUser } from "@/lib/session";

// L'analisi completa, in un posto solo.
//
// Stava dentro il bottone "Crea la mia palette" del questionario, ed era
// l'unico modo di ottenerla: per cambiare una riga — l'altezza, il colore
// degli occhi, una foto venuta male — bisognava rifare tutto il percorso
// dall'inizio. Adesso la stessa procedura la può chiamare anche il profilo,
// che di quel percorso ha già tutte le risposte e ne cambia una.

export const CHIAVE_SESSIONE = "dress:session";

/**
 * Cosa manca, e cosa cambierebbe se ci fosse.
 *
 * Un risultato più debole senza dire perché è un risultato che l'utente non
 * può migliorare: saprebbe solo che non gli somiglia.
 */
function cosaManca(nostra, { closeup, fullbody, profile }) {
  const mancanze = [];
  for (const problema of nostra.misura?.condizioni?.problemi || []) mancanze.push(problema);

  if (!closeup) {
    mancanze.push(
      "Senza il primo piano non abbiamo misurato il tuo incarnato: la stagione è dedotta dai dati che hai scritto, quindi meno precisa. Aggiungi una foto del viso in luce naturale.",
    );
  } else if (!nostra.misura?.daFoto) {
    mancanze.push(
      "La foto del viso non era leggibile — spesso è la luce artificiale o il viso troppo piccolo nell'inquadratura. Riprova vicino a una finestra.",
    );
  }
  if (!fullbody) {
    mancanze.push("Manca la foto a figura intera: senza, la lettura dello stile si basa solo su quello che hai dichiarato.");
  }
  // Il caso peggiore: niente da misurare e niente di dichiarato. Lì la
  // stagione esce da capelli e occhi soltanto, ed è giusto dirlo.
  if (!nostra.misura?.daFoto && !profile?.pelle) {
    mancanze.push(
      "Non hai scelto il colore della tua pelle e dalla foto non si è potuto misurare: la palette si regge solo su capelli e occhi. Il colore lo scegli dai campioncini, ci vogliono dieci secondi.",
    );
  }
  return mancanze;
}

/**
 * Dai dati e dalle foto alla stagione, ai colori e agli stili.
 * Gira tutta nel browser: le foto non escono dal dispositivo.
 */
export async function eseguiAnalisi({ profile = {}, closeup = null, fullbody = null, testRisposte = null } = {}) {
  const nostra = await analizzaColori({ profile, closeup, fullbody, testRisposte });

  // La data di nascita viene dall'iscrizione, non la chiediamo due volte.
  let dataNascita = null;
  try {
    const u = await getUser();
    dataNascita = u?.user_metadata?.data_nascita || null;
  } catch {
    /* senza account l'età semplicemente non entra nel calcolo */
  }

  // Come ti vesti già, letto dalla foto a figura intera: uno stylist non
  // chiede che stile hai, guarda.
  const vestiti = fullbody ? await leggiVestiti(fullbody) : null;
  const stili = consigliaStili(nostra, { ...profile, dataNascita }, stiliDaiVestiti(vestiti));

  return {
    risultato: { ...nostra, stili, styleReading: null },
    avvisi: cosaManca(nostra, { closeup, fullbody, profile }),
  };
}

/**
 * Le parole, se l'AI risponde: la lettura dello stile e i capi da cui partire.
 * Si mandano i NUMERI, mai le immagini. Se non risponde, chi legge non se ne
 * accorge — ha già tutto quello che conta.
 */
export async function arricchisciConAI(base, profile = {}) {
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile, misura: { season: base.season, palette: base.palette, ...base.misura } }),
    });
    const aiuto = await res.json();
    if (!res.ok || !aiuto?.source || aiuto.source === "fallback" || aiuto.source === "demo") return null;
    return {
      styleReading: aiuto.styleReading || base.styleReading,
      stili: (base.stili || []).map((s) => {
        const suo = (aiuto.stili || []).find((x) => x.nome === s.nome);
        return suo?.capi?.length ? { ...s, capi: suo.capi, perche: suo.perche || s.perche } : s;
      }),
    };
  } catch {
    return null;
  }
}

/** Salva l'esito sul profilo, se c'è un account. Senza, resta nel browser. */
export async function salvaAnalisi({ risultato, profile = {}, budget = "", testRisposte = null, stileScelto } = {}) {
  try {
    await apiFetch("/api/profile/save", {
      method: "POST",
      body: {
        palette: risultato.palette,
        dati: {
          season: risultato.season,
          misura: risultato.misura,
          stili: risultato.stili,
          styleReading: risultato.styleReading ?? null,
          stileScelto: stileScelto ?? risultato.stileScelto ?? null,
          profilo: { ...profile, budget },
          testArmocromia: testRisposte || {},
          aggiornato: new Date().toISOString(),
        },
      },
    });
  } catch {
    /* senza account resta tutto nel browser */
  }
}

/** Legge la sessione salvata in questo browser. */
export function leggiSessione() {
  try {
    return JSON.parse(localStorage.getItem(CHIAVE_SESSIONE) || "null") || null;
  } catch {
    return null;
  }
}

/**
 * Aggiorna la sessione del browser senza cancellare quello che non tocchiamo.
 *
 * È la stessa chiave che scrive il questionario: se il profilo la
 * sovrascrivesse per intero, rigenerare l'analisi cancellerebbe le foto o il
 * passo a cui si era arrivati.
 */
export function aggiornaSessione(pezzi) {
  try {
    const attuale = leggiSessione() || {};
    localStorage.setItem(CHIAVE_SESSIONE, JSON.stringify({ ...attuale, ...pezzi }));
    return true;
  } catch {
    return false;
  }
}
