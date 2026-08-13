import { NextResponse } from "next/server";
import { getSupabaseAnon } from "@/lib/supabaseClient";
import { readJson } from "@/lib/authServer";
import { differenza, hexALab } from "@/lib/colore";
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

  // Dalla palette (nomi e hex) alle coordinate percettive.
  const voluti = palette
    .map((c) => ({ nome: c.name || c.nome || "", lab: hexALab(c.hex) }))
    .filter((c) => c.lab);
  if (!voluti.length) return NextResponse.json({ error: "PALETTE_SENZA_COLORI" }, { status: 400 });

  const { data, error } = await supabase.rpc("capi_per_palette", {
    palette: voluti.map((c) => ({ l: c.lab.L, a: c.lab.a, b: c.lab.b })),
    prezzo_min: min ? Number(min) : null,
    prezzo_max: max ? Number(max) : null,
    genere_voluto: genere || null,
    escludi_fast: Boolean(escludiFast),
    // Ne chiediamo molti di più di quanti ne mostreremo: il database ordina
    // per distanza, e senza margine tornerebbero solo capi di un colore solo.
    quanti: 400,
    // Le parole dello stile scelto: senza, si cerca in tutto il catalogo.
    parole: stile ? paroleDelloStile(stile) : null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Riordino fine, e a ogni capo attacchiamo QUALE colore della palette
  // ha centrato: è l'informazione che rende il consiglio comprensibile.
  const capi = (data || [])
    .map((capo) => {
      const suo = { L: capo.colore_l, a: capo.colore_a, b: capo.colore_b };
      let vicino = null;
      let distanza = Infinity;
      for (const v of voluti) {
        const d = differenza(suo, v.lab);
        if (d < distanza) {
          distanza = d;
          vicino = v.nome;
        }
      }
      return { ...capo, colore_palette: vicino, scarto: Number(distanza.toFixed(1)) };
    })
    .sort((a, b) => a.scarto - b.scarto);

  const quantiNeVoglio = Math.min(120, Math.max(12, Number(quanti) || 48));
  const scelti = distribuisci(senzaDoppioni(capi), voluti).slice(0, quantiNeVoglio);

  return NextResponse.json({ ok: true, capi: scelti, quanti: scelti.length });
}

// Alcuni negozi pubblicano lo stesso capo una volta per variante: senza
// questo l'utente vede sei volte lo stesso portafortuna bordeaux.
function senzaDoppioni(capi) {
  const visti = new Set();
  return capi.filter((c) => {
    const chiave = `${c.negozio}|${String(c.titolo).toLowerCase().trim()}`;
    if (visti.has(chiave)) return false;
    visti.add(chiave);
    return true;
  });
}

/**
 * Alterna i capi fra i colori della palette.
 *
 * Senza questo la classifica la vincono i capi che il negozio chiama già col
 * nome esatto del colore — scarto zero — e l'utente vede sei magliette verdi
 * invece dei suoi cinque colori. Qui si pesca a turno dal gruppo di ogni
 * colore, tenendo l'ordine di merito dentro ciascuno.
 */
function distribuisci(capi, voluti) {
  const gruppi = new Map(voluti.map((v) => [v.nome, []]));
  for (const capo of capi) {
    if (!gruppi.has(capo.colore_palette)) gruppi.set(capo.colore_palette, []);
    gruppi.get(capo.colore_palette).push(capo);
  }

  const code = [...gruppi.values()].filter((g) => g.length);
  const fuori = [];
  let i = 0;
  while (fuori.length < capi.length) {
    const coda = code[i % code.length];
    if (coda.length) fuori.push(coda.shift());
    else if (code.every((c) => !c.length)) break;
    i++;
  }
  return fuori;
}
