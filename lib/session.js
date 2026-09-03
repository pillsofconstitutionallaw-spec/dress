"use client";

import { translateAuthError } from "@/lib/authMessages";

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
    // Tradotto QUI, una volta, invece che in ognuna delle dieci schermate che
    // fanno setErr(e.message): è così che "JWT issued in the future" è finito
    // scritto sotto il titolo della pagina.
    const error = new Error(translateAuthError(data?.message || data?.error || `Errore ${res.status}`));
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
/**
 * Chi sta entrando, comunque lo si sia chiamato.
 *
 * Questa funzione prendeva solo «identificativo», e girava al server solo
 * quello. Ma due delle tre schermate da cui si entra la chiamavano con
 * «email» — il modulo del dashboard e la pagina d'iscrizione — e quella
 * email veniva buttata via per strada: al server arrivava la password senza
 * chi sei, e tornava indietro «Scrivi email (o nome utente) e password».
 * Cioè: dal dashboard non si entrava mai, e dopo l'iscrizione non si
 * entrava mai. Un errore che dà la colpa a chi ha appena scritto la sua
 * email nel campo giusto.
 *
 * La rotta le accettava già tutte e due (identificativo ?? email). Adesso le
 * accetta anche questa metà, che è quella che decideva.
 */
export function identificativoDa({ identificativo, email } = {}) {
  return String(identificativo ?? email ?? "").trim();
}

export async function signIn({ identificativo, email, password }) {
  const sb = getSupabaseBrowser();
  if (!sb) throw new Error("Gli account non sono configurati su questa installazione.");

  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identificativo: identificativoDa({ identificativo, email }), password }),
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

  // Si controlla PRIMA di partire.
  //
  // signInWithOAuth non fallisce qui: manda il browser su Supabase, e se il
  // provider non è acceso nel pannello è Supabase a rispondere — con un
  // pezzo di JSON crudo a schermo intero, {"code":400,...,"msg":"Unsupported
  // provider: provider is not enabled"}. L'utente resta lì, su una pagina che
  // non è nostra e non gli dice niente. Meglio non partire.
  if (!(await accessoAttivo(provider))) {
    throw new Error(
      `L'accesso con ${provider === "google" ? "Google" : provider} non è ancora attivo. Entra con email e password.`,
    );
  }

  const { error } = await sb.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) throw new Error("Non sono riuscito ad aprire l'accesso con Google. Riprova.");
}

// Quali modi di entrare sono accesi su questo progetto Supabase.
//
// È una domanda che si fa al server, non una cosa che si scrive nel codice:
// il giorno in cui Google viene acceso nel pannello, il tasto ricompare da
// solo senza toccare una riga. Si chiede una volta per sessione.
let _accessi = null;
export async function accessiAttivi() {
  if (_accessi) return _accessi;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chiave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chiave) return {};
  try {
    const r = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: chiave } });
    if (!r.ok) return {};
    const d = await r.json();
    _accessi = d?.external || {};
    return _accessi;
  } catch {
    // Se non si riesce a chiedere, non si nasconde niente: meglio un tasto
    // che forse non funziona di un tasto che manca perché la rete è lenta.
    return {};
  }
}

export async function accessoAttivo(provider) {
  const attivi = await accessiAttivi();
  // Sconosciuto vuol dire "non ho potuto chiedere": si lascia provare.
  return attivi[provider] !== false;
}

// Manda al server i due dati che Google non sa dare: nome utente e data di
// nascita. Il server li ricontrolla comunque.
export async function completaProfilo(campi) {
  return apiFetch("/api/profile/completa", { method: "POST", body: campi });
}

// ── Face ID e impronta ────────────────────────────────────────────────
//
// Nome tecnico: passkey. Al posto della password si mette una chiave che
// resta dentro il telefono o il computer, e per usarla l'apparecchio chiede
// la faccia o il dito. Chi la registra non digita più niente; chi non la
// vuole continua con la password, che non sparisce.
//
// Non è automatico: è una scelta che si fa una volta, da Impostazioni, e si
// disfa quando si vuole.

