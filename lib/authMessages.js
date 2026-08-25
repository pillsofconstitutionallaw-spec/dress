// Indirizzo pubblico del sito, usato per costruire i link nelle mail.
// In produzione conviene fissare NEXT_PUBLIC_SITE_URL (es. https://dress.vercel.app).
export function siteOrigin(req) {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
  if (configured) return configured;
  const origin = req.headers.get('origin');
  if (origin) return origin.replace(/\/$/, '');
  return new URL(req.url).origin;
}

import { LUNGHEZZA_MINIMA } from './password';

// Traduce i messaggi d'errore di Supabase (in inglese) in frasi comprensibili.
const MESSAGES = [
  [/email not confirmed/i, "Devi prima confermare l'email: apri il link che ti abbiamo mandato."],
  [/invalid login credentials/i, 'Email o password non corretti.'],
  [/user already registered|already been registered/i, 'Questo indirizzo è già iscritto. Prova ad accedere.'],
  // Il numero viene da password.js: scritto a mano diceva 8 mentre la regola
  // vera ne chiede 10, e l'utente rifiutato non capiva perché.
  [/password should be at least/i, `La password è troppo corta: servono almeno ${LUNGHEZZA_MINIMA} caratteri.`],
  [/unable to validate email|invalid format/i, "L'indirizzo email non sembra valido."],
  [/for security purposes|rate limit|too many requests/i, 'Troppi tentativi ravvicinati. Aspetta qualche minuto e riprova.'],
  [/signups not allowed|signup is disabled/i, 'Le iscrizioni sono momentaneamente chiuse.'],

  // L'orologio. "JWT issued in the future" vuol dire che il gettone di
  // sessione risulta emesso in un momento che per chi lo controlla non è
  // ancora arrivato: fra i due orologi ci sono di mezzo dei secondi, o dei
  // giorni. È una cosa che l'utente può davvero sistemare, quindi glielo si
  // dice — invece di stampargli in faccia la sigla di un errore interno.
  [/issued in the future|used before issued|not yet valid|token.*nbf/i,
    "L'ora di questo dispositivo non coincide con quella del server. Controlla che data e ora siano impostate in automatico, poi ricarica la pagina."],

  // Sessione scaduta, malformata, o firmata con una chiave che non torna:
  // per chi legge sono tutte la stessa cosa, cioè "devi rientrare".
  [/jwt|bad_?jwt|invalid.*token|token.*expired|pgrst\d+|invalid_session|not_signed_in/i,
    'La sessione non è più valida. Esci e rientra, e ritrovi tutto dov’era.'],
];

// Le parole che tradiscono un messaggio scritto per chi ha fatto il
// programma, non per chi lo usa. Se la traduzione non ha trovato niente ma
// il testo ha questa faccia, meglio una frase generica che una sigla.
const DA_NON_MOSTRARE = /jwt|token|claim|postgrest|pgrst|supabase|constraint|violates|null value|syntax error|500|internal/i;

export function translateAuthError(message) {
  const text = String(message || '').trim();
  for (const [pattern, italian] of MESSAGES) {
    if (pattern.test(text)) return italian;
  }
  if (!text) return 'Errore imprevisto.';
  if (DA_NON_MOSTRARE.test(text)) {
    return 'Qualcosa non ha funzionato dalla nostra parte. Riprova fra un momento.';
  }
  return text;
}
