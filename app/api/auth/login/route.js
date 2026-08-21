import { NextResponse } from 'next/server';
import { getSupabaseAnon, getSupabaseService } from '@/lib/supabaseClient';
import { readJson } from '@/lib/authServer';
import { translateAuthError } from '@/lib/authMessages';
import { sembraEmail } from '@/lib/identificativo';

export const runtime = 'nodejs';

// La stessa frase per "non esisti" e per "password sbagliata".
// Se le due risposte fossero diverse, questa route diventerebbe il modo più
// comodo del mondo per sapere chi è iscritto: basta provare i nomi utente.
const CREDENZIALI = 'Email o password non corretti.';

/**
 * Da nome utente a email, SOLO qui dentro.
 *
 * L'email non torna mai al browser: chi chiama questa route riceve una
 * sessione, non un indirizzo. Altrimenti da un nome utente pubblico si
 * risalirebbe all'indirizzo privato di chiunque.
 */
async function emailDelNomeUtente(username) {
  const admin = getSupabaseService();
  // Senza chiave di servizio la tabella dei profili non è leggibile (le regole
  // RLS la proteggono, ed è giusto così): il login con nome utente non è
  // disponibile, ma quello con email continua a funzionare.
  if (!admin) return null;

  const { data, error } = await admin
    .from('profiles')
    .select('email')
    .ilike('username', username)
    .maybeSingle();

  if (error) {
    console.error('[login] lettura del nome utente non riuscita:', error.message);
    return null;
  }
  return data?.email || null;
}

export async function POST(req) {
  const supabase = getSupabaseAnon();
  if (!supabase) return NextResponse.json({ error: 'NO_SUPABASE' }, { status: 503 });

  const { body, error: badJson } = await readJson(req);
  if (badJson) return badJson;

  // "identificativo" perché può essere l'una o l'altro: è quello che l'utente
  // ha scritto nel primo campo, e il campo dice "Email o nome utente".
  const identificativo = String(body?.identificativo ?? body?.email ?? '').trim();
  const password = String(body?.password ?? '');

  if (!identificativo || !password) {
    return NextResponse.json({ error: 'Scrivi email (o nome utente) e password.' }, { status: 400 });
  }

  const email = sembraEmail(identificativo)
    ? identificativo
    : await emailDelNomeUtente(identificativo);

  // Nome utente inesistente: stessa risposta, stesso stato, stessa frase di
  // una password sbagliata. Da fuori le due cose devono essere indistinguibili.
  if (!email) {
    return NextResponse.json({ error: CREDENZIALI }, { status: 400 });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const messaggio = error.message || '';
    const daConfermare = /email not confirmed/i.test(messaggio);
    const troppiTentativi = /for security purposes|rate limit|too many requests/i.test(messaggio);

    // Qui la traduzione serve davvero: prima ogni errore diventava "password
    // non corretti", così chi era stato bloccato per troppi tentativi
    // continuava a riprovare e allungava il blocco.
    return NextResponse.json(
      {
        error: translateAuthError(messaggio),
        needsConfirmation: daConfermare,
      },
      { status: daConfermare ? 403 : troppiTentativi ? 429 : 400 },
    );
  }

  // La sessione torna al browser, che la installa con setSession() e la rimanda
  // come "Authorization: Bearer <token>" a ogni chiamata protetta.
  return NextResponse.json({
    ok: true,
    session: data.session,
    user: { id: data.user.id, email: data.user.email },
  });
}
