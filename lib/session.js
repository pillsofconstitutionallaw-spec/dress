"use client";

import { getSupabaseBrowser, hasAccounts } from "@/lib/supabaseBrowser";

export { hasAccounts };

// Chiavi usate per tenere i dati nel browser quando non c'è un account.
export const LOCAL_KEYS = {
  session: "dress:session",
  savedItems: "dress:savedItems",
  favorites: "dress:favorites",
};

export async function getSession() {
  const sb = getSupabaseBrowser();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data?.session || null;
}

export async function getUser() {
  const session = await getSession();
  return session?.user || null;
}

// Avvisa quando l'utente entra o esce. Ritorna la funzione per smettere di ascoltare.
export function onAuthChange(callback) {
  const sb = getSupabaseBrowser();
  if (!sb) return () => {};
  const { data } = sb.auth.onAuthStateChange((_event, session) => callback(session?.user || null));
  return () => data?.subscription?.unsubscribe?.();
}

/**
 * Chiama un'API dell'app allegando il token di sessione.
 * È l'unico modo in cui il server sa chi siamo: nessuna email viaggia più
 * nel corpo della richiesta.
 */
export async function apiFetch(path, { method = "GET", body } = {}) {
  const session = await getSession();
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

  const res = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* risposta senza corpo */
  }

  if (!res.ok) {
    const error = new Error(data?.message || data?.error || `Errore ${res.status}`);
    error.code = data?.error;
    error.status = res.status;
    throw error;
  }
  return data;
}

export async function register(dati) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dati),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Iscrizione non riuscita.");
  return data;
}

export async function resendConfirmation(email) {
  const res = await fetch("/api/auth/resend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Invio non riuscito.");
  return data;
}

// Chiede la mail per reimpostare la password.
export async function recuperaPassword(email) {
  const res = await fetch("/api/auth/recupera", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Invio non riuscito.");
  return data;
}

/**
 * Entra con email OPPURE nome utente.
 *
 * Il campo d'accesso ha sempre detto "Email o nome utente", ma il login
 * parlava direttamente con Supabase, che accetta solo l'email: chi scriveva
 * il proprio nome utente si sentiva rispondere "password non corretti" con
 * la password giusta. Da fuori sembrava un guasto a intermittenza.
 *
 * Adesso passa dal server, che sa tradurre il nome utente in email senza
 * mai restituirla al browser, e che manda indietro il messaggio d'errore
 * vero invece di schiacciarli tutti su uno solo.
 */
export async function signIn({ identificativo, password }) {
  const sb = getSupabaseBrowser();
  if (!sb) throw new Error("Gli account non sono configurati su questa installazione.");

  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identificativo, password }),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data?.error || "Accesso non riuscito.");
    err.needsConfirmation = Boolean(data?.needsConfirmation);
    throw err;
  }

  // Il server ha fatto il login, ma la sessione deve vivere nel browser:
  // è da lì che ogni chiamata successiva prende il token.
  const { access_token, refresh_token } = data.session || {};
  if (!access_token || !refresh_token) throw new Error("Accesso non riuscito.");
  const { error } = await sb.auth.setSession({ access_token, refresh_token });
  if (error) throw new Error("Accesso non riuscito.");

  return data.user;
}

/**
 * Entra con Google.
 *
 * Un tasto solo per il primo ingresso e per tutti quelli dopo: OAuth non
 * distingue "iscriviti" da "accedi", ed è inutile fingere di sì.
 */
export async function entraCon(provider = "google") {
  const sb = getSupabaseBrowser();
  if (!sb) throw new Error("Gli account non sono configurati su questa installazione.");

  const { error } = await sb.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) throw new Error("Non sono riuscito ad aprire l'accesso con Google. Riprova.");
}

// Manda al server i due dati che Google non sa dare: nome utente e data di
// nascita. Il server li ricontrolla comunque.
export async function completaProfilo(campi) {
  return apiFetch("/api/profile/completa", { method: "POST", body: campi });
}

export async function signOut() {
  const sb = getSupabaseBrowser();
  if (sb) await sb.auth.signOut();
}

// Cancella l'account. Richiede di riscrivere la propria email come conferma.
export async function deleteAccount(confirmEmail) {
  const data = await apiFetch("/api/account/delete", { method: "POST", body: { confirmEmail } });
  await signOut();
  try {
    Object.values(LOCAL_KEYS).forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem("dress:profileEmail");
    localStorage.removeItem("dress:signedUp");
    localStorage.removeItem("dress:signup");
    localStorage.removeItem("dress:sessionToken");
  } catch {
    /* localStorage non disponibile */
  }
  return data;
}
