import { NextResponse } from "next/server";
import { requireUser, readJson } from "@/lib/authServer";

export const runtime = "nodejs";

// I capi messi da parte. Sono separati dai negozi preferiti: quelli sono
// gusti, questi sono oggetti con un prezzo che cambia.

export async function GET(req) {
  const { user, db, error } = await requireUser(req);
  if (error) return error;

  const { data, error: err } = await db
    .from("profiles")
    .select("capi_preferiti")
    .eq("id", user.id)
    .maybeSingle();
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });

  return NextResponse.json({ ok: true, capi: data?.capi_preferiti || [] });
}

export async function POST(req) {
  const { user, db, error } = await requireUser(req);
  if (error) return error;

  const { body, error: badJson } = await readJson(req);
  if (badJson) return badJson;

  const capo = body?.capo;
  if (!capo?.id) return NextResponse.json({ error: "CAPO_SENZA_ID" }, { status: 400 });

  const { data, error: err } = await db
    .from("profiles")
    .select("capi_preferiti")
    .eq("id", user.id)
    .maybeSingle();
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });

  const attuali = Array.isArray(data?.capi_preferiti) ? data.capi_preferiti : [];
  const gia = attuali.some((c) => String(c.id) === String(capo.id));

  // Salviamo solo l'essenziale: il prezzo lo rileggiamo dal catalogo quando
  // serve, così nei preferiti non resta un prezzo di tre mesi fa.
  const ridotto = {
    id: capo.id,
    negozio: capo.negozio,
    titolo: capo.titolo,
    url: capo.url,
    immagine: capo.immagine || null,
    prezzo: capo.prezzo ?? null,
    colore_hex: capo.colore_hex || null,
    salvato: new Date().toISOString(),
  };

  const capi_preferiti = gia
    ? attuali.filter((c) => String(c.id) !== String(capo.id))
    : [ridotto, ...attuali].slice(0, 200);

  const { error: errSalva } = await db
    .from("profiles")
    .upsert({ id: user.id, email: user.email, capi_preferiti }, { onConflict: "id" });
  if (errSalva) return NextResponse.json({ error: errSalva.message }, { status: 500 });

  return NextResponse.json({ ok: true, salvato: !gia, capi: capi_preferiti });
}
