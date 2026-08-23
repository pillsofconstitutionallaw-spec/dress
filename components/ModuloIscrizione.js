"use client";

import { useMemo, useRef, useState } from "react";
import CampoData from "@/components/CampoData";
import { fileToDataUrl } from "@/lib/img";
import { controllaDataNascita, controllaPassword, controllaUsername } from "@/lib/password";

// L'iscrizione: chi sei e come entri. Le misure vengono dopo, nel questionario.
export default function ModuloIscrizione({ onIscritto, onIndietro }) {
  const [d, setD] = useState({
    nome: "", cognome: "", username: "", email: "", password: "", dataNascita: "",
  });
  const [avatar, setAvatar] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [vediPassword, setVediPassword] = useState(false);
  const fileRef = useRef(null);

  const cambia = (campo) => (e) => setD((v) => ({ ...v, [campo]: e.target.value }));

  const forza = useMemo(() => controllaPassword(d.password), [d.password]);
  const utente = useMemo(() => (d.username ? controllaUsername(d.username) : { ok: true, messaggio: "" }), [d.username]);

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
    if (!forza.ok) return setErr(forza.messaggio);
    const eta = controllaDataNascita(d.dataNascita);
    if (!eta.ok) return setErr(eta.messaggio);

    setBusy(true);
    try {
      await onIscritto({ ...d, avatar });
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  return (
    <form onSubmit={invia} className="entra-morbido" style={{ display: "grid", gap: 10, width: "100%" }}>
      {/* foto del profilo */}
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
        <span className="muted" style={{ fontSize: 12 }}>{avatar ? "Tocca per cambiarla" : "Foto profilo (facoltativa)"}</span>
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

      <input className="control-app" type="email" placeholder="Email" value={d.email} onChange={cambia("email")} autoComplete="email" required />

      <div style={{ position: "relative" }}>
        <input
          className="control-app"
          type={vediPassword ? "text" : "password"}
          placeholder="Password"
          value={d.password}
          onChange={cambia("password")}
          autoComplete="new-password"
          required
          style={{ paddingRight: 64 }}
        />
        <button
          type="button"
          onClick={() => setVediPassword((v) => !v)}
          className="muted"
          style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: 0, fontSize: 13, padding: 10, cursor: "pointer" }}
        >
          {vediPassword ? "Nascondi" : "Vedi"}
        </button>
      </div>

      {/* forza della password: quattro tacche, e cosa manca */}
      {d.password ? (
        <div style={{ display: "grid", gap: 6, margin: "-2px 4px 0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: 3,
                  background: i < forza.forza ? (forza.ok ? "var(--ink)" : "var(--greige)") : "var(--line)",
                  transition: "background 200ms ease",
                }}
              />
            ))}
          </div>
          <span className="muted" style={{ fontSize: 12 }}>{forza.messaggio}</span>
        </div>
      ) : null}

      <CampoData valore={d.dataNascita} onChange={(v) => setD((x) => ({ ...x, dataNascita: v }))} />

      {err ? <p style={{ color: "var(--signal)", fontSize: 14, margin: "2px 4px" }}>{err}</p> : null}

      <button className="btn-app" type="submit" disabled={busy} style={{ marginTop: 4 }}>
        {busy ? "Un attimo…" : "Avanti"}
      </button>
      <button type="button" onClick={onIndietro} className="muted" style={{ background: "none", border: 0, fontSize: 14, padding: 10, cursor: "pointer" }}>
        Indietro
      </button>
    </form>
  );
}
