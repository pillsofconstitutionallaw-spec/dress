import { NextResponse } from 'next/server';
import { getSupabaseAnon, getSupabaseForToken, hasSupabase } from '@/lib/supabaseClient';

// Legge il token di sessione dall'header "Authorization: Bearer <token>".
function bearerToken(req) {
  const header = req.headers.get('authorization') || '';
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}

/**
 * Identifica chi sta chiamando l'API verificando il token con Supabase.
 *
 * Regola: l'identità viene SEMPRE dal token firmato, mai da un'email mandata
 * dal browser (che chiunque potrebbe cambiare per leggere i dati altrui).
 *
 * Ritorna { user, db } oppure { error } già pronto da restituire.
 */
export async function requireUser(req) {
  if (!hasSupabase()) {
    return { error: NextResponse.json({ error: 'NO_SUPABASE' }, { status: 503 }) };
  }

  const token = bearerToken(req);
  if (!token) {
    return { error: NextResponse.json({ error: 'NOT_SIGNED_IN' }, { status: 401 }) };
  }

  const { data, error } = await getSupabaseAnon().auth.getUser(token);
  if (error || !data?.user) {
    return { error: NextResponse.json({ error: 'INVALID_SESSION' }, { status: 401 }) };
  }

  // Un account non confermato via email non può salvare nulla.
  if (!data.user.email_confirmed_at && !data.user.confirmed_at) {
    return { error: NextResponse.json({ error: 'EMAIL_NOT_CONFIRMED' }, { status: 403 }) };
  }

  return { user: data.user, token, db: getSupabaseForToken(token) };
}

// Legge il corpo JSON della richiesta senza far esplodere la route.
export async function readJson(req) {
  try {
    return { body: await req.json() };
  } catch {
    return { error: NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }) };
  }
}
