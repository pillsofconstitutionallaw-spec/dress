import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireUser, readJson } from '@/lib/authServer';
import { itemKey, loadRow } from '@/lib/profileStore';

export const runtime = 'nodejs';

export async function POST(req) {
  const { user, db, error: authError } = await requireUser(req);
  if (authError) return authError;

  const { body, error: badJson } = await readJson(req);
  if (badJson) return badJson;

  const outfit = body?.outfit;
  if (!outfit || typeof outfit !== 'object') return NextResponse.json({ error: 'MISSING_OUTFIT' }, { status: 400 });

  const { row, error: loadError } = await loadRow(db, user, 'saved_outfits');
  if (loadError) return loadError;

  const current = Array.isArray(row?.saved_outfits) ? row.saved_outfits : [];
  // Ogni outfit salvato riceve un id stabile, così si può poi rimuovere.
  const entry = { ...outfit, id: outfit.id || randomUUID(), saved_at: new Date().toISOString() };
  const withoutDuplicate = current.filter((o) => itemKey(o) !== itemKey(entry));
  const saved_outfits = [entry, ...withoutDuplicate].slice(0, 100);

  const { error } = await db.from('profiles').upsert({ id: user.id, email: user.email, saved_outfits }, { onConflict: 'id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, saved_outfits });
}
