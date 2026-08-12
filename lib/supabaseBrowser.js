import { createClient } from '@supabase/supabase-js';

// Client lato browser, creato solo se le variabili pubbliche esistono:
// senza Supabase configurato l'app continua a funzionare in locale.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let _client = null;

export function hasAccounts() {
  return Boolean(URL && ANON);
}

export function getSupabaseBrowser() {
  if (!hasAccounts()) return null;
  if (!_client) {
    _client = createClient(URL, ANON, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Il link di conferma dell'email riporta qui la sessione nell'URL.
        detectSessionInUrl: true,
      },
    });
  }
  return _client;
}

export default getSupabaseBrowser;
