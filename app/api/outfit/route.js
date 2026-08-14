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

  const comuni = {
    palette: voluti.map((c) => ({ l: c.lab.L, a: c.lab.a, b: c.lab.b })),
    prezzo_min: null,
    prezzo_max: max ? Number(max) : null,
    genere_voluto: genere || null,
    escludi_fast: Boolean(escludiFast),
  };

  // Due pescaggi, non uno.
  //
  // Le parole dello stile descrivono i VESTITI — "tweed", "maglione a trecce" —
  // e nei titoli delle scarpe non compaiono mai. Filtrando tutto il catalogo
  // con quelle, un completo Romantico restava senza scarpe. Quindi lo stile
  // vincola i capi d'abbigliamento, mentre scarpe e accessori si scelgono per
  // colore su tutto il catalogo.
  const [conStile, tutto] = await Promise.all([
    stile
      ? supabase.rpc("capi_per_palette", { ...comuni, quanti: 700, parole: paroleDelloStile(stile) })
      : Promise.resolve({ data: null }),
    supabase.rpc("capi_per_palette", { ...comuni, quanti: 700, parole: null }),
  ]);

  if (tutto.error) return NextResponse.json({ error: tutto.error.message }, { status: 500 });

  const arricchisci = (righe) => (righe || []).map((capo) => {
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

  const vestiti = arricchisci(conStile.data || tutto.data);
  const qualsiasi = arricchisci(tutto.data);

  // Lo stile comanda su quello che si indossa; scarpe e accessori seguono il
  // colore, perché è lì che si abbinano davvero.
  const RUOLI_DELLO_STILE = new Set(["capospalla", "top", "bottom", "intero"]);

  // Un capo scelto per un periodo non torna negli altri: quattro completi con
  // lo stesso cappello sono un completo solo mostrato quattro volte.
  const giaUsati = new Set();

  const completi = PERIODI.map((periodo) => {
    const adatti = (righe) => righe.filter((c) => c.ruolo && adattoAlPeriodo(c.titolo, periodo));
    const daStile = adatti(vestiti);
    const daTutto = adatti(qualsiasi);

    const scelti = [];
    const negoziUsati = new Set();
    const coloriUsati = new Set();

    // Un abito fa da solo sopra e sotto: se c'è, gli altri due ruoli saltano.
    const conAbito = daStile.find((c) => c.ruolo === "intero" && !giaUsati.has(c.id) && c.scarto < 12);
    const ruoliDaRiempire = conAbito
      ? periodo.ruoli.filter((r) => r !== "top" && r !== "bottom").flatMap((r) => (r === "capospalla" ? [r, "intero"] : [r]))
      : periodo.ruoli;

    for (const ruolo of ruoliDaRiempire) {
      const bacino = RUOLI_DELLO_STILE.has(ruolo) ? daStile : daTutto;
      const candidati = bacino
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

      let scelto = candidati[0];

      // Se lo stile non ha niente per un ruolo che serve — d'estate un
      // Romantico può non avere magliette in catalogo — si pesca dal colore
      // invece di lasciare il buco. Un capo giusto di colore vale più di uno
      // slot vuoto, e l'utente vede un completo invece di una lista monca.
      if (!scelto && periodo.obbligatori.includes(ruolo)) {
        scelto = daTutto
          .filter((c) => c.ruolo === ruolo && !scelti.some((x) => x.id === c.id) && !giaUsati.has(c.id))
          .sort((a, b) => a.scarto - b.scarto)[0];

        // E se anche così non c'è, si accetta di ripetere un capo già usato in
        // un altro periodo. La regola "mai due volte lo stesso" serve a non
        // mostrare quattro completi identici, non a lasciare l'estate senza
        // pantaloni: quando le due cose confliggono, vince il completo.
        if (!scelto) {
          scelto = daTutto
            .filter((c) => c.ruolo === ruolo && !scelti.some((x) => x.id === c.id))
            .sort((a, b) => a.scarto - b.scarto)[0];
        }
      }
      if (scelto) {
        scelti.push({ ...scelto, ruolo, ruoloEtichetta: RUOLI[ruolo].etichetta });
        negoziUsati.add(scelto.negozio);
        coloriUsati.add(scelto.colore_palette);
        giaUsati.add(scelto.id);
      }
    }

    // Con un abito, "maglia" e "pantaloni" non mancano: sono coperti.
    const haAbito = scelti.some((s) => s.ruolo === "intero");
    const mancanti = periodo.obbligatori.filter(
      (r) => !scelti.some((s) => s.ruolo === r) && !(haAbito && (r === "top" || r === "bottom")),
    );

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
