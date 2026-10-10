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
 * rifarlo daccapo, e va dove stanno i suoi colori. Prima andava al
 * Guardaroba, che adesso è «Preferiti»: a chi è appena entrato mostrava
 * due elenchi vuoti invece della cosa per cui è venuto.
 */
export function prossimaTappa() {
  try {
    const s = JSON.parse(localStorage.getItem("dress:session") || "null");
    if (s?.result?.palette?.length) return "/tuo-stile";
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