/**
 * Questo apparecchio sa fare Face ID o impronta?
 *
 * Sono due domande diverse. Il browser può conoscere le passkey e non avere
 * un lettore: un computer fisso senza sensore risponderebbe di sì alla prima
 * e no alla seconda, e ci ritroveremmo a offrire una cosa che non può fare.
 */
export async function questoApparecchioSaFarlo() {
  if (typeof window === "undefined") return false;
  if (!window.PublicKeyCredential) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// E il progetto le ha accese? La stessa domanda che si fa per Google, alla
// stessa risposta del server: così il giorno in cui vengono accese i tasti
// compaiono da soli.
export async function passkeyAttive() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chiave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chiave) return false;
  try {
    const r = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: chiave } });
    if (!r.ok) return false;
    const d = await r.json();
    return d?.passkeys_enabled === true;
  } catch {
    return false;
  }
}

// Questo apparecchio l'ha già registrata?
//
// Non si può chiedere all'account: passkey.list() elenca le chiavi di TUTTI
// gli apparecchi, e una chiave sta dentro l'apparecchio che l'ha creata. Chi
// l'aveva attivata sul telefono non se la sarebbe più vista proporre sul
// computer — pur non avendocela, lì. La risposta giusta la sa solo il browser
// che sta chiedendo, e sta scritta qui dentro.
const IMPRONTA_QUI = "dress:improntaSuQuestoApparecchio";

export function improntaAttivaQui() {
  try {
    return localStorage.getItem(IMPRONTA_QUI) === "1";
  } catch {
    return false;
  }
}

export function segnaImprontaQui(attiva) {
  try {
    if (attiva) localStorage.setItem(IMPRONTA_QUI, "1");
    else localStorage.removeItem(IMPRONTA_QUI);
  } catch {
    /* browser che non vuole scrivere: si riproporrà, ed è il male minore */
  }
}

/**
 * Registra questo apparecchio. Serve essere già dentro.
 *
 * L'apparecchio chiede la faccia o il dito, e tiene la chiave per sé: qui non
 * arriva niente di biometrico, mai. Noi riceviamo solo la prova che
 * l'apparecchio ha riconosciuto il suo proprietario.
 */
export async function registraQuestoApparecchio() {
  const sb = getSupabaseBrowser();
  if (!sb) throw new Error("Gli account non sono configurati su questa installazione.");
  // Le passkey sono arrivate nella libreria a una certa versione. Se qualcuno
  // reinstalla le dipendenze e ne arriva una più vecchia, senza questa riga
  // l'utente vedrebbe "sb.auth.registerPasskey is not a function".
  if (typeof sb.auth.registerPasskey !== "function") {
    throw new Error("Questa versione di Dress non sa ancora gestire Face ID. Entra con la password.");
  }
  const { data, error } = await sb.auth.registerPasskey();
  if (error) {
    // "Già registrata" non è un fallimento: è la risposta giusta, e vuol dire
    // che il segno nel browser mancava. Si mette e non se ne parla più.
    if (/InvalidState/i.test(String(error?.name || error?.message || ""))) segnaImprontaQui(true);
    throw new Error(erroreDiPasskey(error));
  }
  segnaImprontaQui(true);
  return data;
}

// Entra con la faccia o col dito, senza password.
export async function entraConImpronta() {
  const sb = getSupabaseBrowser();
  if (!sb) throw new Error("Gli account non sono configurati su questa installazione.");
  if (typeof sb.auth.signInWithPasskey !== "function") {
    throw new Error("Questa versione di Dress non sa ancora gestire Face ID. Entra con la password.");
  }
  const { data, error } = await sb.auth.signInWithPasskey();
  if (error) throw new Error(erroreDiPasskey(error));
  segnaImprontaQui(true);
  return data?.user || null;
}

