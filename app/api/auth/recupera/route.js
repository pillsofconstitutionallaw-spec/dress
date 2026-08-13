import { NextResponse } from "next/server";
import { getSupabaseAnon } from "@/lib/supabaseClient";
import { readJson } from "@/lib/authServer";
import { siteOrigin, translateAuthError } from "@/lib/authMessages";

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

  return NextResponse.json({
    ok: true,
    message: "Se questo indirizzo è iscritto, riceverai una mail per scegliere una nuova password.",
  });
}
