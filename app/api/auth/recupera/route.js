import { NextResponse } from "next/server";
import { getSupabaseAnon } from "@/lib/supabaseClient";
import { readJson } from "@/lib/authServer";
import { guastoDiRete, siteOrigin, translateAuthError } from "@/lib/authMessages";

export const runtime = "nodejs";

// Manda la mail per reimpostare la password.
//
// La risposta è sempre la stessa, anche se l'indirizzo non esiste: altrimenti
// chiunque potrebbe usare questa pagina per scoprire chi è iscritto.
export async function POST(req) {
  const supabase = getSupabaseAnon();
  if (!supabase) return NextResponse.json({ error: "NO_SUPABASE" }, { status: 503 });

  const { body, error: badJson } = await readJson(req);
  if (badJson) return badJson;

  const email = String(body?.email || "").trim();
  if (!email) return NextResponse.json({ error: "Serve la tua email." }, { status: 400 });

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteOrigin(req)}/auth/reimposta`,
  });

  // Solo gli errori tecnici veri escono; "utente inesistente" no.
  if (error && /rate limit|for security purposes|too many/i.test(error.message)) {
    return NextResponse.json({ error: translateAuthError(error.message) }, { status: 429 });
  }

  // E un guasto di rete, che tecnico lo è davvero. Il silenzio qui sotto
  // serve a non dire a un estraneo chi è iscritto, ed è giusto per tutto
  // quello che riguarda l'indirizzo scritto. Ma se la richiesta al database
  // non è proprio partita, quel silenzio diventa una promessa falsa:
  // «riceverai una mail», e nessuna mail può arrivare. Chi ha dimenticato la
  // password resta ad aspettarla. Un guasto nostro di chi sia iscritto non
  // dice niente, quindi si può dire.
  if (error && guastoDiRete(error.message)) {
    return NextResponse.json({ error: translateAuthError(error.message) }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    message: "Se questo indirizzo è iscritto, riceverai una mail per scegliere una nuova password.",
  });
}
