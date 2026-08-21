"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BrandMark from "@/components/BrandMark";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { controllaPassword } from "@/lib/password";

// Dove atterra il link "ho dimenticato la password".
//
// Supabase apre una sessione temporanea di recupero: da lì si può cambiare
// la password senza conoscere quella vecchia — ed è tutto quello che questa
// sessione permette di fare.
export default function Reimposta() {
  const router = useRouter();
  const [stato, setStato] = useState("controllo"); // controllo | pronta | scaduta | fatta
  const [perche, setPerche] = useState("");
  const [password, setPassword] = useState("");
  const [ripeti, setRipeti] = useState("");
  const [vedi, setVedi] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const forza = controllaPassword(password);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const sb = getSupabaseBrowser();
      if (!sb) return vivo && setStato("scaduta");

      const url = new global.URL(window.location.href);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const guasto = url.searchParams.get("error_description") || hash.get("error_description");
      if (guasto) {
        if (!vivo) return;
        setPerche(decodeURIComponent(guasto));
        return setStato("scaduta");
      }

      // Il codice nell'URL lo scambia da solo il client (detectSessionInUrl),
      // e getSession() aspetta che abbia finito.
      let { data } = await sb.auth.getSession();

      // Se la sessione non c'è ma un codice c'era, lo scambio è fallito.
      // Prima il tentativo stava dentro un catch vuoto: qualunque cosa fosse
      // andata storta, l'utente leggeva "il link non è più valido" — anche
      // quando il link era buono e il problema era un altro.
      const code = url.searchParams.get("code");
      if (!data?.session && code) {
        const { data: scambio, error } = await sb.auth.exchangeCodeForSession(code);
        if (!vivo) return;
        if (error) setPerche(error.message || "");
        data = scambio;
      }

      if (!vivo) return;
      window.history.replaceState({}, "", "/auth/reimposta");
      setStato(data?.session ? "pronta" : "scaduta");
    })();
    return () => {
      vivo = false;
    };
  }, []);

  async function salva(e) {
    e.preventDefault();
    setErr("");
    if (!forza.ok) return setErr(forza.messaggio);
    if (password !== ripeti) return setErr("Le due password non coincidono.");

    setBusy(true);
    try {
      const sb = getSupabaseBrowser();
      const { error } = await sb.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      setStato("fatta");
      setTimeout(() => router.replace("/start"), 1400);
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

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
      <div style={{ marginTop: "14vh" }}><BrandMark grande /></div>

      <div style={{ width: "100%", marginTop: 40, display: "grid", gap: 12 }}>
        {stato === "controllo" && <p className="muted" style={{ textAlign: "center" }}>Un attimo…</p>}

        {stato === "scaduta" && (
          <div style={{ display: "grid", gap: 14, textAlign: "center" }}>
            <strong style={{ fontSize: 17 }}>Il link non è più valido</strong>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>
              I link per la password scadono in fretta, ed è giusto così. Chiedine uno nuovo
              dalla schermata d’accesso.
            </p>
            {perche ? (
              <p className="muted" style={{ margin: 0, fontSize: 12, opacity: 0.75 }}>
                Dettaglio tecnico: {perche}
              </p>
            ) : null}
            <button className="btn-app" onClick={() => router.replace("/")}>Torna all’accesso</button>
          </div>
        )}

        {stato === "fatta" && (
          <div style={{ display: "grid", gap: 12, textAlign: "center" }}>
            <strong style={{ fontSize: 17 }}>Password cambiata</strong>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>Ti stiamo portando dentro…</p>
          </div>
        )}

        {stato === "pronta" && (
          <form onSubmit={salva} className="entra-morbido" style={{ display: "grid", gap: 10 }}>
            <p className="muted" style={{ textAlign: "center", margin: "0 0 6px", fontSize: 14 }}>
              Scegli la tua nuova password.
            </p>

            <div style={{ position: "relative" }}>
              <input
                className="control-app"
                type={vedi ? "text" : "password"}
                placeholder="Nuova password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                style={{ paddingRight: 64 }}
              />
              <button
                type="button"
                onClick={() => setVedi((v) => !v)}
                className="muted"
                style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: 0, fontSize: 13, padding: 10, cursor: "pointer" }}
              >
                {vedi ? "Nascondi" : "Vedi"}
              </button>
            </div>

            {password ? (
              <div style={{ display: "grid", gap: 6, margin: "-2px 4px 0" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      style={{
                        height: 3,
                        borderRadius: 2,
                        background: i < forza.forza ? (forza.ok ? "var(--ink)" : "var(--greige)") : "var(--line)",
                        transition: "background 200ms ease",
                      }}
                    />
                  ))}
                </div>
                <span className="muted" style={{ fontSize: 12 }}>{forza.messaggio}</span>
              </div>
            ) : null}

            <input
              className="control-app"
              type={vedi ? "text" : "password"}
              placeholder="Ripeti la password"
              value={ripeti}
              onChange={(e) => setRipeti(e.target.value)}
              autoComplete="new-password"
              required
            />

            {err ? <p style={{ color: "var(--signal)", fontSize: 14, margin: "2px 4px" }}>{err}</p> : null}

            <button className="btn-app" type="submit" disabled={busy} style={{ marginTop: 4 }}>
              {busy ? "Un attimo…" : "Salva la nuova password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
