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
