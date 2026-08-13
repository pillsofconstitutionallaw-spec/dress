"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

// Pagina di atterraggio del link contenuto nella mail di conferma.
// Supabase rimanda qui dopo aver verificato l'indirizzo.
export default function Confirmed() {
  const [state, setState] = useState("checking"); // checking | signedIn | confirmed | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      const url = new global.URL(window.location.href);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const failure = url.searchParams.get("error_description") || hash.get("error_description");

      if (failure) {
        if (!alive) return;
        setState("error");
        setMessage(
          /expired|invalid/i.test(failure)
            ? "Il link è scaduto o è già stato usato. Chiedine uno nuovo dalla pagina di accesso."
            : decodeURIComponent(failure),
        );
        return;
      }

      const sb = getSupabaseBrowser();
      if (!sb) {
        if (!alive) return;
        setState("confirmed");
        return;
      }

      // Se arriviamo con un codice va scambiato con una sessione; altrimenti
      // il client ha già letto i token dall'URL da solo.
      const code = url.searchParams.get("code");
      if (code) {
        try {
          await sb.auth.exchangeCodeForSession(code);
        } catch {
          /* proviamo comunque a leggere la sessione qui sotto */
        }
      }

      const { data } = await sb.auth.getSession();
      if (!alive) return;
      // Ripulisce i token dalla barra degli indirizzi.
      window.history.replaceState({}, "", "/auth/confirmed");
      setState(data?.session ? "signedIn" : "confirmed");
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="wrap" style={{ paddingTop: 64, paddingBottom: 48, maxWidth: 620 }}>
      {state === "checking" && <p className="muted">Sto confermando l'iscrizione…</p>}

      {state === "signedIn" && (
        <>
          <h1 className="h2">Email confermata</h1>
          <p className="muted">Il tuo account è attivo e sei già dentro.</p>
          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <Link className="btn" href="/start">Comincia: misure e selfie</Link>
            <Link className="btn ghost" href="/dashboard">Il tuo spazio</Link>
          </div>
        </>
      )}

      {state === "confirmed" && (
        <>
          <h1 className="h2">Email confermata</h1>
          <p className="muted">Ora puoi accedere con la tua email e password.</p>
          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <Link className="btn" href="/">Accedi</Link>
          </div>
        </>
      )}

      {state === "error" && (
        <>
          <h1 className="h2">Non è andata</h1>
          <p className="muted">{message}</p>
          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <Link className="btn" href="/">Torna all'accesso</Link>
          </div>
        </>
      )}
    </div>
  );
}
