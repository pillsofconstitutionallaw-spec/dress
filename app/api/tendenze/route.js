import { NextResponse } from "next/server";
import { getSupabaseAnon, getSupabaseService } from "@/lib/supabaseClient";

export const runtime = "nodejs";

// Mai durante la costruzione del sito: questa domanda ci mette secondi, e
// farla girare mentre Vercel prepara la pagina vuol dire legare la riuscita
// del rilascio alla velocità del database quel giorno. Si fa alla prima
// richiesta, e poi la tiene la rete di Vercel — vedi CACHE qui sotto.
export const dynamic = "force-dynamic";
// Il tempo che Vercel concede prima di chiudere la funzione. Il conteggio
// adesso ne prende sei; il limite predefinito è dieci, ed è troppo vicino.
export const maxDuration = 30;

// Il catalogo si aggiorna una volta a notte, quindi sei ore di cache non
// fanno vedere niente di vecchio a nessuno. E dopo le sei ore la rete
// continua a servire il valore di prima mentre ne calcola uno nuovo di
// nascosto: chi apre la pagina non aspetta mai i sei secondi del conteggio,
// tranne il primissimo dopo un rilascio.
const CACHE = "public, s-maxage=21600, stale-while-revalidate=86400";

// Cosa si porta adesso, contato sul catalogo.
//
// Non lo chiediamo a un modello linguistico: la sua conoscenza si ferma alla
// data di addestramento, e alle domande sulle tendenze risponde comunque, con
// sicurezza, sbagliando. I negozi invece comprano quello che vende: contare i
// tagli nei loro cataloghi è la cosa più vicina alla verità che possiamo avere.
export async function GET() {
  // Con la chiave di servizio, e non con quella pubblica. La pubblica ha un
  // limite di tre secondi per domanda, e col catalogo cresciuto da 101 a
  // 114 mila capi questo conteggio ne prende sei: misurato, 500 a 3,1 secondi
  // con l'una e 200 a 5,9 con l'altra.
  //
  // Qui la chiave di servizio non apre niente che non si debba: la domanda
  // legge solo il catalogo, che è pubblico, e restituisce dei conteggi —
  // nessun dato di nessuna persona. E gira sul server: al browser arrivano i
  // numeri, mai la chiave.
  //
  // Prima c'era già una cache di un'ora, ma non serviva: un errore non si
  // mette in cache, quindi ogni visita rifaceva la domanda lenta e ogni volta
  // il limite la tagliava.
  const supabase = getSupabaseService() || getSupabaseAnon();
  if (!supabase) return NextResponse.json({ ok: true, tagli: [] });

  const { data, error } = await supabase.rpc("tendenze_tagli");
  if (error) {
    // Un errore non va in cache: la prossima richiesta deve poter riprovare.
    return NextResponse.json({ error: error.message }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }

  const tagli = (data || []).map((t) => ({ ...t, quanti: Number(t.quanti) }));
  const totale = tagli.reduce((s, t) => s + t.quanti, 0);

  return NextResponse.json(
    {
      ok: true,
      tagli: tagli.map((t) => ({ ...t, quota: totale ? Math.round((t.quanti / totale) * 100) : 0 })),
      aggiornato: new Date().toISOString(),
    },
    { headers: { "Cache-Control": CACHE } },
  );
}
