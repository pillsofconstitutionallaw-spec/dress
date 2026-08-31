import { NextResponse } from "next/server";
import { getSupabaseAnon } from "@/lib/supabaseClient";
import { readJson } from "@/lib/authServer";
import { arricchisci, coloriVoluti, comeLoHaiChiamato, distribuisci, perChiCerca, senzaDoppioni } from "@/lib/capiPalette";
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

  const { palette, min, max, genere, stile = null, capo = null, colore = null, escludiFast = false, quanti = 48 } = body || {};
  if (!Array.isArray(palette) || !palette.length) {
    return NextResponse.json({ error: "SERVE_LA_PALETTE" }, { status: 400 });
  }

  const tutti = coloriVoluti(palette);
  if (!tutti.length) return NextResponse.json({ error: "PALETTE_SENZA_COLORI" }, { status: 400 });

  // Un colore scelto è una richiesta, non un suggerimento: chi apre la
  // tendina e dice "blu navy" vuole i capi blu navy, non la palette intera
  // con i blu navy in mezzo. Se il nome non si riconosce si cerca in tutta
  // la palette, perché rispondere niente sarebbe peggio.
  const soloQuesto = colore ? tutti.filter((c) => c.nome === colore) : [];
  const voluti = soloQuesto.length ? soloQuesto : tutti;

  // Le parole della casella "che capo cerchi". Sono quelle che restringono di
  // più, quindi è a loro che conviene far fare la scrematura nel database:
  // lo stile, se c'è anche quello, riordina dopo.
  const paroleCapo = String(capo || "").trim()
    ? String(capo).toLowerCase().split(/[^a-zà-ù0-9]+/i).filter((x) => x.length > 2)
    : null;

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
    parole: paroleCapo?.length ? paroleCapo : stile ? paroleDelloStile(stile) : null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const capi = arricchisci(data, voluti).sort((a, b) => a.scarto - b.scarto);

  // Chi ha scritto che capo cerca lo ha scritto per essere ascoltato: il
  // database screma all'ingrosso, qui si tiene solo quello che c'entra.
  const richiesti = comeLoHaiChiamato(capi, capo);

  const quantiNeVoglio = Math.min(120, Math.max(12, Number(quanti) || 48));
  // La distribuzione serve a non dare dodici capi tutti dello stesso colore
  // quando non è stato chiesto niente. Ma quando qualcosa è stato chiesto,
  // rimescola: girando fra un colore e l'altro rimetteva in alto capi meno
  // pertinenti, e una maglia di COLORE jeans risaliva all'ottavo posto fra i
  // "jeans baggy". Chi ha scritto cosa cerca vuole prima quello, e i colori
  // se li guarda nell'ordine che viene.
  const ordinati = soloQuesto.length || paroleCapo?.length
    ? senzaDoppioni(richiesti)
    : distribuisci(senzaDoppioni(richiesti), voluti);

  // Per ultimo chi sta guardando: via i capi da bambino e quelli del genere
  // sbagliato, e i capi senza genere scritto in fondo invece che in mezzo.
  const scelti = perChiCerca(ordinati, genere).slice(0, quantiNeVoglio);

  return NextResponse.json({ ok: true, capi: scelti, quanti: scelti.length });
}
