import { NextResponse } from 'next/server';
import { getSupabaseAnon } from '@/lib/supabaseClient';
import { readJson } from '@/lib/authServer';
import { translateAuthError } from '@/lib/authMessages';

export const runtime = 'nodejs';

export async function POST(req) {
  const supabase = getSupabaseAnon();
  if (!supabase) return NextResponse.json({ error: 'NO_SUPABASE' }, { status: 503 });

  const { body, error: badJson } = await readJson(req);
  if (badJson) return badJson;

  const { email, password } = body || {};
  if (!email || !password) return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 });

  const { data, error } = await supabase.auth.signInWithPassword({ email: String(email).trim(), password });
  if (error) {
    const needsConfirmation = /email not confirmed/i.test(error.message || '');
    return NextResponse.json(
      { error: translateAuthError(error.message), needsConfirmation },
      { status: needsConfirmation ? 403 : 400 },
    );
  }

  // La sessione torna al browser, che la conserva e la rimanda come
  // "Authorization: Bearer <token>" a ogni chiamata protetta.
  return NextResponse.json({ ok: true, session: data.session, user: { id: data.user.id, email: data.user.email } });
}
