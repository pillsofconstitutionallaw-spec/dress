import { NextResponse } from "next/server";
import { getSupabaseAnon } from "@/lib/supabaseClient";
import { readJson } from "@/lib/authServer";
import { differenza, hexALab } from "@/lib/colore";
import { paroleDelloStile } from "@/lib/stiliCapi";
import { PERIODI, RUOLI, adattoAlPeriodo, ruoloDelCapo } from "@/lib/periodiAnno";

export const runtime = "nodejs";

// Compone un completo per ogni periodo dell'anno.
//
// Non è una lista di capi: è un ruolo per volta. Sopra, maglia, pantaloni,
// scarpe, e un accessorio se c'è. Un completo senza scarpe non è un completo,
// per quanti maglioni si mostrino.
export async function POST(req) {
  const supabase = getSupabaseAnon();
  if (!supabase) return NextResponse.json({ error: "NO_SUPABASE" }, { status: 503 });

  const { body, error: badJson } = await readJson(req);
  if (badJson) return badJson;

  const { palette, stile = null, genere = null, max = null, escludiFast = false } = body || {};
  if (!Array.isArray(palette) || !palette.length) {
    return NextResponse.json({ error: "SERVE_LA_PALETTE" }, { status: 400 });
  }

  const voluti = palette
    .map((c) => ({ nome: c.name || c.nome || "", lab: hexALab(c.hex) }))
    .filter((c) => c.lab);
  if (!voluti.length) return NextResponse.json({ error: "PALETTE_SENZA_COLORI" }, { status: 400 });

  // Un pescaggio solo, largo: comporre quattro completi da quattro richieste
  // separate darebbe quattro volte gli stessi capi.
  const { data, error } = await supabase.rpc("capi_per_palette", {
    palette: voluti.map((c) => ({ l: c.lab.L, a: c.lab.a, b: c.lab.b })),
    prezzo_min: null,
    prezzo_max: max ? Number(max) : null,
    genere_voluto: genere || null,
    escludi_fast: Boolean(escludiFast),
    quanti: 900,
    parole: stile ? paroleDelloStile(stile) : null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const capi = (data || []).map((capo) => {
    const suo = { L: capo.colore_l, a: capo.colore_a, b: capo.colore_b };
    let vicino = null;
    let scarto = Infinity;
    for (const v of voluti) {
      const d = differenza(suo, v.lab);
      if (d < scarto) {
        scarto = d;
        vicino = v.nome;
      }
    }
    return { ...capo, colore_palette: vicino, scarto: Number(scarto.toFixed(1)), ruolo: ruoloDelCapo(capo.titolo, capo.categoria) };
  });

  // Un capo scelto per un periodo non torna negli altri: quattro completi con
  // lo stesso cappello sono un completo solo mostrato quattro volte.
  const giaUsati = new Set();

  const completi = PERIODI.map((periodo) => {
    const disponibili = capi.filter((c) => c.ruolo && adattoAlPeriodo(c.titolo, periodo));

    const scelti = [];
    const negoziUsati = new Set();
    const coloriUsati = new Set();

    for (const ruolo of periodo.ruoli) {
      const candidati = disponibili
        .filter((c) => c.ruolo === ruolo && !scelti.some((s) => s.id === c.id) && !giaUsati.has(c.id))
        .map((c) => {
          const t = c.titolo.toLowerCase();
          let punti = 40 - c.scarto;
          // Chi usa le parole giuste per il periodo va davanti.
          if (periodo.preferisci.some((p) => t.includes(p))) punti += 14;
          // Un completo di cinque capi dello stesso negozio è una vetrina,
          // non un consiglio: si preferisce variare.
          if (negoziUsati.has(c.negozio)) punti -= 9;
          // E cinque capi dello stesso colore non sono un outfit.
          if (coloriUsati.has(c.colore_palette)) punti -= 7;
          if (c.qualita) punti += c.qualita / 25;
          return { ...c, punti };
        })
        .sort((a, b) => b.punti - a.punti);

      const scelto = candidati[0];
      if (scelto) {
        scelti.push({ ...scelto, ruolo, ruoloEtichetta: RUOLI[ruolo].etichetta });
        negoziUsati.add(scelto.negozio);
        coloriUsati.add(scelto.colore_palette);
        giaUsati.add(scelto.id);
      }
    }

    const mancanti = periodo.obbligatori.filter((r) => !scelti.some((s) => s.ruolo === r));

    return {
      periodo: periodo.id,
      nome: periodo.nome,
      mesi: periodo.mesi,
      capi: scelti,
      completo: mancanti.length === 0,
      // Se manca un pezzo lo diciamo, invece di mostrare tre capi e chiamarlo completo.
      mancano: mancanti.map((r) => RUOLI[r].etichetta),
      totale: scelti.reduce((s, c) => s + Number(c.prezzo || 0), 0),
    };
  });

  return NextResponse.json({ ok: true, stile, completi });
}
