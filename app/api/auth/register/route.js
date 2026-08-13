import { NextResponse } from 'next/server';
import { getSupabaseAnon, getSupabaseService } from '@/lib/supabaseClient';
import { readJson } from '@/lib/authServer';
import { siteOrigin, translateAuthError } from '@/lib/authMessages';
import { controllaDataNascita, controllaPassword, controllaUsername } from '@/lib/password';

export const runtime = 'nodejs';

// Registrazione. NON crea l'utente già confermato: Supabase manda una mail
// con il link, e finché non viene aperto l'account non è attivo.
export async function POST(req) {
  const supabase = getSupabaseAnon();
  if (!supabase) return NextResponse.json({ error: 'NO_SUPABASE' }, { status: 503 });

  const { body, error: badJson } = await readJson(req);
  if (badJson) return badJson;

  const { nome, cognome, username, email, password, dataNascita, avatar } = body || {};

  if (!nome || !cognome || !username || !email || !password) {
    return NextResponse.json({ error: 'Compila nome, cognome, nome utente, email e password.' }, { status: 400 });
  }

  // Le stesse regole del browser, ricontrollate qui: di quello che arriva
  // dalla rete non ci si fida mai.
  const pwd = controllaPassword(password);
  if (!pwd.ok) return NextResponse.json({ error: pwd.messaggio }, { status: 400 });

  const usr = controllaUsername(username);
  if (!usr.ok) return NextResponse.json({ error: `Nome utente: ${usr.messaggio}` }, { status: 400 });

  const eta = controllaDataNascita(dataNascita);
  if (!eta.ok) return NextResponse.json({ error: eta.messaggio }, { status: 400 });

  // Un'immagine del profilo troppo pesante non deve entrare nel database.
  if (avatar && String(avatar).length > 400_000) {
    return NextResponse.json({ error: "L'immagine del profilo è troppo grande." }, { status: 400 });
  }

  // Nome utente già preso? Meglio dirlo adesso che dopo la mail di conferma.
  const admin = getSupabaseService();
  if (admin) {
    const { data: esistente } = await admin
      .from('profiles')
      .select('id')
      .ilike('username', String(username).trim())
      .maybeSingle();
    if (esistente) {
      return NextResponse.json({ error: 'Questo nome utente è già preso.' }, { status: 409 });
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email: String(email).trim(),
    password,
    options: {
      data: {
        name: String(nome).trim(),
        cognome: String(cognome).trim(),
        username: String(username).trim(),
        data_nascita: dataNascita,
        avatar: avatar || null,
      },
      emailRedirectTo: `${siteOrigin(req)}/auth/confirmed`,
    },
  });

  if (error) {
    return NextResponse.json({ error: translateAuthError(error.message) }, { status: 400 });
  }

  // Supabase, per non rivelare chi è già iscritto, risponde comunque "ok" con
  // una lista di identità vuota se l'email esiste già. Il messaggio resta neutro.
  const giaRegistrato = Array.isArray(data?.user?.identities) && data.user.identities.length === 0;

  // Il resto del profilo lo scriviamo noi: il trigger salva solo nome ed email.
  if (admin && data?.user?.id && !giaRegistrato) {
    await admin
      .from('profiles')
      .update({
        cognome: String(cognome).trim(),
        username: String(username).trim(),
        data_nascita: dataNascita,
        avatar: avatar || null,
      })
      .eq('id', data.user.id);
  }

  return NextResponse.json({
    ok: true,
    needsConfirmation: !data?.session,
    alreadyRegistered: giaRegistrato,
    message: giaRegistrato
      ? 'Se questo indirizzo non è già attivo, riceverai una mail di conferma. Controlla anche lo spam.'
      : "Ti abbiamo mandato una mail: apri il link per confermare l'iscrizione. Controlla anche lo spam.",
  });
}
