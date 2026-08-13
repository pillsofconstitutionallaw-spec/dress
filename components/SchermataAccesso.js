"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BrandMark from "@/components/BrandMark";
import { getUser, hasAccounts, register, resendConfirmation, signIn } from "@/lib/session";

// La prima schermata: il marchio e due tasti. Niente altro.
// Chi ha già una sessione salvata non la vede nemmeno.
export default function SchermataAccesso() {
  const router = useRouter();
  const [modo, setModo] = useState(null); // null | "accedi" | "iscriviti"
  const [dati, setDati] = useState({ nome: "", email: "", password: "" });
  const [attesa, setAttesa] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [inviata, setInviata] = useState(null);

  useEffect(() => {
    if (!hasAccounts()) {
      setAttesa(false);
      return;
    }
    getUser()
      .then((u) => {
        if (u?.email_confirmed_at || u?.confirmed_at) router.replace(prossimaTappa());
        else setAttesa(false);
      })
      .catch(() => setAttesa(false));
  }, [router]);

  // Chi non ha ancora dato misure e selfie va al questionario, gli altri
  // direttamente nel guardaroba.
  function prossimaTappa() {
    try {
      const s = JSON.parse(localStorage.getItem("dress:session") || "null");
      if (s?.result?.palette?.length) return "/dashboard";
    } catch {
      /* nessuna sessione */
    }
    return "/start";
  }

  const cambia = (campo) => (e) => setDati((d) => ({ ...d, [campo]: e.target.value }));

  async function invia(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (modo === "accedi") {
        await signIn({ email: dati.email, password: dati.password });
        router.replace(prossimaTappa());
      } else {
        const r = await register({ name: dati.nome, email: dati.email, password: dati.password });
        setInviata({ email: dati.email, messaggio: r.message });
      }
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
        padding: "max(24px, env(safe-area-inset-top)) 24px max(28px, env(safe-area-inset-bottom))",
        maxWidth: 420,
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* il marchio in alto, al centro */}
      <div style={{ display: "grid", justifyItems: "center", gap: 14, marginTop: "16vh" }}>
        <BrandMark grande animato />
        <p className="muted entra-morbido" style={{ margin: 0, textAlign: "center", maxWidth: "26ch", animationDelay: "520ms" }}>
          I tuoi colori, i tuoi outfit, dove comprarli.
        </p>
      </div>

      {/* i comandi, subito sotto */}
      <div style={{ display: "grid", gap: 12, width: "100%", marginTop: 44 }}>
        {attesa && null}

        {!attesa && !hasAccounts() && (
          <button className="btn-app" onClick={() => router.push("/start")}>Comincia</button>
        )}

        {!attesa && hasAccounts() && inviata && (
          <div className="entra-morbido" style={{ display: "grid", gap: 14, textAlign: "center" }}>
            <strong style={{ fontSize: 17 }}>Controlla la posta</strong>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>
              {inviata.messaggio || `Ti abbiamo scritto a ${inviata.email}. Apri il link per attivare l’account.`}
            </p>
            <button
              className="btn-app chiaro"
              onClick={async () => {
                try {
                  const r = await resendConfirmation(inviata.email);
                  setInviata((p) => ({ ...p, messaggio: r.message }));
                } catch (e) {
                  setErr(e.message);
                }
              }}
            >
              Rimanda la mail
            </button>
          </div>
        )}

        {!attesa && hasAccounts() && !inviata && !modo && (
          <div className="entra-morbido" style={{ display: "grid", gap: 12, animationDelay: "600ms" }}>
            <button className="btn-app" onClick={() => setModo("accedi")}>Accedi</button>
            <button className="btn-app chiaro" onClick={() => setModo("iscriviti")}>Iscriviti</button>
          </div>
        )}

        {!attesa && hasAccounts() && !inviata && modo && (
          <form onSubmit={invia} className="entra-morbido" style={{ display: "grid", gap: 10 }}>
            {modo === "iscriviti" && (
              <input className="control-app" placeholder="Nome" value={dati.nome} onChange={cambia("nome")} autoComplete="name" required />
            )}
            <input className="control-app" type="email" placeholder="Email" value={dati.email} onChange={cambia("email")} autoComplete="email" required />
            <input
              className="control-app"
              type="password"
              placeholder="Password"
              value={dati.password}
              onChange={cambia("password")}
              autoComplete={modo === "accedi" ? "current-password" : "new-password"}
              required
            />

            {err ? <p style={{ color: "var(--signal)", fontSize: 14, margin: "2px 4px" }}>{err}</p> : null}

            <button className="btn-app" type="submit" disabled={busy} style={{ marginTop: 2 }}>
              {busy ? "Un attimo…" : modo === "accedi" ? "Entra" : "Crea l’account"}
            </button>
            <button
              type="button"
              onClick={() => { setModo(null); setErr(""); }}
              className="muted"
              style={{ background: "none", border: 0, fontSize: 14, padding: 10, cursor: "pointer" }}
            >
              Indietro
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
