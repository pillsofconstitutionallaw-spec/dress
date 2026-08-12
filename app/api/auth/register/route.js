import { NextResponse } from 'next/server';
import { getSupabaseAnon } from '@/lib/supabaseClient';
import { readJson } from '@/lib/authServer';
import { siteOrigin, translateAuthError } from '@/lib/authMessages';

export const runtime = 'nodejs';

// Registrazione. NON crea l'utente già confermato: Supabase manda una mail
// con il link di conferma, e finché non viene cliccato l'account non è attivo.
export async function POST(req) {
  const supabase = getSupabaseAnon();
  if (!supabase) return NextResponse.json({ error: 'NO_SUPABASE' }, { status: 503 });

  const { body, error: badJson } = await readJson(req);
  if (badJson) return badJson;

  const { name, email, password, profile } = body || {};
  if (!email || !password) return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 });
  if (String(password).length < 8) {
    return NextResponse.json({ error: 'La password deve avere almeno 8 caratteri.' }, { status: 400 });
  }

  const { data, error } = await supabase.auth.signUp({
    email: String(email).trim(),
    password,
    options: {
      data: { name: name || null, profile: profile || null },
      emailRedirectTo: `${siteOrigin(req)}/auth/confirmed`,
    },
  });

  if (error) {
    return NextResponse.json({ error: translateAuthError(error.message) }, { status: 400 });
  }

  // Supabase, per non rivelare chi è già iscritto, risponde comunque "ok" con
  // una lista di identità vuota se l'email esiste già. Il messaggio resta neutro.
  const alreadyRegistered = Array.isArray(data?.user?.identities) && data.user.identities.length === 0;

  return NextResponse.json({
    ok: true,
    needsConfirmation: !data?.session,
    alreadyRegistered,
    message: alreadyRegistered
      ? 'Se questo indirizzo non è già attivo, riceverai una mail di conferma. Controlla anche lo spam.'
      : 'Ti abbiamo mandato una mail: clicca il link per confermare l\'iscrizione. Controlla anche lo spam.',
  });
}
