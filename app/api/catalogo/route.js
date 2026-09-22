import { NextResponse } from "next/server";
import { getSupabaseAnon } from "@/lib/supabaseClient";
import { comeLoHaiChiamato, perChiCerca } from "@/lib/capiPalette";
import { gruppiPerRicerca } from "@/lib/sinonimi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cercare un capo per nome, senza palette.
//
// Serve a riempire l'armadio. È una domanda diversa da quella di /api/capi:
// là si chiede «cosa mi sta bene», qui «trova questa cosa che ho già». Chi
// sta caricando il proprio guardaroba non vuole i consigli, vuole il suo
// maglione.
//
// È il modo migliore di aggiungere un capo, e non è ovvio: una foto fatta in
// camera da letto dà un titolo indovinato da un modello e un colore misurato
// su un lenzuolo. Una riga di catalogo dà marca, nome esatto, foto pulita del
// negozio e colore già misurato — gli stessi dati con cui l'app ragiona per
// tutto il resto. Fotografare resta, per i capi che in catalogo non ci sono.

const QUANTI = 24;
const QUANTI_DAL_DATABASE = 120;

export async function GET(req) {
  const q = String(new URL(req.url).searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ ok: true, capi: [] });

  const supabase = getSupabaseAnon();
  if (!supabase) return NextResponse.json({ error: "NO_SUPABASE" }, { status: 503 });

  const genere = new URL(req.url).searchParams.get("genere") || null;

  // Un gruppo per parola scritta, con dentro la sua famiglia: chi scrive
  // «maglione» deve trovare anche i pullover, che in catalogo sono scritti
  // così.
  const gruppi = gruppiPerRicerca(q);
  if (!gruppi.length) return NextResponse.json({ ok: true, capi: [] });

  // Dentro un gruppo si sceglie (OR), fra i gruppi si somma (AND). Chi scrive
  // «camicia bianca» vuole le camicie bianche: non tutte le camicie, non
  // tutto ciò che è bianco, e nemmeno — come faceva la prima versione — le
  // cose che sono contemporaneamente camicia e shirt e blusa.
  let domanda = supabase
    .from("prodotti")
    .select("id, negozio, marca, titolo, url, immagine, prezzo, colore_hex, colore_nome, colore_l, colore_a, colore_b, categoria, genere")
    .eq("disponibile", true);
  for (const gruppo of gruppi) {
    domanda = domanda.or(gruppo.map((p) => `cerca.ilike.*${p}*`).join(","));
  }

  const { data, error } = await domanda.limit(QUANTI_DAL_DATABASE);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Il riordino è quello del resto dell'app: prima chi si chiama davvero
  // così — una camicia non è una t-shirt anche se tutte e due sono «sopra» —
  // e poi via i capi da bambino e del genere sbagliato.
  const capi = perChiCerca(comeLoHaiChiamato(data || [], q), genere).slice(0, QUANTI);

  return NextResponse.json({ ok: true, capi, quanti: capi.length });
}
