import { NextResponse } from "next/server";
import { getSupabaseAnon } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const revalidate = 3600; // il catalogo si aggiorna una volta a notte

// Cosa si porta adesso, contato sul catalogo.
//
// Non lo chiediamo a un modello linguistico: la sua conoscenza si ferma alla
// data di addestramento, e alle domande sulle tendenze risponde comunque, con
// sicurezza, sbagliando. I negozi invece comprano quello che vende: contare i
// tagli nei loro cataloghi è la cosa più vicina alla verità che possiamo avere.
export async function GET() {
  const supabase = getSupabaseAnon();
  if (!supabase) return NextResponse.json({ ok: true, tagli: [] });

  const { data, error } = await supabase.rpc("tendenze_tagli");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const tagli = (data || []).map((t) => ({ ...t, quanti: Number(t.quanti) }));
  const totale = tagli.reduce((s, t) => s + t.quanti, 0);

  return NextResponse.json({
    ok: true,
    tagli: tagli.map((t) => ({ ...t, quota: totale ? Math.round((t.quanti / totale) * 100) : 0 })),
    aggiornato: new Date().toISOString(),
  });
}
