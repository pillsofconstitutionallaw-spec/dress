import { NextResponse } from "next/server";
import { getSupabaseAnon } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Gli sconti veri: i capi il cui prezzo di adesso è più basso di quello pieno.
// Niente offerte scritte a mano — o è nel catalogo o non esiste.
//
// La scelta la fa il database (capi_in_saldo), non questo file. Prima qui
// arrivavano i 600 capi col listino più alto e la cernita si faceva a valle:
// due secondi di attesa per vedere solo i saldi dei cappotti costosi, mentre
// venticinquemila capi ribassati restavano fuori. Adesso sono 80 millisecondi
// e li guarda tutti.
export async function GET(req) {
  const supabase = getSupabaseAnon();
  if (!supabase) return NextResponse.json({ ok: true, capi: [] });

  // Chi ha detto di essere uomo non vuole vedere le décolleté in saldo.
  const genere = new URL(req.url).searchParams.get("genere");

  const { data, error } = await supabase.rpc("capi_in_saldo", {
    genere_voluto: genere === "donna" || genere === "uomo" ? genere : null,
    sconto_minimo: 10,
    per_negozio: 3,
    quanti: 48,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, capi: data || [], quanti: (data || []).length });
}
