import { NextResponse } from 'next/server';
import { getSupabaseAnon } from '@/lib/supabaseClient';
import { readJson } from '@/lib/authServer';
import { siteOrigin, translateAuthError } from '@/lib/authMessages';

export const runtime = 'nodejs';

// Rimanda la mail di conferma a chi non l'ha ricevuta o l'ha persa.
export async function POST(req) {
  const supabase = getSupabaseAnon();
  if (!supabase) return NextResponse.json({ error: 'NO_SUPABASE' }, { status: 503 });

  const { body, error: badJson } = await readJson(req);
  if (badJson) return badJson;

  const { email } = body || {};
  if (!email) return NextResponse.json({ error: 'MISSING_EMAIL' }, { status: 400 });

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: String(email).trim(),
    options: { emailRedirectTo: `${siteOrigin(req)}/auth/confirmed` },
  });

  if (error) return NextResponse.json({ error: translateAuthError(error.message) }, { status: 400 });

  return NextResponse.json({ ok: true, message: 'Mail di conferma inviata di nuovo. Controlla anche lo spam.' });
}
