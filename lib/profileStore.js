import { NextResponse } from 'next/server';

// Chiave con cui riconosciamo due volte lo stesso preferito o outfit:
// accettiamo sia stringhe ("Zara") sia oggetti ({ id: ... }).
export function itemKey(item) {
  if (item == null) return '';
  if (typeof item === 'string') return item;
  return String(item.id ?? item._id ?? item.uid ?? item.label ?? JSON.stringify(item));
}

// Legge una colonna del profilo dell'utente collegato.
// Se la riga non esiste ancora (registrazione appena fatta) non è un errore.
export async function loadRow(db, user, column) {
  const { data, error } = await db.from('profiles').select(column).eq('id', user.id).maybeSingle();
  if (error) return { error: NextResponse.json({ error: error.message }, { status: 500 }) };
  return { row: data || {} };
}
