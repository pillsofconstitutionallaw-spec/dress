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
];

export function translateAuthError(message) {
  const text = String(message || '');
  for (const [pattern, italian] of MESSAGES) {
    if (pattern.test(text)) return italian;
  }
  return text || 'Errore imprevisto.';
}
