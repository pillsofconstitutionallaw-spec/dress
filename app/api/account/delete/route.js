import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabaseClient';
import { requireUser, readJson } from '@/lib/authServer';

export const runtime = 'nodejs';

// Cancellazione definitiva dell'account: sparisce l'utente e, per effetto del
// vincolo "on delete cascade" in sql/supabase_init.sql, anche il suo profilo
// (palette, preferiti, outfit salvati).
export async function POST(req) {
  const { user, db, error: authError } = await requireUser(req);
  if (authError) return authError;

  const { body, error: badJson } = await readJson(req);
  if (badJson) return badJson;

  // Piccola sicurezza contro il click distratto: va riscritta la propria email.
  const typed = String(body?.confirmEmail || '').trim().toLowerCase();
  if (typed !== String(user.email || '').toLowerCase()) {
    return NextResponse.json({ error: 'CONFIRM_EMAIL_MISMATCH' }, { status: 400 });
  }

  const admin = getSupabaseService();
  if (!admin) {
    // Senza chiave di servizio possiamo comunque cancellare i dati personali,
    // ma non l'utente: meglio dirlo chiaramente invece di fingere che sia fatto.
    await db.from('profiles').delete().eq('id', user.id);
    return NextResponse.json(
      {
        error: 'NO_SERVICE_KEY',
        message:
          'Ho cancellato i tuoi dati (palette, preferiti, outfit), ma per eliminare anche le credenziali serve la variabile SUPABASE_SERVICE_ROLE_KEY.',
      },
      { status: 501 },
    );
  }

  // Prima i dati, poi le credenziali: se qualcosa va storto a metà,
  // non resta un profilo orfano con dentro informazioni personali.
  const { error: profileError } = await admin.from('profiles').delete().eq('id', user.id);
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: 'Account eliminato. Ci dispiace vederti andare via.' });
}
