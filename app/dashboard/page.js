"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fileToDataUrl } from "@/lib/img";
import CapiTrovati from "@/components/CapiTrovati";
import NonUnCapo from "@/components/NonUnCapo";
import Gruppo from "@/components/Gruppo";
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

const RETAILER_TOGGLES = ["Zara", "Vinted", "COS", "Arket", "Nike", "Puma", "New Balance", "Asics", "Lotto"];

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

  // La foto di un CAPO va all'endpoint dei capi, non a quello dei colori:
  // /api/analyze ora lavora sulle misure e le immagini le ignora, quindi
  // questa funzione non faceva più niente.
  //
  // Qui si abbina soltanto: l'annuncio di vendita si chiede da /vendi.
  async function askMatch() {
    if (!image) return setErr("Carica prima la foto di un capo.");
    setLoading(true);
    setErr("");
    setMatchRes(null);
    try {
      const r = await fetch("/api/abbina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Errore");
      setMatchRes(data);
    } catch {
      setErr("Non sono riuscito a leggere il capo. Riprova con una foto più nitida.");
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

  // Le destinazioni dell'app, in un elenco solo.
  //
  // Erano due: quattro schede in cima e tre bottoni grigi in fondo, sotto un
  // titolo che diceva "Altro". Due liste della stessa cosa, in due posti, con
  // due aspetti diversi — e per sapere dove si poteva andare bisognava
  // leggerle tutte e due. Adesso è una, e ogni voce dice cosa ci trovi.
  const destinazioni = [
    { href: "/outfit", titolo: "I tuoi completi", detta: "Uno per stagione, nei tuoi colori" },
    { href: "/offers", titolo: "In sconto adesso", detta: "I ribassi veri dei negozi in catalogo" },
    { href: "/cerca", titolo: "Cerca un capo", detta: "Per marca o modello, filtrato sui tuoi colori" },
    { href: "/wardrobe", titolo: "Abbina un capo", detta: "La stessa cosa di qui sopra, in una pagina sua" },
    { href: "/vendi", titolo: "Vendi un capo", detta: "L’annuncio per Vinted, già scritto" },
    { href: "/colors", titolo: "I colori dell’anno", detta: "Le tinte della stagione, spiegate" },
    { href: "/start", titolo: "Rifai l’analisi", detta: "Se cambi capelli, o la foto non era buona" },
  ];

  // L'account: in cima se devi ancora entrare, in fondo se sei già dentro.
  // Le impostazioni non sono la prima cosa che uno vuole vedere di casa sua.
  const sezioneAccount = (
    <section className="card" style={{ padding: 16 }}>
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
  );

  return (
    <div className="wrap" style={{ paddingTop: 48, paddingBottom: 40, maxWidth: 960 }}>
      <h1 className="h2">Il tuo spazio personale</h1>
      <p className="muted">I capi che hai messo da parte, i completi salvati, i negozi che segui.</p>

      {err ? <p style={{ color: "var(--signal)", marginTop: 12 }}>{err}</p> : null}
      {notice ? <p className="muted" style={{ marginTop: 12 }}>{notice}</p> : null}

      {online ? null : <div style={{ marginTop: 24 }}>{sezioneAccount}</div>}

      <Gruppo
        titolo="Le tue cose"
        detta="Quello che hai messo da parte tu: resta qui e non cambia se non lo cambi."
      >
      {/* ---------------- I capi messi da parte ---------------- */}
      <section>
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

        {capiPreferiti.length > 0 && !online ? (
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            Sono salvati solo su questo dispositivo. Accedi e te li portiamo dietro ovunque.
          </p>
        ) : null}
      </section>

      {/* ---------------- Capi salvati ---------------- */}
      <section>
        <h2 className="h3">Completi salvati</h2>
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

      {/* ---------------- Preferiti ---------------- */}
      <section>
        <h2 className="h3">Negozi che segui</h2>
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
          <strong>Segui:</strong> {favorites.map(labelOf).join(", ") || "nessuno"}
        </div>
      </section>
      </Gruppo>

      <Gruppo
        titolo="Fare qualcosa"
        detta="Le pagine dell’app, tutte da qui — e la domanda che si fa più spesso, senza doverci andare."
      >
      {/* ---------------- Abbinamenti ---------------- */}
      <section>
        <h2 className="h3">Chiedi cosa abbinare</h2>
        <p className="muted">Carica la foto di un capo e chiedi come abbinarlo.</p>
        <p className="muted" style={{ fontSize: 12, marginTop: -6 }}>
          Questa foto viene inviata per il tempo della descrizione e non viene conservata. È
          l'unica che esce dal dispositivo: il selfie dell'analisi colori resta qui.
        </p>
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

        {matchRes?.riconosciuto === false && (
          <div style={{ marginTop: 18 }}>
            <NonUnCapo esito={matchRes} />
          </div>
        )}

        {matchRes && matchRes.riconosciuto !== false && (
          <>
            <div className="card" style={{ marginTop: 18, padding: 16, display: "grid", gap: 8 }}>
              <strong style={{ fontSize: 15 }}>{matchRes.title}</strong>
              {matchRes.description ? <p className="muted" style={{ margin: 0, fontSize: 14 }}>{matchRes.description}</p> : null}
              {matchRes.matchTips?.length ? (
                <ul style={{ margin: "4px 0 0", paddingLeft: "1.1em", fontSize: 14, lineHeight: 1.6 }}>
                  {matchRes.matchTips.map((t) => <li key={t}>{t}</li>)}
                </ul>
              ) : null}
            </div>
          </>
        )}
      </section>

      <nav style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {destinazioni.map((d) => (
          <Link key={d.href} href={d.href} className="card"
            style={{ padding: 16, textDecoration: "none", color: "inherit", display: "block" }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{d.titolo}</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4, lineHeight: 1.4 }}>{d.detta}</div>
          </Link>
        ))}
      </nav>
      </Gruppo>

      {online ? (
        <Gruppo titolo="Impostazioni">
          {sezioneAccount}
        </Gruppo>
      ) : null}
    </div>
  );
}
