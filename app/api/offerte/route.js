import { NextResponse } from "next/server";
import { getSupabaseAnon } from "@/lib/supabaseClient";
import { paroleDaIndossare, paroleDelloStile } from "@/lib/stiliCapi";

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
  const parametri = new URL(req.url).searchParams;
  const genere = parametri.get("genere");
  const stile = parametri.get("stile");

  // Con uno stile scelto si pesca più largo e si screma qui: il filtro per
  // parole nel database vorrebbe un parametro nuovo in capi_in_saldo, e una
  // migrazione per una scrematura che su trecento righe costa niente.
  const { data, error } = await supabase.rpc("capi_in_saldo", {
    genere_voluto: genere === "donna" || genere === "uomo" ? genere : null,
    sconto_minimo: 10,
    per_negozio: 3,
    quanti: stile ? 300 : 48,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const tutti = data || [];
  if (!stile) return NextResponse.json({ ok: true, capi: tutti, quanti: tutti.length, stile: null });

  // I vestiti dello stile, più le sue scarpe e i suoi accessori — quelli
  // precisi, non i generici: fra i generici c'è "borsa", e con "borsa" passa
  // mezzo catalogo, che è come non filtrare.
  const indossare = paroleDaIndossare(stile);
  const chiavi = [
    ...paroleDelloStile(stile),
    ...indossare.scarpe.prime,
    ...indossare.accessori.prime,
  ].map((k) => k.toLowerCase());

  const delloStile = tutti.filter((c) => {
    const t = `${c.titolo || ""} ${c.categoria || ""}`.toLowerCase();
    return chiavi.some((k) => t.includes(k));
  });

  // Uno stile di nicchia può non avere saldi questa settimana. Mostrare una
  // pagina vuota sarebbe fedele ma inutile: si mostrano tutti gli sconti e si
  // dice che il filtro non ha retto, così la scelta resta a chi legge.
  const bastano = delloStile.length >= 8;
  return NextResponse.json({
    ok: true,
    capi: (bastano ? delloStile : tutti).slice(0, 48),
    quanti: (bastano ? delloStile : tutti).slice(0, 48).length,
    stile: bastano ? stile : null,
    // Quanti ne aveva lo stile, anche quando sono troppo pochi per bastare.
    quantiDelloStile: delloStile.length,
  });
}
