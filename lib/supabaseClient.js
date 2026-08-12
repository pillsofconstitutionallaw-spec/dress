import { createClient } from '@supabase/supabase-js';

// I client vengono creati "pigramente": senza le variabili d'ambiente Supabase
// l'app deve comunque compilare e girare (i dati restano nel browser).
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function hasSupabase() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON);
}

// Client pubblico: registrazione e login. Non ha privilegi speciali.
let _anon = null;
export function getSupabaseAnon() {
  if (!hasSupabase()) return null;
  if (!_anon) _anon = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
  return _anon;
}

// Client con privilegi di amministratore. Serve SOLO per cancellare un account
// (l'unica operazione che l'utente non può fare da solo). Mai esposto al browser.
let _service = null;
export function getSupabaseService() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE) return null;
  if (!_service) _service = createClient(SUPABASE_URL, SUPABASE_SERVICE, { auth: { persistSession: false } });
  return _service;
}

// Client "a nome dell'utente": ogni query passa il suo token, quindi le regole
// RLS del database lasciano vedere e toccare solo la sua riga.
export function getSupabaseForToken(token) {
  if (!hasSupabase() || !token) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}
