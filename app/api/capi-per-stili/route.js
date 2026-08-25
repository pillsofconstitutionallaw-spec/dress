import { NextResponse } from "next/server";
import { getSupabaseAnon } from "@/lib/supabaseClient";
import { readJson } from "@/lib/authServer";
import { paroleDelloStile } from "@/lib/stiliCapi";
import { arricchisci, coloriVoluti, distribuisci, senzaDoppioni } from "@/lib/capiPalette";
import { ruoloDelCapo } from "@/lib/periodiAnno";

export const runtime = "nodejs";

// Qualche capo per ognuno degli stili consigliati, in UNA interrogazione.
//
// La prima versione ne faceva una per stile, cinque in parallelo. Il database
// le ha rifiutate tutte e cinque: "canceling statement due to statement
// timeout", tre secondi a testa. La ricerca per palette scorre tutta la
// tabella — è una scelta scritta in ricerca_capi.sql, e su una query sola è
// la più veloce — ma cinque insieme non ci stanno.
//
// Nemmeno una sola, però, se le si passano le parole di tutti e cinque: le
// settanta parole in OR sulla scansione completa sfondavano il timeout da
// sole. Quindi al database si chiede solo il COLORE, che è la parte che sa
// fare in fretta, e la divisione per stile si fa qui sulle righe già
// arrivate — dove confrontare quattrocento titoli con settanta parole non
// costa niente. Il database lavora una volta, e lavora poco.
export async function POST(req) {
  const supabase = getSupabaseAnon();
  if (!supabase) return NextResponse.json({ error: "NO_SUPABASE" }, { status: 503 });

  const { body, error: badJson } = await readJson(req);
  if (badJson) return badJson;

  const { palette, stili = [], genere = null, escludiFast = false, perStile = 4 } = body || {};
  if (!Array.isArray(palette) || !palette.length) {
    return NextResponse.json({ error: "SERVE_LA_PALETTE" }, { status: 400 });
  }
  const nomi = (Array.isArray(stili) ? stili : []).filter(Boolean).slice(0, 6);
  if (!nomi.length) return NextResponse.json({ ok: true, perStile: {} });

  const voluti = coloriVoluti(palette);
  if (!voluti.length) return NextResponse.json({ error: "PALETTE_SENZA_COLORI" }, { status: 400 });

  const paroleDi = new Map(nomi.map((n) => [n, paroleDelloStile(n).map((k) => k.toLowerCase())]));

  const { data, error } = await supabase.rpc("capi_per_palette", {
    palette: voluti.map((c) => ({ l: c.lab.L, a: c.lab.a, b: c.lab.b })),
    prezzo_min: null,
    prezzo_max: null,
    genere_voluto: genere || null,
    escludi_fast: Boolean(escludiFast),
    // Largo: da qui in poi si scarta per stile, e uno stile di nicchia in un
    // bacino stretto resterebbe a mani vuote.
    quanti: 400,
    parole: null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Solo cose che si indossano. In catalogo ci sono anche vuotatasche,
  // candele e oggetti da casa: hanno un colore come tutto il resto, e senza
  // questo filtro finivano fra i capi di uno stile. Chi non ha un ruolo
  // riconoscibile — sopra, sotto, scarpe, accessorio — non è un capo.
  const capi = senzaDoppioni(
    arricchisci(data, voluti)
      .filter((c) => ruoloDelCapo(c.titolo, c.categoria))
      .sort((a, b) => a.scarto - b.scarto),
  );

  // Un capo va a un solo stile: lo stesso maglione mostrato sotto tutti e
  // cinque farebbe pensare che gli stili non contino niente. Vince chi lo
  // nomina per primo, cioè lo stile più adatto secondo l'ordine del consiglio.
  const presi = new Set();
  const quanti = Math.min(8, Math.max(1, Number(perStile) || 4));
  const fuori = {};

  for (const nome of nomi) {
    const chiavi = paroleDi.get(nome) || [];
    const suoi = capi.filter((c) => {
      if (presi.has(c.id)) return false;
      const t = `${c.titolo || ""} ${c.categoria || ""}`.toLowerCase();
      return chiavi.some((k) => t.includes(k));
    });
    const scelti = distribuisci(suoi, voluti).slice(0, quanti);
    for (const c of scelti) presi.add(c.id);
    fuori[nome] = scelti;
  }

  return NextResponse.json({ ok: true, perStile: fuori });
}
