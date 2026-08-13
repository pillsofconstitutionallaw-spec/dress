import { NextResponse } from "next/server";
import { getSupabaseAnon } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const revalidate = 900; // gli sconti non cambiano ogni minuto

// Gli sconti veri: i capi il cui prezzo di adesso è più basso di quello pieno.
// Niente offerte scritte a mano — o è nel catalogo o non esiste.
export async function GET(req) {
  const supabase = getSupabaseAnon();
  if (!supabase) return NextResponse.json({ ok: true, capi: [] });

  // Chi ha detto di essere uomo non vuole vedere le décolleté in saldo.
  const genere = new URL(req.url).searchParams.get("genere");

  let query = supabase
    .from("prodotti")
    .select("id,negozio,titolo,url,immagine,prezzo,prezzo_pieno,colore_hex,colore_nome,qualita,fast_fashion,tessuto")
    .eq("disponibile", true)
    .not("prezzo_pieno", "is", null)
    .gt("prezzo_pieno", 0)
    .order("prezzo_pieno", { ascending: false })
    .limit(600);

  if (genere === "donna" || genere === "uomo") {
    // "unisex" e i capi senza genere restano: escluderli toglierebbe metà
    // catalogo per un dato che spesso i negozi non scrivono.
    query = query.or(`genere.eq.${genere},genere.eq.unisex,genere.is.null`);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const capi = (data || [])
    .filter((c) => c.prezzo_pieno > c.prezzo)
    .map((c) => ({ ...c, sconto: Math.round((1 - c.prezzo / c.prezzo_pieno) * 100) }))
    .filter((c) => c.sconto >= 10)
    .sort((a, b) => b.sconto - a.sconto);

  // Non più di tre capi per negozio: altrimenti la pagina diventa la vetrina
  // di chi ha fatto i saldi più aggressivi.
  const per = new Map();
  const scelti = [];
  for (const c of capi) {
    const n = per.get(c.negozio) || 0;
    if (n >= 3) continue;
    per.set(c.negozio, n + 1);
    scelti.push(c);
    if (scelti.length >= 40) break;
  }

  return NextResponse.json({ ok: true, capi: scelti, quanti: scelti.length });
}