// Gli apparecchi registrati su questo account.
export async function apparecchiRegistrati() {
  const sb = getSupabaseBrowser();
  if (!sb || typeof sb.auth.passkey?.list !== "function") return [];
  const { data, error } = await sb.auth.passkey.list();
  if (error) return [];
  return data || [];
}

export async function togliApparecchio(passkeyId) {
  const sb = getSupabaseBrowser();
  if (!sb) throw new Error("Gli account non sono configurati su questa installazione.");
  const { error } = await sb.auth.passkey.delete({ passkeyId });
  if (error) throw new Error(erroreDiPasskey(error));
  return true;
}

// Gli errori di WebAuthn sono nomi di eccezioni del browser, non frasi.
// "NotAllowedError" vuol dire quasi sempre che uno ha annullato, e dirglielo
// come lo dice il browser lo farebbe sentire in colpa di un guasto.
function erroreDiPasskey(errore) {
  const testo = String(errore?.name || errore?.message || "");
  if (/NotAllowed|AbortError/i.test(testo)) {
    return "Annullato. Nessun problema: puoi riprovare quando vuoi.";
  }
  if (/InvalidState/i.test(testo)) {
    return "Questo apparecchio è già registrato su questo account.";
  }
  if (/NotSupported|SecurityError/i.test(testo)) {
    return "Questo apparecchio, o questo browser, non se ne può occupare. Entra con la password.";
  }
  if (/no.*credential|not found|no passkey/i.test(testo)) {
    return "Su questo apparecchio non c'è nessuna chiave per Dress. Entra con la password e attivala da Impostazioni.";
  }
  return translateAuthError(errore?.message || testo);
}

// Cambia la password di chi è già dentro. Non serve la vecchia: chi ha la
// sessione aperta ha già dimostrato di essere lui — ed è per questo che il
// tasto "esci da tutti i dispositivi" qui sotto non è un ornamento.
export async function cambiaPassword(nuova) {
  const sb = getSupabaseBrowser();
  if (!sb) throw new Error("Gli account non sono configurati su questa installazione.");
  const { error } = await sb.auth.updateUser({ password: nuova });
  if (error) throw new Error(translateAuthError(error.message));

  // Vale da adesso, e qui dentro si resta.
  //
  // Il gettone che il browser ha in mano è stato firmato PRIMA del cambio:
  // continua a funzionare, ma è vecchio, e certe chiamate al database lo
  // rifiutano. Rinfrescarlo subito è la differenza fra "ho cambiato la
  // password e tutto continua a funzionare" e "ho cambiato la password e da
  // qualche parte è saltato qualcosa".
  //
  // Se il rinfresco non riesce non si solleva un errore: la password è
  // cambiata davvero, e dirle che è andata male sarebbe falso.
  try {
    await sb.auth.refreshSession();
  } catch {
    /* il gettone vecchio regge comunque fino alla scadenza */
  }
  return true;
}

// Cambia l'indirizzo email. Non ha effetto finché non si apre il link che
// Supabase manda al NUOVO indirizzo: se si potesse cambiare senza conferma,
// basterebbe una sessione rubata per portarsi via l'account.
export async function cambiaEmail(nuova) {
  const sb = getSupabaseBrowser();
  if (!sb) throw new Error("Gli account non sono configurati su questa installazione.");
  const { error } = await sb.auth.updateUser({ email: nuova });
  if (error) throw new Error(translateAuthError(error.message));
  return true;
}

/**
 * Chiude la sessione ovunque, non solo qui.
 *
 * Il telefono lasciato a qualcuno, il computer dell'ufficio, la sessione
 * aperta un anno fa su un dispositivo che non hai più: sono tutte valide
 * finché non si fa questo. È il rimedio che costa meno a un guaio che costa
 * caro.
 */
export async function esciDaTuttiIDispositivi() {
  const sb = getSupabaseBrowser();
  if (!sb) throw new Error("Gli account non sono configurati su questa installazione.");
  const { error } = await sb.auth.signOut({ scope: "global" });
  if (error) throw new Error(translateAuthError(error.message));
  return true;
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
