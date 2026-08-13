"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BrandMark from "@/components/BrandMark";
import { getUser, hasAccounts, register, resendConfirmation, signIn } from "@/lib/session";

// La schermata che si apre quando parte l'app: si entra o ci si iscrive.
// Chi è già collegato passa dritto al proprio spazio senza vederla.
export default function Accedi() {
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

  // Dopo l'accesso si va dove serve: chi non ha ancora dato misure e selfie
  // finisce nel questionario, chi li ha già dati nel suo spazio.
  function prossimaTappa() {
    try {
      const s = JSON.parse(localStorage.getItem("dress:session") || "null");
      if (s?.result?.palette?.length) return "/dashboard";
    } catch {
      /* nessuna sessione */
    }
    return "/start";
  }

  function cambia(campo) {
    return (e) => setDati((d) => ({ ...d, [campo]: e.target.value }));
  }

  async function invia(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (modo === "accedi") {
        await signIn({ email: dati.email, password: dati.password });
        router.replace(prossimaTappa());
      } else {
        const r = await register({ nome: dati.nome, name: dati.nome, email: dati.email, password: dati.password });
        setInviata({ email: dati.email, messaggio: r.message });
      }
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  if (attesa) return <div className="wrap" style={{ paddingTop: 120 }} />;

  return (
    <div
      style={{
        minHeight: "calc(100dvh - 66px)",
        display: "grid",
        placeItems: "center",
        padding: "32px 20px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 380, display: "grid", gap: 28 }}>
        <div style={{ display: "grid", gap: 14, justifyItems: "center", textAlign: "center" }}>
          <BrandMark />
          <p className="muted" style={{ margin: 0, maxWidth: "28ch" }}>
            La tua palette personale, gli outfit adatti e dove comprarli.
          </p>
        </div>

        {!hasAccounts() && (
          <p className="muted" style={{ textAlign: "center" }}>
            Gli account non sono ancora attivi su questa versione.{" "}
            <Link href="/start">Prova l’analisi colori</Link>.
          </p>
        )}

        {hasAccounts() && inviata && (
          <div className="card" style={{ padding: 20, display: "grid", gap: 12 }}>
            <strong>Controlla la posta</strong>
            <p className="muted" style={{ margin: 0 }}>
              {inviata.messaggio || `Ti abbiamo scritto a ${inviata.email}: apri il link per attivare l’account.`}
            </p>
            <button
              className="btn ghost"
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

        {hasAccounts() && !inviata && !modo && (
          <div style={{ display: "grid", gap: 12 }}>
            <button className="btn" onClick={() => setModo("iscriviti")}>Iscriviti</button>
            <button className="btn ghost" onClick={() => setModo("accedi")}>Accedi</button>
            <Link href="/" className="muted" style={{ textAlign: "center", fontSize: 13, marginTop: 4 }}>
              Guarda prima com’è fatta
            </Link>
          </div>
        )}

        {hasAccounts() && !inviata && modo && (
          <form onSubmit={invia} style={{ display: "grid", gap: 14 }}>
            {modo === "iscriviti" && (
              <label className="field">
                <span className="label">Nome</span>
                <input className="control" value={dati.nome} onChange={cambia("nome")} autoComplete="name" required />
              </label>
            )}
            <label className="field">
              <span className="label">Email</span>
              <input className="control" type="email" value={dati.email} onChange={cambia("email")} autoComplete="email" required />
            </label>
            <label className="field">
              <span className="label">Password</span>
              <input
                className="control"
                type="password"
                value={dati.password}
                onChange={cambia("password")}
                autoComplete={modo === "accedi" ? "current-password" : "new-password"}
                required
              />
            </label>

            {err ? <div style={{ color: "var(--signal)", fontSize: 14 }}>{err}</div> : null}

            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Un attimo…" : modo === "accedi" ? "Entra" : "Crea l’account"}
            </button>
            <button
              type="button"
              className="muted"
              onClick={() => { setModo(modo === "accedi" ? "iscriviti" : "accedi"); setErr(""); }}
              style={{ background: "none", border: 0, fontSize: 13, cursor: "pointer" }}
            >
              {modo === "accedi" ? "Non hai un account? Iscriviti" : "Hai già un account? Accedi"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
