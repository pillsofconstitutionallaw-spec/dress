import { NextResponse } from "next/server";
import { getSupabaseAnon } from "@/lib/supabaseClient";
import { readJson } from "@/lib/authServer";
import { arricchisci, coloriVoluti, distribuisci, senzaDoppioni } from "@/lib/capiPalette";
import { paroleDelloStile } from "@/lib/stiliCapi";

export const runtime = "nodejs";

// Trova nel catalogo i capi dei colori della palette.
//
// Il database screma con la distanza semplice, che è veloce su ventimila
// righe; qui riordiniamo i pochi rimasti con CIEDE2000, che corrisponde a
// come l'occhio giudica davvero due colori vicini.
export async function POST(req) {
  const supabase = getSupabaseAnon();
  if (!supabase) return NextResponse.json({ error: "NO_SUPABASE" }, { status: 503 });

  const { body, error: badJson } = await readJson(req);
  if (badJson) return badJson;

  const { palette, min, max, genere, stile = null, escludiFast = false, quanti = 48 } = body || {};
  if (!Array.isArray(palette) || !palette.length) {
    return NextResponse.json({ error: "SERVE_LA_PALETTE" }, { status: 400 });
  }

  const voluti = coloriVoluti(palette);
  if (!voluti.length) return NextResponse.json({ error: "PALETTE_SENZA_COLORI" }, { status: 400 });

  const { data, error } = await supabase.rpc("capi_per_palette", {
    palette: voluti.map((c) => ({ l: c.lab.L, a: c.lab.a, b: c.lab.b })),
    prezzo_min: min ? Number(min) : null,
    prezzo_max: max ? Number(max) : null,
    genere_voluto: genere || null,
    escludi_fast: Boolean(escludiFast),
    // Ne chiediamo molti di più di quanti ne mostreremo: il database ordina
    // per distanza, e senza margine tornerebbero solo capi di un colore solo.
    // Ma il margine si commisura alla richiesta: la pagina degli stili ne
    // mostra quattro per stile e ne chiede cinque volte di fila, e pescarne
    // quattrocento ogni volta la renderebbe lentissima per niente.
    quanti: Math.min(400, Math.max(80, (Number(body?.quanti) || 48) * 8)),
    // Le parole dello stile scelto: senza, si cerca in tutto il catalogo.
    parole: stile ? paroleDelloStile(stile) : null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const capi = arricchisci(data, voluti).sort((a, b) => a.scarto - b.scarto);

  const quantiNeVoglio = Math.min(120, Math.max(12, Number(quanti) || 48));
  const scelti = distribuisci(senzaDoppioni(capi), voluti).slice(0, quantiNeVoglio);

  return NextResponse.json({ ok: true, capi: scelti, quanti: scelti.length });
}
