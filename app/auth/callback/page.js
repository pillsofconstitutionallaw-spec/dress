"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { apiFetch } from "@/lib/session";
import { prossimaTappa, profiloCompleto } from "@/lib/prossimaTappa";

// Dove atterra chi torna da Google.
//
// Non c'è niente da leggere qui: è uno smistamento. O il profilo è completo e
// si entra, o mancano i due dati che Google non sa dare e si passa da
// /auth/completa.
export default function Callback() {
  const router = useRouter();
  const [errore, setErrore] = useState("");

  useEffect(() => {
    let vivo = true;

    (async () => {
      const url = new global.URL(window.location.href);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const guasto = url.searchParams.get("error_description") || hash.get("error_description");
      if (guasto) {
        if (vivo) setErrore(decodeURIComponent(guasto));
        return;
      }

      const sb = getSupabaseBrowser();
      if (!sb) {
        if (vivo) setErrore("Gli account non sono configurati su questa installazione.");
        return;
      }

      // Il codice nell'URL lo scambia il client da solo; getSession() aspetta
      // che abbia finito.
      let { data } = await sb.auth.getSession();

      const code = url.searchParams.get("code");
      if (!data?.session && code) {
        const { data: scambio, error } = await sb.auth.exchangeCodeForSession(code);
        if (!vivo) return;
        if (error) {
          setErrore(
            /expired|invalid|not found|used/i.test(error.message || "")
              ? "L'accesso è scaduto. Riprova dalla schermata iniziale."
              : `Non sono riuscito a completare l'accesso: ${error.message}`,
          );
          return;
        }
        data = scambio;
      }

      if (!vivo) return;
      window.history.replaceState({}, "", "/auth/callback");

      if (!data?.session) {
        setErrore("L'accesso non è andato a buon fine. Riprova dalla schermata iniziale.");
        return;
      }

      // Profilo completo? Se manca il nome utente o la data di nascita si
      // passa di là prima di entrare.
      try {
        const { profile } = await apiFetch("/api/profile/get");
        if (!vivo) return;
        router.replace(profiloCompleto(profile) ? prossimaTappa() : "/auth/completa");
      } catch {
        // Il profilo non si legge (database irraggiungibile, regole, rete):
        // mandiamo a completare, che è il percorso che ripara da solo.
        if (vivo) router.replace("/auth/completa");
      }
    })();

    return () => {
      vivo = false;
    };
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        alignContent: "start",
        justifyItems: "center",
        padding: "max(24px, env(safe-area-inset-top)) 24px 32px",
        maxWidth: 420,
        margin: "0 auto",
        width: "100%",
      }}
    >
      <div style={{ marginTop: "16vh" }}><BrandMark grande /></div>

      <div style={{ width: "100%", marginTop: 40, display: "grid", gap: 12, textAlign: "center" }}>
        {errore ? (
          <>
            <strong style={{ fontSize: 17 }}>Non è andata</strong>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>{errore}</p>
            <Link className="btn-app" href="/">Torna all&apos;accesso</Link>
          </>
        ) : (
          <p className="muted" style={{ margin: 0 }}>Un attimo…</p>
        )}
      </div>
    </div>
  );
}
