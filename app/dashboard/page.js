"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fileToDataUrl } from "@/lib/img";
import CapiTrovati from "@/components/CapiTrovati";
import { usaPreferiti } from "@/lib/preferiti";
import {
  apiFetch,
  deleteAccount,
  getUser,
  hasAccounts,
  onAuthChange,
  resendConfirmation,
  signIn,
  signOut,
} from "@/lib/session";

const RETAILER_TOGGLES = ["Zara", "Vinted", "COS", "Arket"];

function labelOf(item) {
  if (typeof item === "string") return item;
  return item?.label || item?.name || item?.id || "senza nome";
}

export default function Dashboard() {
  const [saved, setSaved] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [user, setUser] = useState(null);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [notice, setNotice] = useState("");
  const [err, setErr] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [matchRes, setMatchRes] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { capi: capiPreferiti, pronto: preferitiPronti } = usaPreferiti();
  const confirmed = Boolean(user?.email_confirmed_at || user?.confirmed_at);
  const online = Boolean(user && confirmed);

  // ---- dati locali (funzionano anche senza account) -------------------
  const loadLocal = useCallback(() => {
    try {
      setSaved(JSON.parse(localStorage.getItem("dress:savedItems") || "[]"));
      setFavorites(JSON.parse(localStorage.getItem("dress:favorites") || "[]"));
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
        setFavorites(profile.favorites || []);
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

  async function toggleFavorite(site) {
    const next = favorites.some((f) => labelOf(f) === site)
      ? favorites.filter((f) => labelOf(f) !== site)
      : [...favorites, site];
    setFavorites(next);
    persistLocal("dress:favorites", next);
    if (!online) return;
    try {
      const data = await apiFetch("/api/favorites/toggle", { method: "POST", body: { item: site } });
      setFavorites(data.favorites || []);
      persistLocal("dress:favorites", data.favorites || []);
    } catch (e) {
      setErr(e.message);
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

  // ---- analisi immagine -------------------------------------------------
  async function onPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImage(await fileToDataUrl(file));
    } catch {
      setErr("Immagine non leggibile.");
    }
  }

  async function askMatch() {
    if (!image) return setErr("Carica prima un'immagine.");
    setLoading(true);
    setErr("");
    setMatchRes(null);
    try {
      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: {}, closeup: image, fullbody: null }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Errore");
      setMatchRes(data);
    } catch {
      setErr("Analisi non riuscita.");
    }
    setLoading(false);
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

  async function onDelete() {
    setErr("");
    setNotice("");
    const typed = window.prompt(
      `Questa operazione è definitiva: spariscono account, palette, preferiti e outfit salvati.\n\nPer confermare scrivi la tua email (${user.email}):`,
    );
    if (!typed) return;
    setDeleting(true);
    try {
      const data = await deleteAccount(typed);
      setUser(null);
      setSaved([]);
      setFavorites([]);
      setNotice(data.message || "Account eliminato.");
    } catch (e) {
      setErr(
        e.code === "CONFIRM_EMAIL_MISMATCH"
          ? "L'email scritta non corrisponde: account non eliminato."
          : e.message,
      );
    }
    setDeleting(false);
  }

  return (
    <div className="wrap" style={{ paddingTop: 48, paddingBottom: 40, maxWidth: 960 }}>
      <h1 className="h2">Il tuo spazio personale</h1>
      <p className="muted">Qui salvi i capi preferiti, le offerte e chiedi all'AI cosa abbinare.</p>

      {err ? <p style={{ color: "var(--signal)", marginTop: 12 }}>{err}</p> : null}
      {notice ? <p className="muted" style={{ marginTop: 12 }}>{notice}</p> : null}

      {/* ---------------- Account ---------------- */}
      <section className="card" style={{ marginTop: 24, padding: 16 }}>
        <h2 className="h3">Account</h2>

        {!hasAccounts() && (
          <p className="muted">
            Gli account non sono configurati su questa installazione: i tuoi dati restano solo in questo
            browser.
          </p>
        )}

        {hasAccounts() && !user && (
          <>
            <p className="muted">Accedi per ritrovare palette, preferiti e outfit su qualsiasi dispositivo.</p>
            <form onSubmit={onSignIn} style={{ display: "grid", gap: 8, maxWidth: 360, marginTop: 12 }}>
              <input
                type="email"
                placeholder="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                autoComplete="email"
              />
              <input
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
            <button className="btn ghost" style={{ marginTop: 8 }} onClick={onResend} type="button">
              Rimandami la mail di conferma
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

        {online && (
          <>
            <p className="muted">
              Collegato come <strong>{user.email}</strong>.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button className="btn ghost" onClick={onSignOut}>Esci</button>
              <button
                className="btn ghost"
                onClick={onDelete}
                disabled={deleting}
                style={{ color: "var(--signal)" }}
              >
                {deleting ? "Elimino…" : "Elimina account"}
              </button>
            </div>
          </>
        )}
      </section>

      {/* ---------------- I capi messi da parte ---------------- */}
      <section style={{ marginTop: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h2 className="h3" style={{ margin: 0 }}>I tuoi preferiti</h2>
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

        {capiPreferiti.length > 0 && !online ? (
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            Sono salvati solo su questo dispositivo. Accedi e te li portiamo dietro ovunque.
          </p>
        ) : null}
      </section>

      {/* ---------------- Capi salvati ---------------- */}
      <section style={{ marginTop: 28 }}>
        <h2 className="h3">Capi salvati</h2>
        {saved.length === 0 ? (
          <p className="muted">Non ci sono ancora capi salvati.</p>
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

      {/* ---------------- Abbinamenti ---------------- */}
      <section style={{ marginTop: 28 }}>
        <h2 className="h3">Chiedi cosa abbinare</h2>
        <p className="muted">Carica la foto di un capo e chiedi all'AI suggerimenti di abbinamento.</p>
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <label className="card" style={{ padding: 12 }}>
            <div style={{ fontSize: 13, marginBottom: 8 }}>Carica immagine</div>
            <div style={{ width: 120, height: 160, background: "var(--stone)", display: "grid", placeItems: "center" }}>
              {image ? (
                <img src={image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span className="muted">Tocca per caricare</span>
              )}
            </div>
            <input type="file" accept="image/*" onChange={onPhoto} style={{ display: "none" }} />
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button className="btn" onClick={askMatch} disabled={loading}>
              {loading ? "Analizzo…" : "Chiedi all'AI"}
            </button>
          </div>
        </div>

        {matchRes && (
          <div style={{ marginTop: 18 }}>
            <h3 className="h4">Suggerimenti</h3>
            {matchRes.styleReading ? <p className="muted">Lettura stile: {matchRes.styleReading}</p> : null}
            <div className="swatches" style={{ marginTop: 12 }}>
              {matchRes.palette?.map((c, i) => (
                <div key={i} style={{ display: "inline-block", marginRight: 8 }}>
                  <div style={{ width: 48, height: 48, background: c.hex, borderRadius: 6 }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ---------------- Preferiti ---------------- */}
      <section style={{ marginTop: 28 }}>
        <h2 className="h3">Negozi preferiti</h2>
        <p className="muted">Segna i tuoi negozi per ricevere offerte mirate.</p>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {RETAILER_TOGGLES.map((site) => {
            const on = favorites.some((f) => labelOf(f) === site);
            return (
              <button key={site} className={on ? "btn" : "btn ghost"} onClick={() => toggleFavorite(site)}>
                {site}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 12 }}>
          <strong>Preferiti:</strong> {favorites.map(labelOf).join(", ") || "nessuno"}
        </div>
      </section>

      <section style={{ marginTop: 34, borderTop: "1px solid var(--line)", paddingTop: 24 }}>
        <h2 className="h3">Altro</h2>
        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          <Link href="/offers" className="btn-app chiaro">In sconto adesso</Link>
          <Link href="/colors" className="btn-app chiaro">I colori dell’anno</Link>
          <Link href="/wardrobe" className="btn-app chiaro">Abbina o rivendi un capo</Link>
          <Link href="/start" className="btn-app chiaro">Rifai l’analisi</Link>
        </div>
      </section>
    </div>
  );
}
