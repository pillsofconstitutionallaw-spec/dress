import { NextResponse } from 'next/server';
import { requireUser, readJson } from '@/lib/authServer';
import { itemKey, loadRow } from '@/lib/profileStore';

export const runtime = 'nodejs';

export async function POST(req) {
  const { user, db, error: authError } = await requireUser(req);
  if (authError) return authError;

  const { body, error: badJson } = await readJson(req);
  if (badJson) return badJson;

  const outfitId = body?.outfitId;
  if (!outfitId) return NextResponse.json({ error: 'MISSING_OUTFIT_ID' }, { status: 400 });

  const { row, error: loadError } = await loadRow(db, user, 'saved_outfits');
  if (loadError) return loadError;

  const current = Array.isArray(row?.saved_outfits) ? row.saved_outfits : [];
  const saved_outfits = current.filter((o) => itemKey(o) !== String(outfitId));

  const { error } = await db.from('profiles').upsert({ id: user.id, email: user.email, saved_outfits }, { onConflict: 'id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, saved_outfits });
}
