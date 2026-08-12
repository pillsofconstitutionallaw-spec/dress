import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/authServer';

export const runtime = 'nodejs';

// Restituisce il profilo di chi è collegato. Non serve (né si accetta) un'email
// nella richiesta: l'utente è quello scritto nel token di sessione.
export async function GET(req) {
  const { user, db, error: authError } = await requireUser(req);
  if (authError) return authError;

  const { data, error } = await db.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    profile: data || { id: user.id, email: user.email, name: null, palette: null, favorites: [], saved_outfits: [] },
  });
}
