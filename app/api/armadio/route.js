import { NextResponse } from "next/server";
import { requireUser, readJson } from "@/lib/authServer";
import { normalizzaCapo } from "@/lib/armadio";
import { soloCifre } from "@/lib/numeri";

export const runtime = "nodejs";
export const maxDuration = 30;

// L'armadio di chi sta guardando.
//
// Non c'è nessun controllo qui dentro che dica «e questo capo è tuo?». Non
// serve: le regole del database (sql/armadio.sql) rispondono solo per le
// righe di chi chiede, e una domanda sulle righe di un altro torna vuota.
// Provato con due utenti veri prima di scrivere questa riga.
//
// Vale la pena dirlo perché la tentazione è di controllare anche qui, «per
// sicurezza». Non è sicurezza: è un secondo posto dove il controllo può
// essere scritto male, e uno dei due invecchia sempre.

const QUANTI_AL_MASSIMO = 500;

export async function GET(req) {
  const { user, db, error } = await requireUser(req);
  if (error) return error;

  const { data, error: err } = await db
    .from("armadio")
    .select("id, titolo, ruolo, categoria, note, colore_hex, colore_nome, colore_l, colore_a, colore_b, foto, volte, ultima, creato")
    .order("creato", { ascending: false })
    .limit(QUANTI_AL_MASSIMO);

  if (err) return NextResponse.json({ error: err.message }, { status: 500 });
  return NextResponse.json({ ok: true, capi: data || [] });
}

export async function POST(req) {
  const { user, db, error } = await requireUser(req);
  if (error) return error;

  const { body, error: bruttoJson } = await readJson(req);
  if (bruttoJson) return bruttoJson;

  // Quello che arriva non si salva com'è: passa dal controllo all'ingresso,
  // che butta via i ruoli inventati e i colori che non vengono da una misura.
  const capo = normalizzaCapo(body?.capo);
  if (!capo) {
    return NextResponse.json({ error: "Serve almeno un nome per questo capo." }, { status: 400 });
  }

  const { data, error: err } = await db
    .from("armadio")
    .insert({ ...capo, utente: user.id })
    .select("id, titolo, ruolo, categoria, note, colore_hex, colore_nome, foto, volte, creato")
    .single();

  if (err) return NextResponse.json({ error: err.message }, { status: 500 });
  return NextResponse.json({ ok: true, capo: data });
}

export async function DELETE(req) {
  const { db, error } = await requireUser(req);
  if (error) return error;

  const id = soloCifre(new URL(req.url).searchParams.get("id"), 12);
  if (!id) return NextResponse.json({ error: "Quale capo?" }, { status: 400 });

  const { error: err } = await db.from("armadio").delete().eq("id", Number(id));
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });

  // Niente 404 se non c'era: cancellare due volte la stessa cosa deve dare
  // lo stesso risultato della prima, altrimenti un doppio tocco sul telefono
  // diventa un messaggio d'errore per una cosa andata bene.
  return NextResponse.json({ ok: true });
}

/**
 * L'ho messo oggi.
 *
 * Un'operazione sola, e volutamente povera: più uno, e la data. Niente
 * modifica del titolo o del colore — quelli si correggono altrove, e
 * mescolare «segno che l'ho indossato» con «cambio cos'è» in una sola
 * chiamata è il modo di ritrovarsi, fra un anno, con un tasto che fa due
 * cose e una delle due sbagliata.
 *
 * Il conteggio si legge e si riscrive invece di essere incrementato dal
 * database. Su un armadio di una persona sola non c'è nessuno con cui
 * accavallarsi, e una funzione SQL in più sarebbe un pezzo da ricordarsi di
 * applicare a ogni ricostruzione.
 */
export async function PATCH(req) {
  const { db, error } = await requireUser(req);
  if (error) return error;

  const id = soloCifre(new URL(req.url).searchParams.get("id"), 12);
  if (!id) return NextResponse.json({ error: "Quale capo?" }, { status: 400 });

  const { data: prima, error: erroreLettura } = await db
    .from("armadio")
    .select("volte")
    .eq("id", Number(id))
    .maybeSingle();
  if (erroreLettura) return NextResponse.json({ error: erroreLettura.message }, { status: 500 });
  // Non esiste, o non è suo: le regole del database non distinguono, e va
  // bene così — da fuori le due cose devono somigliarsi.
  if (!prima) return NextResponse.json({ error: "Questo capo non c'è." }, { status: 404 });

  const { data, error: erroreScrittura } = await db
    .from("armadio")
    .update({ volte: (prima.volte || 0) + 1, ultima: new Date().toISOString() })
    .eq("id", Number(id))
    .select("id, volte, ultima")
    .single();

  if (erroreScrittura) return NextResponse.json({ error: erroreScrittura.message }, { status: 500 });
  return NextResponse.json({ ok: true, capo: data });
}
