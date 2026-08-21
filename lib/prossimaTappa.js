"use client";

/**
 * Dove mandare chi è appena entrato.
 *
 * Questa regola stava scritta due volte, uguale, in SchermataAccesso e nella
 * pagina di conferma; con l'accesso Google sarebbe diventata la terza copia.
 * Sta qui una volta sola.
 *
 * Chi non ha ancora dato misure e selfie va al questionario; chi la palette
 * ce l'ha già — per esempio confermando un cambio di indirizzo — non deve
 * rifarlo daccapo.
 */
export function prossimaTappa() {
  try {
    const s = JSON.parse(localStorage.getItem("dress:session") || "null");
    if (s?.result?.palette?.length) return "/dashboard";
  } catch {
    /* nessuna sessione */
  }
  return "/start";
}

// Un profilo è "a metà" quando mancano i due dati che Google non sa dare.
// Serve a decidere se dopo l'accesso social si passa da /auth/completa.
export function profiloCompleto(profilo) {
  return Boolean(profilo?.username && profilo?.data_nascita);
}
