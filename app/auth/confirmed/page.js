"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { prossimaTappa } from "@/lib/prossimaTappa";

// Pagina di atterraggio del link contenuto nella mail di conferma.
// Supabase rimanda qui dopo aver verificato l'indirizzo.
export default function Confirmed() {
  const router = useRouter();
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

      // Il client legge da solo il codice dall'URL (detectSessionInUrl) e lo
      // scambia con una sessione. getSession() aspetta che quel lavoro sia
      // finito, quindi qui la sessione o c'è o non ci sarà.
      let { data } = await sb.auth.getSession();

      // Se non c'è ma un codice nell'URL c'era, lo scambio è fallito.
      // Prima questo tentativo stava dentro un catch vuoto: falliva in
      // silenzio e la pagina concludeva "non sei entrato" senza dire perché.
      // Adesso il motivo si legge.
      const code = url.searchParams.get("code");
      if (!data?.session && code) {
        const { data: scambio, error } = await sb.auth.exchangeCodeForSession(code);
        if (!alive) return;
        if (error) {
          setState("error");
          setMessage(
            /expired|invalid|not found|used/i.test(error.message || "")
              ? "Il link è scaduto o è già stato usato. Chiedine uno nuovo dalla pagina di accesso."
              : `Non sono riuscito a completare l'accesso: ${error.message}`,
          );
          return;
        }
        data = scambio;
      }

      if (!alive) return;
      // Ripulisce i token dalla barra degli indirizzi.
      window.history.replaceState({}, "", "/auth/confirmed");

      if (data?.session) {
        // Sessione attiva: si entra e basta. Un altro tasto da premere qui
        // sarebbe solo un ostacolo fra l'utente e l'app.
        setState("signedIn");
        setTimeout(() => router.replace(prossimaTappa()), 900);
        return;
      }
      setState("confirmed");
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  return (
    <div className="wrap" style={{ paddingTop: 64, paddingBottom: 48, maxWidth: 620 }}>
      {state === "checking" && <p className="muted">Sto confermando l'iscrizione…</p>}

      {state === "signedIn" && (
        <>
          <h1 className="h2">Email confermata</h1>
          <p className="muted">Ti stiamo portando dentro…</p>
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
