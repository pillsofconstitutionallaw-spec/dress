"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BrandMark from "@/components/BrandMark";
import CampoData from "@/components/CampoData";
import { fileToDataUrl } from "@/lib/img";
import { controllaDataNascita, controllaUsername } from "@/lib/password";
import { completaProfilo, getUser } from "@/lib/session";
import { prossimaTappa } from "@/lib/prossimaTappa";

// Manca poco: i due dati che Google non sa dare.
//
// Google restituisce email, nome e foto. Nome utente e data di nascita no, e
// senza quelli l'app non sa come chiamarti né se hai l'età per iscriverti.
// Nessun campo password: un account Google non ne ha una.
//
// Non c'è "Indietro" apposta: chi è qui ha una sessione valida e un profilo a
// metà, e l'unica uscita è in avanti.
export default function Completa() {
  const router = useRouter();
  const [pronto, setPronto] = useState(false);
  const [d, setD] = useState({ nome: "", cognome: "", username: "", dataNascita: "" });
  const [avatar, setAvatar] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  const utente = useMemo(
    () => (d.username ? controllaUsername(d.username) : { ok: true, messaggio: "" }),
    [d.username],
  );

  // Quello che Google ha già dato lo scriviamo noi nei campi: chiedere di
  // ribattere il proprio nome quando lo sappiamo già è solo scortesia.
  useEffect(() => {
    let vivo = true;
    (async () => {
      const u = await getUser().catch(() => null);
      if (!vivo) return;
      if (!u) {
        router.replace("/");
        return;
      }
      const meta = u.user_metadata || {};
      const intero = String(meta.full_name || meta.name || "").trim();
      const pezzi = intero.split(/\s+/).filter(Boolean);
      setD((v) => ({
        ...v,
        nome: meta.name && !meta.full_name ? meta.name : pezzi[0] || "",
        cognome: meta.cognome || pezzi.slice(1).join(" ") || "",
        username: meta.username || "",
        dataNascita: meta.data_nascita || "",
      }));
      setAvatar(meta.avatar || meta.avatar_url || null);
      setPronto(true);
    })();
    return () => {
      vivo = false;
    };
  }, [router]);

  const cambia = (campo) => (e) => setD((v) => ({ ...v, [campo]: e.target.value }));

  async function scegliFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setAvatar(await fileToDataUrl(file, 320));
    } catch {
      setErr("Non riesco a leggere questa immagine.");
    }
  }

  async function invia(e) {
    e.preventDefault();
    setErr("");

    if (!utente.ok) return setErr(`Nome utente: ${utente.messaggio}`);
    const eta = controllaDataNascita(d.dataNascita);
    if (!eta.ok) return setErr(eta.messaggio);

    setBusy(true);
    try {
      // L'avatar di Google è un indirizzo web, non un'immagine incorporata:
      // si manda com'è, senza gonfiare la richiesta.
      await completaProfilo({ ...d, avatar });
      router.replace(prossimaTappa());
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
      <div style={{ marginTop: "12vh" }}><BrandMark grande /></div>

      <div style={{ width: "100%", marginTop: 36 }}>
        {!pronto ? (
          <p className="muted" style={{ textAlign: "center" }}>Un attimo…</p>
        ) : (
          <form onSubmit={invia} className="entra-morbido" style={{ display: "grid", gap: 10 }}>
            <div style={{ textAlign: "center", marginBottom: 6 }}>
              <strong style={{ fontSize: 17 }}>Manca poco</strong>
              <p className="muted" style={{ margin: "6px 0 0", fontSize: 14 }}>
                Google ci ha detto come ti chiami. Il resto lo scegli tu.
              </p>
            </div>

            <div style={{ display: "grid", justifyItems: "center", gap: 8, marginBottom: 6 }}>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Scegli l'immagine del profilo"
                style={{
                  width: 84, height: 84, overflow: "hidden",
                  border: avatar ? "none" : "1px dashed var(--line)",
                  background: avatar ? `center/cover url(${avatar})` : "var(--stone)",
                  display: "grid", placeItems: "center", cursor: "pointer", padding: 0,
                }}
              >
                {!avatar && (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--greige)" strokeWidth="1.4" strokeLinecap="round">
                    <circle cx="12" cy="9" r="3.4" />
                    <path d="M5 20c0-3.2 3.1-5.2 7-5.2s7 2 7 5.2" />
                    <rect x="3" y="4" width="18" height="16" rx="3" />
                  </svg>
                )}
              </button>
              <span className="muted" style={{ fontSize: 12 }}>Tocca per cambiare la foto</span>
              <input ref={fileRef} type="file" accept="image/*" onChange={scegliFoto} style={{ display: "none" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input className="control-app" placeholder="Nome" value={d.nome} onChange={cambia("nome")} autoComplete="given-name" required />
              <input className="control-app" placeholder="Cognome" value={d.cognome} onChange={cambia("cognome")} autoComplete="family-name" required />
            </div>

            <input
              className="control-app"
              placeholder="Nome utente"
              value={d.username}
              onChange={cambia("username")}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
            {d.username && !utente.ok ? (
              <p className="muted" style={{ fontSize: 12, margin: "-4px 4px 0", color: "var(--signal)" }}>{utente.messaggio}</p>
            ) : null}

            <CampoData valore={d.dataNascita} onChange={(v) => setD((x) => ({ ...x, dataNascita: v }))} />

            {err ? <p style={{ color: "var(--signal)", fontSize: 14, margin: "2px 4px" }}>{err}</p> : null}

            <button className="btn-app" type="submit" disabled={busy} style={{ marginTop: 4 }}>
              {busy ? "Un attimo…" : "Entra"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
