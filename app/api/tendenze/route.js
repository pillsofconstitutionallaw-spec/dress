import { NextResponse } from "next/server";
import { getSupabaseAnon, getSupabaseService } from "@/lib/supabaseClient";
import { conQuote } from "@/lib/tendenze";

export const runtime = "nodejs";

// Mai durante la costruzione del sito: legare la riuscita del rilascio alla
// velocità del database quel giorno è un modo per non rilasciare più.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Il catalogo si aggiorna una volta a notte, quindi sei ore di cache non
// fanno vedere niente di vecchio a nessuno. E dopo le sei ore la rete
// continua a servire il valore di prima mentre ne calcola uno nuovo di
// nascosto.
const CACHE = "public, s-maxage=21600, stale-while-revalidate=86400";

// Cosa si porta adesso, contato sul catalogo.
//
// Non lo chiediamo a un modello linguistico: la sua conoscenza si ferma alla
// data di addestramento, e alle domande sulle tendenze risponde comunque, con
// sicurezza, sbagliando. I negozi invece comprano quello che vende: contare i
// tagli nei loro cataloghi è la cosa più vicina alla verità che possiamo avere.
//
// Contarli però prende sei secondi, e il database ne concede otto a chi ha la
// chiave di servizio. Per mesi ha retto, ma era un lancio di moneta che ogni
// notte pesava un po' di più dalla parte sbagliata, perché il catalogo cresce:
// a centouno mila capi erano tre secondi, a centoquattordici sono sei.
//
// Quindi il conteggio si fa una volta a notte, dopo l'importazione, e finisce
// in una tabella di quattordici righe (sql/tendenze.sql). Qui si legge quella.
export async function GET() {
  // Leggere quattordici righe non ha bisogno della chiave di servizio: la
  // tabella è pubblica in lettura come il catalogo da cui viene.
  const supabase = getSupabaseAnon() || getSupabaseService();
  if (!supabase) return NextResponse.json({ ok: true, tagli: [] });

  const pronte = await supabase.from("tendenze").select("taglio, quanti, calcolato");

  // Se la tabella c'è ed è piena, è finita qui: una lettura da indice.
  if (!pronte.error && pronte.data?.length) {
    return NextResponse.json(
      {
        ok: true,
        tagli: conQuote(pronte.data),
        // La data del conteggio, non quella di adesso: se il lavoro notturno
        // si è fermato tre giorni fa, questo è il posto dove si vede.
        aggiornato: pronte.data[0]?.calcolato || null,
      },
      { headers: { "Cache-Control": CACHE } },
    );
  }

  // Non c'è ancora — sql/tendenze.sql non è stato applicato, o il lavoro
  // notturno non ha ancora girato una volta. Si conta adesso, come prima:
  // lento, ma meglio che una pagina senza tagli. Qui serve la chiave di
  // servizio, perché con i tre secondi di anon questa domanda non arriva
  // in fondo.
  const lento = getSupabaseService() || supabase;
  const { data, error } = await lento.rpc("tendenze_tagli");
  if (error) {
    // Un errore non va in cache: la prossima richiesta deve poter riprovare.
    return NextResponse.json({ error: error.message }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(
    { ok: true, tagli: conQuote(data), aggiornato: new Date().toISOString() },
    { headers: { "Cache-Control": CACHE } },
  );
}
