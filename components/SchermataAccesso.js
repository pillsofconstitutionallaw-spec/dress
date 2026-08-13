"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BrandMark from "@/components/BrandMark";
import ModuloIscrizione from "@/components/ModuloIscrizione";
import { getUser, hasAccounts, recuperaPassword, register, resendConfirmation, signIn } from "@/lib/session";

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
  const [recupero, setRecupero] = useState("");
  const [inviandoRecupero, setInviandoRecupero] = useState(false);

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
      await signIn({ email: dati.email, password: dati.password });
      router.replace(prossimaTappa());
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  // Mentre aspetti la mail, controlliamo ogni pochi secondi se l'hai
  // confermata: il link si apre spesso in un'altra scheda o sul telefono, e
  // senza questo la schermata resterebbe ferma su "controlla la posta".
  useEffect(() => {
    if (!inviata) return;
    const spia = setInterval(async () => {
      const u = await getUser().catch(() => null);
      if (u?.email_confirmed_at || u?.confirmed_at) {
        clearInterval(spia);
        router.replace(prossimaTappa());
      }
    }, 4000);
    return () => clearInterval(spia);
  }, [inviata, router]);

  // L'iscrizione la raccoglie il modulo dedicato: nome, cognome, nome utente,
  // foto, data di nascita e una password che sta in piedi.
  async function iscriviti(campi) {
    const r = await register(campi);
    setInviata({ email: campi.email, messaggio: r.message });
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
            <button
              type="button"
              onClick={() => { setInviata(null); setModo("accedi"); }}
              className="muted"
              style={{ background: "none", border: 0, fontSize: 14, padding: 10, cursor: "pointer" }}
            >
              Ho già confermato, fammi entrare
            </button>
          </div>
        )}

        {!attesa && hasAccounts() && !inviata && !modo && (
          <div className="entra-morbido" style={{ display: "grid", gap: 12, animationDelay: "600ms" }}>
            <button className="btn-app" onClick={() => setModo("accedi")}>Accedi</button>
            <button className="btn-app chiaro" onClick={() => setModo("iscriviti")}>Iscriviti</button>
          </div>
        )}

        {!attesa && hasAccounts() && !inviata && modo === "iscriviti" && (
          <ModuloIscrizione onIscritto={iscriviti} onIndietro={() => setModo(null)} />
        )}

        {!attesa && hasAccounts() && !inviata && modo === "accedi" && (
          <form onSubmit={invia} className="entra-morbido" style={{ display: "grid", gap: 10 }}>
            <input className="control-app" type="text" placeholder="Email o nome utente" value={dati.email} onChange={cambia("email")} autoComplete="username" required />
            <input
              className="control-app"
              type="password"
              placeholder="Password"
              value={dati.password}
              onChange={cambia("password")}
              autoComplete="current-password"
              required
            />

            {err ? <p style={{ color: "var(--signal)", fontSize: 14, margin: "2px 4px" }}>{err}</p> : null}

            <button className="btn-app" type="submit" disabled={busy} style={{ marginTop: 2 }}>
              {busy ? "Un attimo…" : "Entra"}
            </button>

            {recupero ? (
              <p className="muted" style={{ fontSize: 13, textAlign: "center", margin: "4px 8px" }}>{recupero}</p>
            ) : (
              <button
                type="button"
                disabled={inviandoRecupero}
                onClick={async () => {
                  setErr("");
                  // Se l'email manca la chiediamo, invece di rimproverare chi
                  // non l'ha scritta: il tasto deve fare qualcosa, sempre.
                  let dove = dati.email.trim();
                  if (!dove) {
                    dove = (window.prompt("A quale indirizzo mandiamo il link per la nuova password?") || "").trim();
                    if (!dove) return;
                    setDati((d) => ({ ...d, email: dove }));
                  }
                  setInviandoRecupero(true);
                  try {
                    const r = await recuperaPassword(dove);
                    setRecupero(r.message);
                  } catch (e) {
                    setErr(e.message);
                  }
                  setInviandoRecupero(false);
                }}
                className="muted"
                style={{ background: "none", border: 0, fontSize: 13, padding: 10, cursor: "pointer", textDecoration: "underline" }}
              >
                {inviandoRecupero ? "Mando la mail…" : "Ho dimenticato la password"}
              </button>
            )}
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
