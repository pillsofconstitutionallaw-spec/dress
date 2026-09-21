import { NextResponse } from "next/server";
import { readJson } from "@/lib/authServer";
import { run } from "@/lib/ai";
import { STILI_POSSIBILI, normalizzaRichiesta } from "@/lib/richiesta";

export const runtime = "nodejs";
export const maxDuration = 30;

// «Un outfit per un colloquio.»
//
// Questa rotta CAPISCE e basta. Non sceglie capi, non compone completi: passa
// la frase a un modello, prende quello che ne ha ricavato, lo fa passare dalla
// dogana di lib/richiesta.js e restituisce dei parametri. A vestire la persona
// ci pensa /api/outfit, che è il motore che c'era già.
//
// La divisione è voluta. Due motori che scelgono capi diventano due motori che
// scelgono capi DIVERSI, e il giorno che uno migliora l'altro resta indietro
// senza che nessuno se ne accorga. E un modello linguistico i capi non li ha
// davanti: se glieli chiedessimo se li inventerebbe, con la stessa sicurezza
// con cui risponde a tutto il resto.
export async function POST(req) {
  const { body, error: badJson } = await readJson(req);
  if (badJson) return badJson;

  const frase = String(body?.frase || "").trim();
  if (!frase) return NextResponse.json({ error: "SERVE_UNA_FRASE" }, { status: 400 });
  // Una richiesta è una frase, non un tema: oltre questa lunghezza non c'è
  // più niente da capire, e quello che arriva lo paghiamo a gettoni.
  if (frase.length > 400) {
    return NextResponse.json({ error: "Scrivi più corto: bastano una o due righe." }, { status: 400 });
  }

  let grezzo = null;
  try {
    grezzo = await run("capisci", { frase, stili: STILI_POSSIBILI });
  } catch {
    grezzo = null;
  }

  // Nessun modello ha risposto, o ha risposto il ripiego d'esempio, che di
  // capire non è capace. Si dice, invece di far finta: l'app proporrà quello
  // che proporrebbe comunque, e chi ha scritto sa perché.
  if (!grezzo || grezzo.capito === false || grezzo.source === "demo") {
    return NextResponse.json({
      ok: true,
      capito: false,
      // Diverso da «non ho capito la frase»: qui non ha risposto nessuno. La
      // pagina lo usa per togliere il campo invece di lasciarlo lì a dire di
      // no a ogni frase — vedi lib/chiediAParole.js.
      nessunLettore: true,
      perche: "In questo momento non riesco a leggere la richiesta scritta. Ti propongo i completi dei tuoi colori.",
      richiesta: normalizzaRichiesta(null),
    });
  }

  // La via d'uscita: se la frase di vestiti non parla, lo dice.
  if (grezzo.riguardaVestiti === false) {
    return NextResponse.json({
      ok: true,
      capito: false,
      fuoriTema: true,
      perche: "Questa non mi sembra una richiesta su cosa mettersi. Prova con qualcosa come «un outfit per un colloquio».",
      richiesta: normalizzaRichiesta(null),
    });
  }

  const richiesta = normalizzaRichiesta(grezzo);

  return NextResponse.json({
    ok: true,
    capito: true,
    // Quello che abbiamo capito si mostra a chi ha scritto, sempre. Se
    // abbiamo capito storto deve poterlo vedere subito, invece di chiedersi
    // perché gli stiamo proponendo un completo da sci per un matrimonio.
    richiesta,
    fornitore: grezzo.source || null,
  });
}
