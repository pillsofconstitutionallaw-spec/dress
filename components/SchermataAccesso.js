"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BrandMark from "@/components/BrandMark";
import ModuloIscrizione from "@/components/ModuloIscrizione";
import { accessoAttivo, entraCon, getUser, hasAccounts, recuperaPassword, register, resendConfirmation, signIn } from "@/lib/session";
import { prossimaTappa } from "@/lib/prossimaTappa";

// La prima schermata: il marchio e due tasti. Niente altro.
// Chi ha già una sessione salvata non la vede nemmeno.
export default function SchermataAccesso() {
  const router = useRouter();
  const [modo, setModo] = useState(null); // null | "accedi" | "iscriviti"
  const [dati, setDati] = useState({ nome: "", identificativo: "", password: "" });
  const [attesa, setAttesa] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [inviata, setInviata] = useState(null);
  const [recupero, setRecupero] = useState("");
  const [inviandoRecupero, setInviandoRecupero] = useState(false);
  const [conGoogle, setConGoogle] = useState(false);
  // Finché non si sa, il tasto Google non si mostra: comparire e poi sparire
  // è peggio che comparire un attimo dopo.
  const [googleAcceso, setGoogleAcceso] = useState(null);

  useEffect(() => {
    if (!hasAccounts()) return;
    let vivo = true;
    accessoAttivo("google")
      .then((ok) => vivo && setGoogleAcceso(ok))
      .catch(() => vivo && setGoogleAcceso(false));
    return () => {
      vivo = false;
    };
  }, []);

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

  const cambia = (campo) => (e) => setDati((d) => ({ ...d, [campo]: e.target.value }));

  async function invia(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await signIn({ identificativo: dati.identificativo, password: dati.password });
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
            {/* Un tasto solo per il primo ingresso e per tutti quelli dopo:
                OAuth non distingue "iscriviti" da "accedi".
                Compare solo se il provider è davvero acceso su Supabase: un
                tasto che porta a una pagina di errore è peggio di nessun
                tasto, e il giorno in cui verrà acceso ricompare da solo. */}
            {googleAcceso ? (
            <button
              className="btn-app chiaro"
              disabled={conGoogle}
              onClick={async () => {
                setErr("");
                setConGoogle(true);
                try {
                  await entraCon("google");
                  // Da qui il browser se ne va su Google: se torniamo indietro
                  // è perché qualcosa non è partito.
                } catch (e) {
                  setErr(e.message);
                  setConGoogle(false);
                }
              }}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
            >
              <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
                <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
              </svg>
              {conGoogle ? "Ti porto su Google…" : "Continua con Google"}
            </button>
            ) : null}

            {googleAcceso ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12, margin: "2px 0" }}>
                <span style={{ height: 1, background: "var(--line)" }} />
                <span className="muted" style={{ fontSize: 12 }}>oppure</span>
                <span style={{ height: 1, background: "var(--line)" }} />
              </div>
            ) : null}

            <button className="btn-app" onClick={() => setModo("accedi")}>Accedi</button>
            <button className="btn-app chiaro" onClick={() => setModo("iscriviti")}>Iscriviti</button>

            {err ? <p style={{ color: "var(--signal)", fontSize: 14, margin: "2px 4px", textAlign: "center" }}>{err}</p> : null}
          </div>
        )}

        {!attesa && hasAccounts() && !inviata && modo === "iscriviti" && (
          <ModuloIscrizione onIscritto={iscriviti} onIndietro={() => setModo(null)} />
        )}

        {!attesa && hasAccounts() && !inviata && modo === "accedi" && (
          <form onSubmit={invia} className="entra-morbido" style={{ display: "grid", gap: 10 }}>
            <input className="control-app" type="text" placeholder="Email o nome utente" value={dati.identificativo} onChange={cambia("identificativo")} autoComplete="username" required />
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
                  // La mail può partire solo verso un indirizzo. Se qui sopra
                  // c'è un nome utente non ci serve: lo chiediamo, invece di
                  // rimproverare chi non l'ha scritto. Il tasto deve fare
                  // qualcosa, sempre.
                  const scritto = dati.identificativo.trim();
                  let dove = scritto.includes("@") ? scritto : "";
                  if (!dove) {
                    dove = (window.prompt("A quale indirizzo mandiamo il link per la nuova password?") || "").trim();
                    if (!dove) return;
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
