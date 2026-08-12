import { NextResponse } from 'next/server';
import { requireUser, readJson } from '@/lib/authServer';
import { itemKey, loadRow } from '@/lib/profileStore';

export const runtime = 'nodejs';

// Aggiunge o toglie un preferito. Il "nome" del preferito può essere una
// stringa (es. "Zara") o un oggetto con id: li trattiamo allo stesso modo.
export async function POST(req) {
  const { user, db, error: authError } = await requireUser(req);
  if (authError) return authError;

  const { body, error: badJson } = await readJson(req);
  if (badJson) return badJson;

  const item = body?.item;
  if (!item) return NextResponse.json({ error: 'MISSING_ITEM' }, { status: 400 });

  const { row, error: loadError } = await loadRow(db, user, 'favorites');
  if (loadError) return loadError;

  const current = Array.isArray(row?.favorites) ? row.favorites : [];
  const key = itemKey(item);
  const exists = current.some((i) => itemKey(i) === key);
  const favorites = exists ? current.filter((i) => itemKey(i) !== key) : [...current, item];

  const { error } = await db.from('profiles').upsert({ id: user.id, email: user.email, favorites }, { onConflict: 'id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, favorites });
}
