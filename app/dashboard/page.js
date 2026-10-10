"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import CapiTrovati from "@/components/CapiTrovati";
import ProponiImpronta from "@/components/ProponiImpronta";
import { usaPreferiti } from "@/lib/preferiti";
import {
  apiFetch,
  getUser,
  hasAccounts,
  onAuthChange,
  resendConfirmation,
  signIn,
  signOut,
} from "@/lib/session";



export default function Dashboard() {
  const [saved, setSaved] = useState([]);
  const [user, setUser] = useState(null);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [notice, setNotice] = useState("");
  const [err, setErr] = useState("");
  // Il modulo d'accesso resta chiuso finché non lo si chiede: chi apre i
  // preferiti vuole vedere i preferiti, non una email e una password.
  const [apriAccesso, setApriAccesso] = useState(false);

  const { capi: capiPreferiti, pronto: preferitiPronti } = usaPreferiti();
  const confirmed = Boolean(user?.email_confirmed_at || user?.confirmed_at);
  const online = Boolean(user && confirmed);

  // ---- dati locali (funzionano anche senza account) -------------------
  // Le istantanee del profilo finite nell'elenco dei completi.
  //
  // Una versione vecchia le scriveva lì, con l'ora grezza come titolo:
  // "Profilo - 2026-08-14T13:22:41.802Z", in mezzo ai completi salvati. Il
  // codice che le creava non c'è più, ma quelle già salvate stanno ancora nel
  // browser di chi le ha. Si nascondono senza cancellarle: sono dati di
  // qualcun altro, e nel dubbio non si buttano.
  const eUnCompleto = (voce) =>
    Boolean(voce) && !(voce.profile && !voce.capi?.length) && !/^.+ - \d{4}-\d{2}-\d{2}T/.test(String(voce.title || ""));

  const loadLocal = useCallback(() => {
    try {
      setSaved(JSON.parse(localStorage.getItem("dress:savedItems") || "[]").filter(eUnCompleto));
    } catch {
      /* niente da recuperare */
    }
  }, []);

  useEffect(() => {
    loadLocal();
  }, [loadLocal]);

  // ---- sessione --------------------------------------------------------
  useEffect(() => {
    let alive = true;
    getUser().then((u) => alive && setUser(u));
    const stop = onAuthChange((u) => setUser(u));
    return () => {
      alive = false;
      stop();
    };
  }, []);

  // Quando si è dentro (ed email confermata) i dati arrivano dal profilo.
  useEffect(() => {
    if (!online) return;
    let alive = true;
    (async () => {
      try {
        const { profile } = await apiFetch("/api/profile/get");
        if (!alive || !profile) return;
        setSaved(profile.saved_outfits || []);
      } catch (e) {
        setErr(e.message);
      }
    })();
    return () => {
      alive = false;
    };
  }, [online]);

  // ---- preferiti e outfit ---------------------------------------------
  function persistLocal(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* spazio esaurito o modalità privata */
    }
  }


  async function saveOutfit(outfit) {
    if (!online) {
      const next = [outfit, ...saved].slice(0, 50);
      setSaved(next);
      persistLocal("dress:savedItems", next);
      return;
    }
    try {
      const data = await apiFetch("/api/outfits/add", { method: "POST", body: { outfit } });
      setSaved(data.saved_outfits || []);
      persistLocal("dress:savedItems", data.saved_outfits || []);
    } catch (e) {
      setErr(e.message);
    }
  }

  async function removeOutfit(outfit, index) {
    const id = outfit?.id || outfit?._id || outfit?.uid;
    if (!online || !id) {
      const next = saved.filter((_, i) => i !== index);
      setSaved(next);
      persistLocal("dress:savedItems", next);
      return;
    }
    try {
      const data = await apiFetch("/api/outfits/remove", { method: "POST", body: { outfitId: id } });
      setSaved(data.saved_outfits || []);
      persistLocal("dress:savedItems", data.saved_outfits || []);
    } catch (e) {
      setErr(e.message);
    }
  }

  // ---- account ----------------------------------------------------------
  async function onSignIn(e) {
    e.preventDefault();
    setErr("");
    setNotice("");
    try {
      const u = await signIn({ email: emailInput, password: passwordInput });
      setUser(u);
      setPasswordInput("");
    } catch (e) {
      setErr(e.message);
      if (e.needsConfirmation) setNotice("Non hai ricevuto la mail? Puoi fartela rimandare qui sotto.");
    }
  }

  async function onResend() {
    setErr("");
    try {
      const data = await resendConfirmation(emailInput || user?.email);
      setNotice(data.message);
    } catch (e) {
      setErr(e.message);
    }
  }

  async function onSignOut() {
    await signOut();
    setUser(null);
    loadLocal();
  }


  // L'account: in cima se devi ancora entrare, in fondo se sei già dentro.
  // Le impostazioni non sono la prima cosa che uno vuole vedere di casa sua.
  const sezioneAccount = (
    <section className="card" style={{ padding: 16 }}>

      {!hasAccounts() && (
        <p className="muted">
          Gli account non sono configurati su questa installazione: i tuoi dati restano solo in questo
          browser.
        </p>
      )}

      {hasAccounts() && !user && !apriAccesso && (
        <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <p className="muted" style={{ margin: 0 }}>Per ora sono salvati solo su questo telefono.</p>
          <button className="btn ghost" type="button" onClick={() => setApriAccesso(true)}>Accedi</button>
        </div>
      )}

      {hasAccounts() && !user && apriAccesso && (
        <>
          <p className="muted" style={{ marginTop: 0 }}>Accedi per ritrovare palette, preferiti e completi su qualsiasi dispositivo.</p>
          <form onSubmit={onSignIn} style={{ display: "grid", gap: 8, maxWidth: 360, marginTop: 12 }}>
            <input
              className="control"
              type="email"
              placeholder="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              autoComplete="email"
            />
            <input
              className="control"
              type="password"
              placeholder="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              autoComplete="current-password"
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" type="submit">Accedi</button>
              <Link className="btn ghost" href="/start">Iscriviti</Link>
            </div>
          </form>
          <button
            type="button"
            onClick={onResend}
            style={{ marginTop: 12, padding: 0, background: "none", border: 0, font: "inherit", fontSize: 13, color: "var(--greige)", textDecoration: "underline", cursor: "pointer" }}
          >
            Non ti è arrivata la mail di conferma?
          </button>
        </>
      )}

      {user && !confirmed && (
        <>
          <p className="muted">
            Manca solo la conferma: abbiamo mandato un link a <strong>{user.email}</strong>. Finché non lo apri
            i dati non vengono salvati online.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn ghost" onClick={onResend}>Rimanda la mail</button>
            <button className="btn ghost" onClick={onSignOut}>Esci</button>
          </div>
        </>
      )}

    </section>
  );

  return (
    <div className="wrap" style={{ paddingTop: 48, paddingBottom: 40, maxWidth: 960 }}>
      <h1 className="h2" style={{ margin: 0 }}>Preferiti</h1>
      <p className="muted" style={{ marginTop: 6 }}>
        I capi col cuore e i completi che hai salvato.
      </p>

      {err ? <p style={{ color: "var(--signal)", marginTop: 12 }}>{err}</p> : null}
      {notice ? <p className="muted" style={{ marginTop: 12 }}>{notice}</p> : null}

      {online ? null : <div style={{ marginTop: 24 }}>{sezioneAccount}</div>}

      {/* A chi è già dentro e non l'ha ancora attivato. Si mostra una volta. */}
      <ProponiImpronta />

      {/* ---------------- I capi messi da parte ---------------- */}
      <section style={{ marginTop: 40 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h2 className="h3" style={{ margin: 0 }}>Capi col cuore</h2>
          {capiPreferiti.length ? <span className="muted" style={{ fontSize: 13 }}>{capiPreferiti.length}</span> : null}
        </div>

        {capiPreferiti.length ? (
          <div style={{ marginTop: 14 }}>
            <CapiTrovati capi={capiPreferiti} />
          </div>
        ) : (
          <p className="muted" style={{ marginTop: 10 }}>
            {preferitiPronti
              ? "Nessun capo salvato. Tocca il cuore su un capo e lo ritrovi qui."
              : "Un attimo…"}
          </p>
        )}
      </section>

      {/* ---------------- Completi salvati ---------------- */}
      <section style={{ marginTop: 40 }}>
        <h2 className="h3">Completi salvati</h2>
        {saved.length === 0 ? (
          <p className="muted">Nessun completo salvato. Quelli che ti piacciono in Completi li ritrovi qui.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {saved.map((s, i) => (
              <div key={s.id || i} className="card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {s.image ? (
                  <img src={s.image} alt="capo" style={{ width: 72, height: 96, objectFit: "cover" }} />
                ) : null}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{s.title || "Cosa salvata"}</div>
                  <div className="muted" style={{ fontSize: 13 }}>{s.note || ""}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {online && !s.saved_at ? (
                    <button className="btn ghost" onClick={() => saveOutfit(s)}>Salva online</button>
                  ) : null}
                  <button className="btn ghost" onClick={() => removeOutfit(s, i)}>Rimuovi</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
