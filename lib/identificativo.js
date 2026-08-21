// Cosa conta come email e cosa come nome utente.
//
// La regola sta qui e non dentro la route perché è l'unico bivio del login:
// da che parte va l'utente dipende tutto il resto, e una riga così va potuta
// provare da sola.
//
// La chiocciola basta: i nomi utente non possono contenerla
// (controllaUsername ammette solo lettere, numeri, punto e trattino basso),
// quindi un dato con la chiocciola è un tentativo di email — valido o no, lo
// dirà Supabase.
export function sembraEmail(valore) {
  return String(valore || "").includes("@");
}
