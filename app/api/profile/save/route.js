import { NextResponse } from 'next/server';
import { requireUser, readJson } from '@/lib/authServer';

export const runtime = 'nodejs';

export async function POST(req) {
  const { user, db, error: authError } = await requireUser(req);
  if (authError) return authError;

  const { body, error: badJson } = await readJson(req);
  if (badJson) return badJson;

  // Si salva solo ciò che ha senso ricevere dal browser: l'identità (id, email)
  // la mette il server, non il client.
  const row = { id: user.id, email: user.email };
  if (body?.name !== undefined) row.name = body.name || null;
  if (body?.palette !== undefined) row.palette = body.palette || null;
  if (Array.isArray(body?.favorites)) row.favorites = body.favorites;
  // Palette e stili consigliati restano: sono il risultato dell'analisi, e
  // rifarla ogni volta significherebbe richiedere le foto ogni volta.
  if (body?.dati !== undefined) row.dati = body.dati || {};

  const { data, error } = await db.from('profiles').upsert(row, { onConflict: 'id' }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, profile: data });
}
