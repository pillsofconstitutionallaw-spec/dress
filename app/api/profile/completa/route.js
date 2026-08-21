import { NextResponse } from 'next/server';
import { requireUser, readJson } from '@/lib/authServer';
import { getSupabaseService } from '@/lib/supabaseClient';
import { controllaDataNascita, controllaUsername } from '@/lib/password';

export const runtime = 'nodejs';

// Codice PostgreSQL della violazione di vincolo unico: qui vuol dire
// "quel nome utente ce l'ha già qualcun altro".
const NOME_GIA_PRESO = '23505';

/**
 * Completa il profilo di chi è entrato con Google.
 *
 * Google restituisce email, nome e foto. Nome utente e data di nascita no —
 * e senza quei due l'app non sa come chiamarti né se hai l'età per iscriverti.
 * Questa è l'unica route che li accetta dopo l'iscrizione.
 */
export async function POST(req) {
  const { user, db, error: authError } = await requireUser(req);
  if (authError) return authError;

  const { body, error: badJson } = await readJson(req);
  if (badJson) return badJson;

  const { nome, cognome, username, dataNascita, avatar } = body || {};

  // Le stesse regole del browser, ricontrollate qui: di quello che arriva
  // dalla rete non ci si fida, nemmeno quando è passato da Google.
  const usr = controllaUsername(String(username || ''));
  if (!usr.ok) return NextResponse.json({ error: `Nome utente: ${usr.messaggio}` }, { status: 400 });

  const eta = controllaDataNascita(dataNascita);
  if (!eta.ok) return NextResponse.json({ error: eta.messaggio }, { status: 400 });

  if (avatar && String(avatar).length > 400_000) {
    return NextResponse.json({ error: "L'immagine del profilo è troppo grande." }, { status: 400 });
  }

  const riga = {
    id: user.id,
    email: user.email,
    username: String(username).trim(),
    data_nascita: dataNascita,
  };
  if (nome !== undefined) riga.name = String(nome || '').trim() || null;
  if (cognome !== undefined) riga.cognome = String(cognome || '').trim() || null;
  if (avatar !== undefined) riga.avatar = avatar || null;

  const { data, error } = await db.from('profiles').upsert(riga, { onConflict: 'id' }).select().single();

  if (error) {
    // L'unicità del nome utente la garantisce l'indice del database, non una
    // select fatta prima: fra il controllo e la scrittura c'è sempre una
    // fessura in cui due iscrizioni simultanee passano tutte e due.
    if (error.code === NOME_GIA_PRESO) {
      return NextResponse.json({ error: 'Questo nome utente è già preso.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Gli stessi dati anche nei metadati dell'utente: /start li legge da lì
  // (start/page.js), e due fonti che si contraddicono sono peggio di una.
  const admin = getSupabaseService();
  if (admin) {
    const { error: erroreMeta } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        name: riga.name ?? user.user_metadata?.name ?? null,
        cognome: riga.cognome ?? null,
        username: riga.username,
        data_nascita: dataNascita,
        avatar: riga.avatar ?? null,
      },
    });
    // Non è un motivo per far fallire la richiesta: il profilo è salvato,
    // e i metadati sono una copia di comodo. Ma va scritto nei log.
    if (erroreMeta) console.error('[completa] metadati non aggiornati:', erroreMeta.message);
  }

  return NextResponse.json({ ok: true, profile: data });
}
