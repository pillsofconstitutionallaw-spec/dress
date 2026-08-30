"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fileToDataUrl } from "@/lib/img";
import { fallbackOutfits } from "@/lib/fallback";
import { FAMIGLIE_STILI, HAIR, EYES, OUTFIT_MODES, RETAILERS, FAST_FASHION_NOTE, spiegaStile } from "@/lib/data";
import { FORME } from "@/lib/proporzioni";
import BrandMark from "@/components/BrandMark";
import { getUser, hasAccounts, register, resendConfirmation, signIn } from "@/lib/session";
import { principali } from "@/lib/stagioni";
import { arricchisciConAI, eseguiAnalisi, salvaAnalisi } from "@/lib/analisiCompleta";
import { tonoPelle } from "@/lib/pelle";
import ColorePelle from "@/components/ColorePelle";
import TestArmocromia from "@/components/TestArmocromia";
import Drappeggio from "@/components/Drappeggio";

function Swatch({ c }) {
  return (
    <div className="swatch">
      <div className="fill" style={{ background: c.hex }} />
      <div className="meta">
        <div className="name">{c.name}</div>
        <div className="hex">{c.hex}</div>
        {c.why ? <div className="muted" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.4 }}>{c.why}</div> : null}
      </div>
    </div>
  );
}

function BuyRow({ term, budget }) {
  // Order: non-fast first, then second-hand highlighted; simple budget hinting.
  const list = [...RETAILERS].sort((a, b) => Number(a.fast) - Number(b.fast));
  return (
    <div style={{ padding: "16px 0", borderTop: "1px solid var(--line)" }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{term}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {list.map((r) => (
          <a key={r.name} className="chip" href={r.search(term)} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            {r.name}
            {r.fast ? <span className="tag warn">fast fashion</span> : r.tier === "second-hand" ? <span className="tag ok">usato</span> : null}
          </a>
        ))}
      </div>
      {budget ? <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>Budget indicativo: entro {budget} € a capo — privilegia i marchi non segnalati o l'usato.</div> : null}
    </div>
  );
}

export default function Start() {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({ height: "", weight: "", forma: "", hair: "", eyes: "", pelle: "", style: "", comment: "", sex: "" });
  const [closeup, setCloseup] = useState(null);
  const [fullbody, setFullbody] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [mode, setMode] = useState("smart");
  const [budget, setBudget] = useState("");
  const [err, setErr] = useState("");
  const [signedUp, setSignedUp] = useState(false);
  const [signup, setSignup] = useState({ name: "", email: "", password: "", consent: true });
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pending, setPending] = useState(null); // messaggio "controlla la mail"
  const [busy, setBusy] = useState(false);
  const [avvisi, setAvvisi] = useState([]);
  const [testRisposte, setTestRisposte] = useState({});
  const [mostraTest, setMostraTest] = useState(false);

  const set = (k) => (e) => setProfile((p) => ({ ...p, [k]: e.target.value }));

  // Persist state so user can navigate back without losing progress
  useEffect(() => {
    try {
      const saved = localStorage.getItem("dress:session");
      if (saved) {
        const s = JSON.parse(saved);
        if (s.profile) setProfile((p) => ({ ...p, ...s.profile }));
        if (s.closeup) setCloseup(s.closeup);
        if (s.fullbody) setFullbody(s.fullbody);
        if (s.step) setStep(s.step);
        if (s.mode) setMode(s.mode);
        if (s.budget) setBudget(s.budget);
        if (s.result) setResult(s.result);
        if (s.testRisposte) setTestRisposte(s.testRisposte);
      }
    } catch (e) {
      // ignore
    }
    // Senza account configurati il flusso resta libero; altrimenti conta
    // solo una sessione vera (email già confermata).
    if (!hasAccounts()) {
      setSignedUp(true);
      return;
    }
    getUser().then((u) => {
      if (u?.email_confirmed_at || u?.confirmed_at) setSignedUp(true);
    });
  }, []);

  useEffect(() => {
    try {
      const s = { profile, closeup, fullbody, step, mode, budget, result, testRisposte };
      localStorage.setItem("dress:session", JSON.stringify(s));
    } catch (e) {}
  }, [profile, closeup, fullbody, step, mode, budget, result, testRisposte]);

  async function onPhoto(setter, e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await fileToDataUrl(file);
      setter(url);
    } catch {
      setErr("Non sono riuscito a leggere l'immagine. Riprova con un'altra foto.");
    }
  }

  // L'iscrizione non apre subito l'app: prima va confermata l'email.
  async function completeSignup() {
    if (!signup.name || !signup.email || !signup.password) {
      return setErr("Inserisci nome, email e password per proseguire.");
    }
    if (!signup.consent) {
      return setErr("Serve il consenso al trattamento delle immagini per iscriverti.");
    }
    setErr("");
    setBusy(true);
    try {
      const data = await register({
        name: signup.name,
        email: signup.email,
        password: signup.password,
        profile,
      });
      setPending({ email: signup.email, message: data.message });
      setSignup((s) => ({ ...s, password: "" }));
    } catch (e) {
      setErr(String(e.message || e));
    }
    setBusy(false);
  }

  async function resendMail() {
    setErr("");
    try {
      const data = await resendConfirmation(pending?.email || signup.email);
      setPending((p) => ({ ...(p || { email: signup.email }), message: data.message }));
    } catch (e) {
      setErr(String(e.message || e));
    }
  }

  async function completeLogin() {
    if (!signup.email || !signup.password) return setErr("Inserisci email e password.");
    setErr("");
    setBusy(true);
    try {
      await signIn({ email: signup.email, password: signup.password });
      setSignedUp(true);
      setShowLoginModal(false);
      setSignup((s) => ({ ...s, password: "" }));
    } catch (e) {
      setErr(String(e.message || e));
      if (e.needsConfirmation) setPending({ email: signup.email, message: "" });
    }
    setBusy(false);
  }

  async function analyze() {
    setLoading(true);
    setErr("");
    setAvvisi([]);
    try {
      // L'analisi la facciamo qui nel telefono: misura la foto, calcola la
      // stagione, sceglie i cinque stili. Non serve rete, non serve una
      // chiave, non può esaurirsi. E la foto non esce da qui.
      const { risultato, avvisi: mancanze } = await eseguiAnalisi({ profile, closeup, fullbody, testRisposte });
      setAvvisi(mancanze);

      // Sotto la soglia di certezza non affermiamo: apriamo il drappeggio.
      // È la regola che tiene l'analisi quasi sempre giusta — non rispondere
      // vale più di rispondere male.
      if (risultato.daConfermare) setMostraTest(true);
      setResult(risultato);
      setStep(4);

      // Palette e stili si salvano: rifare l'analisi vorrebbe dire richiedere
      // le foto ogni volta, e nessuno lo farebbe.
      salvaAnalisi({ risultato, profile, budget, testRisposte });

      // Poi, se l'AI risponde, arrivano solo le PAROLE.
      const parole = await arricchisciConAI(risultato, profile);
      if (parole) setResult((r) => ({ ...r, ...parole }));
    } catch (e) {
      setErr("Non sono riuscito a leggere la foto. Riprova con una più luminosa, o vai avanti senza.");
    } finally {
      setLoading(false);
    }
  }

  const outfits = result ? fallbackOutfits(mode, profile) : [];

  return (
    <div className="wrap" style={{ paddingTop: 48, paddingBottom: 40, maxWidth: 900 }}>

      {/* Landing with Iscriviti / Accedi when user not signed up */}
      {!signedUp && (
        <div style={{ display: "grid", gap: 18, justifyContent: "center", alignItems: "center", paddingTop: 40 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn" onClick={() => setShowSignupModal(true)}>Iscriviti</button>
            <button className="btn ghost" onClick={() => setShowLoginModal(true)}>Accedi</button>
          </div>
          <div style={{ marginTop: 6 }}>
            <BrandMark small={false} />
          </div>
        </div>
      )}

      {/* Signup modal */}
      {showSignupModal && (
        <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.36)", zIndex: 60 }}>
          <div className="card" style={{ padding: 28, width: 420 }}>
            <h2 className="h2" style={{ marginBottom: 8 }}>Iscriviti a {"dress"}</h2>

            {pending ? (
              <>
                <p className="muted" style={{ marginBottom: 12 }}>
                  {pending.message || `Ti abbiamo scritto a ${pending.email}: apri il link per confermare l'iscrizione.`}
                </p>
                {err ? <div style={{ color: "var(--signal)", marginBottom: 10 }}>{err}</div> : null}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button className="btn ghost" onClick={resendMail}>Rimanda la mail</button>
                  <button className="btn" onClick={() => { setPending(null); setShowSignupModal(false); }}>Ho capito</button>
                </div>
              </>
            ) : (
            <>
            <p className="muted" style={{ marginBottom: 12 }}>Ti mandiamo una mail di conferma: l'account si attiva quando apri il link. Potrai cancellarlo quando vuoi dal tuo spazio personale.</p>
            <label className="field"><span className="label">Nome</span><input className="control" value={signup.name} onChange={(e) => setSignup((s) => ({ ...s, name: e.target.value }))} /></label>
            <label className="field"><span className="label">Email</span><input className="control" inputMode="email" value={signup.email} onChange={(e) => setSignup((s) => ({ ...s, email: e.target.value }))} /></label>
            <label className="field"><span className="label">Password</span><input className="control" type="password" value={signup.password} onChange={(e) => setSignup((s) => ({ ...s, password: e.target.value }))} /></label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <input type="checkbox" checked={signup.consent} onChange={(e) => setSignup((s) => ({ ...s, consent: e.target.checked }))} />
              <span className="muted">Accetto che le immagini siano usate solo per analisi e non condivise.</span>
            </label>
            {err ? <div style={{ color: "var(--signal)", marginBottom: 10 }}>{err}</div> : null}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn ghost" onClick={() => { setSignup({ name: "", email: "", password: "", consent: true }); setErr(""); setShowSignupModal(false); }}>Annulla</button>
              <button className="btn" onClick={completeSignup} disabled={busy}>{busy ? "Invio…" : "Iscriviti"}</button>
            </div>
            </>
            )}
          </div>
        </div>
      )}

      {/* Login modal */}
      {showLoginModal && (
        <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.36)", zIndex: 60 }}>
          <div className="card" style={{ padding: 28, width: 420 }}>
            <h2 className="h2" style={{ marginBottom: 8 }}>Accedi</h2>
            <p className="muted" style={{ marginBottom: 12 }}>Inserisci la stessa email usata per l'iscrizione.</p>
            <label className="field"><span className="label">Email</span><input className="control" inputMode="email" value={signup.email} onChange={(e) => setSignup((s) => ({ ...s, email: e.target.value }))} /></label>
            <label className="field"><span className="label">Password</span><input className="control" type="password" value={signup.password} onChange={(e) => setSignup((s) => ({ ...s, password: e.target.value }))} /></label>
            {err ? <div style={{ color: "var(--signal)", marginBottom: 10 }}>{err}</div> : null}
            {pending ? (
              <button className="btn ghost" style={{ marginBottom: 10 }} onClick={resendMail}>Rimandami la mail di conferma</button>
            ) : null}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn ghost" onClick={() => { setSignup({ name: "", email: "", password: "", consent: true }); setErr(""); setShowLoginModal(false); }}>Annulla</button>
              <button className="btn" onClick={completeLogin} disabled={busy}>{busy ? "Accedo…" : "Accedi"}</button>
            </div>
          </div>
        </div>
      )}
      {/* progress */}
      <div style={{ display: "flex", gap: 8, marginBottom: 36 }}>
        {[1, 2, 3, 4].map((n) => (
          <div key={n} style={{ flex: 1, height: 3, background: step >= n ? "var(--ink)" : "var(--line)" }} />
        ))}
      </div>

      {err ? <p style={{ color: "var(--signal)", marginBottom: 20 }}>{err}</p> : null}

      {step === 1 && (
        <section>
          <p className="eyebrow">Passo 1</p>
          <h1 className="h2" style={{ marginTop: 10, marginBottom: 28 }}>Presentati</h1>
          <p className="muted" style={{ marginBottom: 24, maxWidth: "56ch" }}>
            Questi dati ci aiutano a costruire una lettura più precisa del tuo stile, senza costringerti a rispondere a domande complicate.
          </p>

          <label className="field">
            <span className="label">Altezza (cm)</span>
            <input className="control" inputMode="numeric" value={profile.height} onChange={set("height")} placeholder="es. 178" />
          </label>

          <label className="field">
            <span className="label">Peso (kg) — facoltativo</span>
            <input className="control" inputMode="numeric" value={profile.weight} onChange={set("weight")} placeholder="es. 72" />
            <span className="muted" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
              Serve solo a proporti la taglia giusta. Non lo commentiamo, non lo mostriamo a nessuno,
              e puoi lasciarlo vuoto.
            </span>
          </label>

          <label className="field">
            <span className="label">Proporzioni — facoltativo</span>
            <select className="control" value={profile.forma} onChange={set("forma")}>
              <option value="">Preferisco non dirlo</option>
              {FORME.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
            <span className="muted" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
              Serve solo a capire quali tagli cadono meglio: lo stesso pantalone su due persone
              diverse cade in due modi diversi. Non lo commentiamo mai.
            </span>
          </label>

          <label className="field">
            <span className="label">Colore capelli</span>
            <select className="control" value={profile.hair} onChange={set("hair")}>
              <option value="">Scegli…</option>
              {HAIR.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </label>

          <label className="field">
            <span className="label">Colore occhi</span>
            <select className="control" value={profile.eyes} onChange={set("eyes")}>
              <option value="">Scegli…</option>
              {EYES.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </label>

          {/* Il colore della pelle si sceglie guardandolo, non nominandolo:
              nell'elenco a tendina finiva "oliva" anche chi ha la pelle rosa
              tenue, e da lì usciva la palette di un'altra persona. */}
          <div className="field">
            <span className="label">Colore della pelle</span>
            <ColorePelle valore={profile.pelle} onCambia={(id) => setProfile((p) => ({ ...p, pelle: id }))} />
          </div>

          <label className="field">
            <span className="label">Sesso</span>
            <select className="control" value={profile.sex} onChange={(e) => setProfile((p) => ({ ...p, sex: e.target.value }))}>
              <option value="">Preferisco non specificare</option>
              <option value="female">Donna</option>
              <option value="male">Uomo</option>
              <option value="nonbinary">Non binario</option>
            </select>
          </label>

          <label className="field">
            <span className="label">Il tuo stile attuale</span>
            <select className="control" value={profile.style} onChange={set("style")}>
              <option value="">Scegli…</option>
              <option value="Non so ancora — aiutami a scoprirlo">Non so ancora — aiutami a scoprirlo</option>
              {FAMIGLIE_STILI.map((f) => (
                <optgroup key={f.famiglia} label={f.famiglia}>
                  {f.stili.map((s) => (
                    <option key={s} value={s} title={spiegaStile(s)}>
                      {s}{spiegaStile(s) ? ` — ${spiegaStile(s).split(/[.:]/)[0]}` : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <button className="btn" onClick={() => setStep(2)}>Continua</button>
        </section>
      )}

      {step === 2 && (
        <section>
          <p className="eyebrow">Passo 2</p>
          <h1 className="h2" style={{ marginTop: 10, marginBottom: 12 }}>Due foto</h1>
          <p className="muted" style={{ marginBottom: 28, maxWidth: "56ch" }}>
            Un primo piano del viso (luce naturale, senza filtri) e una figura intera.
            Le immagini vengono ridotte e inviate solo per l'analisi, quindi non servono foto perfette: basta una luce naturale e un po' di spontaneità.
          </p>

          <div className="two-eq">
            {[
              ["Primo piano", closeup, (e) => onPhoto(setCloseup, e)],
              ["Figura intera", fullbody, (e) => onPhoto(setFullbody, e)],
            ].map(([label, val, handler]) => (
              <label key={label} className="card" style={{ padding: 16, cursor: "pointer", display: "block" }}>
                <span className="label" style={{ display: "block", marginBottom: 10 }}>{label}</span>
                <div style={{ aspectRatio: "3/4", background: "var(--stone)", display: "grid", placeItems: "center", overflow: "hidden" }}>
                  {val ? <img src={val} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span className="muted" style={{ fontSize: 13 }}>Tocca per caricare</span>}
                </div>
                <input type="file" accept="image/*" onChange={handler} style={{ display: "none" }} />
              </label>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
            <button className="btn ghost" onClick={() => setStep(1)}>Indietro</button>
            <button className="btn" onClick={() => setStep(3)}>Continua</button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section>
          <p className="eyebrow">Passo 3</p>
          <h1 className="h2" style={{ marginTop: 10, marginBottom: 12 }}>Genera la tua palette</h1>
          <div className="summary-card" style={{ marginBottom: 24, maxWidth: 620 }}>
            <p className="eyebrow" style={{ marginBottom: 8 }}>Riepilogo</p>
            <p className="muted" style={{ margin: 0, fontSize: 15 }}>
              {profile.height || "—"} cm · {profile.weight ? `${profile.weight} kg · ` : ""}capelli {profile.hair || "—"} · occhi {profile.eyes || "—"} · pelle {tonoPelle(profile.pelle)?.nome || "—"} · stile {profile.style || "—"}.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn ghost" onClick={() => setStep(2)}>Indietro</button>
            <button className="btn" onClick={analyze} disabled={loading}>{loading ? "Analizzo…" : "Crea la mia palette"}</button>
          </div>
        </section>
      )}

      {step === 4 && result && (
        <section>
          <div className="summary-card" style={{ marginBottom: 24 }}>
            <p className="eyebrow">La tua palette</p>
            {result.season ? <h1 className="h2" style={{ marginTop: 10 }}>{result.season}</h1> : null}

            {/* Da dove esce questa stagione: il colore della pelle, in
                chiaro e col suo quadratino. È il dato che la decide più di
                ogni altro, e finora non si vedeva da nessuna parte. */}
            {tonoPelle(profile.pelle) ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                <span aria-hidden="true" style={{ width: 26, height: 26, background: tonoPelle(profile.pelle).hex, border: "1px solid rgba(0,0,0,0.14)", flex: "0 0 26px" }} />
                <span className="muted" style={{ fontSize: 13 }}>
                  Pelle <strong style={{ color: "var(--ink)" }}>{tonoPelle(profile.pelle).nome}</strong>
                  {result.misura?.sottotono ? `, sottotono ${result.misura.sottotono}` : ""}.
                </span>
              </div>
            ) : null}

            {/* Il giudizio dell'utente vale più della misura: se la stagione
                non gli somiglia, si rifà con le domande dell'armocromista. */}
            <div className="card" style={{ padding: 16, marginTop: 16, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <strong style={{ fontSize: 14 }}>
                  {result.daConfermare ? "Su di te non sono sicuro" : "Ti somiglia?"}
                </strong>
                <button className="btn ghost" onClick={() => setMostraTest((v) => !v)} style={{ padding: "8px 14px", fontSize: 13 }}>
                  {mostraTest ? "Chiudi" : "No, affiniamo"}
                </button>
              </div>

              {result.daConfermare ? (
                <span className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                  La foto non basta a deciderlo: il tuo è un caso al limite fra caldo e freddo, o la
                  luce ha ingannato la misura. Guarda le due immagini qui sotto — con i teli
                  accanto la differenza si vede, anche senza saperla spiegare.
                </span>
              ) : result.misura?.fonteSottotono ? (
                <span className="muted" style={{ fontSize: 12.5 }}>
                  Sottotono <strong>{result.misura.sottotono}</strong>, deciso da: {result.misura.fonteSottotono}
                  {result.misura.dueScatti ? (result.misura.accordoFoto ? ", due scatti concordi" : ", i due scatti non concordano") : ""}.
                </span>
              ) : null}

              {mostraTest ? (
                <div style={{ marginTop: 6 }}>
                  <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
                    Sono le domande che fa un armocromista prima di appoggiarti i teli sotto il viso.
                    Pesano più della foto, perché riguardano come reagisci alla luce nella vita —
                    non come sei venuto in uno scatto.
                  </p>
                  {/* Prima il drappeggio: si guarda, non si sa. Poi le
                      domande di fatto, che non chiedono un giudizio. */}
                  <div style={{ marginBottom: 22 }}>
                    <Drappeggio
                      foto={closeup}
                      scelte={testRisposte}
                      onScelta={(id, v) => setTestRisposte((r) => ({ ...r, [id]: v }))}
                    />
                  </div>

                  <TestArmocromia
                    risposte={testRisposte}
                    onRisposta={(id, v) => setTestRisposte((r) => ({ ...r, [id]: v }))}
                    compatto
                  />

                  {/* Qui dentro perché è qui che si viene quando il risultato
                      non somiglia, e un colore della pelle scelto male è la
                      prima cosa che lo spiega. */}
                  <div style={{ marginTop: 22, display: "grid", gap: 8 }}>
                    <strong style={{ fontSize: 15, lineHeight: 1.35 }}>Il colore della tua pelle</strong>
                    <ColorePelle
                      valore={profile.pelle}
                      onCambia={(id) => setProfile((p) => ({ ...p, pelle: id }))}
                      compatto
                    />
                  </div>
                  <button className="btn" style={{ marginTop: 16 }} onClick={analyze} disabled={loading}>
                    {loading ? "Rifaccio…" : "Rifai l'analisi"}
                  </button>
                </div>
              ) : null}
            </div>

            {avvisi.length ? (
              <div className="card" style={{ padding: 16, marginTop: 16, display: "grid", gap: 8, borderColor: "var(--signal)" }}>
                <strong style={{ fontSize: 14 }}>Il risultato può essere migliore</strong>
                {avvisi.map((a) => (
                  <p key={a} className="muted" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5 }}>{a}</p>
                ))}
                <button className="btn ghost" style={{ marginTop: 4, justifySelf: "start" }} onClick={() => setStep(3)}>
                  Aggiungi le foto
                </button>
              </div>
            ) : null}
            {result.styleReading ? <p className="muted" style={{ marginTop: 12, maxWidth: "52ch" }}>Lettura dello stile: {result.styleReading}</p> : null}

            {/* Gli stili consigliati: al massimo cinque, dal più adatto. */}
            {result.stili?.length ? (
              <section style={{ marginTop: 34 }}>
                <h2 className="h3" style={{ margin: 0 }}>Gli stili che ti stanno meglio</h2>
                <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                  In ordine, dal più adatto. Ne scegliamo al massimo cinque: oltre non è più un
                  consiglio, è un elenco.
                </p>

                <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                  {result.stili.slice(0, 5).map((st, i) => {
                    const scelto = result.stileScelto === st.nome;
                    return (
                    <button
                      key={st.nome + i}
                      type="button"
                      onClick={() => {
                        const nuovo = scelto ? null : st.nome;
                        setResult((r) => ({ ...r, stileScelto: nuovo }));
                        salvaAnalisi({ risultato: { ...result, stileScelto: nuovo }, profile, budget, testRisposte, stileScelto: nuovo });
                      }}
                      className="card"
                      style={{
                        padding: 16, display: "grid", gap: 8, textAlign: "left", width: "100%",
                        cursor: "pointer", border: scelto ? "2px solid var(--ink)" : undefined,
                        background: scelto ? "var(--stone)" : undefined,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                        <span className="eyebrow" style={{ fontSize: 11, color: "var(--greige)" }}>{i + 1}</span>
                        <strong style={{ fontSize: 16 }}>{st.nome}</strong>
                      </div>

                      {/* Cos'è, prima di perché ti sta bene: senza questo
                          "Blokecore" non dice niente a nessuno. */}
                      {spiegaStile(st.nome) ? (
                        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{spiegaStile(st.nome)}</p>
                      ) : null}

                      <p className="muted" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5 }}>
                        <em>Perché a te:</em> {st.perche}
                      </p>

                      {st.capi?.length ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                          {st.capi.slice(0, 4).map((capo) => (
                            <a
                              key={capo}
                              href={`/cerca?capo=${encodeURIComponent(capo)}`}
                              className="chip"
                              style={{ textDecoration: "none", color: "inherit" }}
                            >
                              {capo}
                            </a>
                          ))}
                        </div>
                      ) : null}

                      <span className="eyebrow" style={{ fontSize: 10, color: scelto ? "var(--ink)" : "var(--greige)" }}>
                        {scelto ? "✓ scelto — i capi qui sotto sono di questo stile" : "tocca per scegliere questo stile"}
                      </span>
                    </button>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </div>
          {/* production UI: no demo badge shown */}

          {/* I cinque da cui partire, spiegati uno per uno. Gli altri sette
              completano la stagione: servono a trovarti i capi, e mostrarli
              tutti e dodici con la loro spiegazione sarebbe un muro di testo. */}
          <div className="swatches" style={{ marginTop: 24 }}>
            {principali(result.palette).map((c, i) => <Swatch key={i} c={c} />)}
          </div>

          {result.palette.length > 5 ? (
            <div style={{ marginTop: 20 }}>
              <p className="label" style={{ marginBottom: 10 }}>Gli altri colori della tua stagione</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {result.palette.filter((c) => !c.principale).map((c) => (
                  <div key={c.hex + c.name} style={{ width: 88 }}>
                    <div style={{ height: 44, background: c.hex, border: "1px solid rgba(0,0,0,0.10)" }} />
                    <div style={{ fontSize: 11.5, marginTop: 6, lineHeight: 1.3 }}>{c.name}</div>
                  </div>
                ))}
              </div>
              <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
                Li usiamo per cercarti i capi: sono della stessa famiglia dei cinque qui sopra.
              </p>
            </div>
          ) : null}

          {/* Outfits */}
          <div style={{ marginTop: 56 }}>
            <p className="eyebrow">Outfit</p>
            <h2 className="h2" style={{ marginTop: 10, marginBottom: 20 }}>Scegli l'occasione</h2>
            <div className="chips" style={{ marginBottom: 20 }}>
              {OUTFIT_MODES.map((m) => (
                <button key={m.id} className="chip" aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>{m.label}</button>
              ))}
            </div>
            <label className="field" style={{ maxWidth: 260 }}>
              <span className="label">Budget per capo (€)</span>
              <input className="control" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="es. 60" />
            </label>

            {outfits.map((o, i) => (
              <div key={i} className="card" style={{ padding: "clamp(18px, 3vw, 28px)", marginTop: 18 }}>
                <h3 className="h2" style={{ fontSize: 19, marginBottom: 8 }}>{o.title}</h3>
                <p className="muted" style={{ fontSize: 14, marginBottom: 6 }}>{o.items.join(" · ")}</p>
                <p className="muted" style={{ fontSize: 13, marginBottom: 6 }}>Colori consigliati: {o.colors.join(", ")}</p>
                <div style={{ marginTop: 12 }}>
                  <p className="eyebrow" style={{ marginBottom: 4 }}>Dove comprarlo</p>
                  {o.searchTerms.map((t) => <BuyRow key={t} term={t} budget={budget} />)}
                </div>
              </div>
            ))}

            <div className="card" style={{ padding: "clamp(18px,3vw,28px)", marginTop: 24 }}>
              <p className="tag warn" style={{ marginBottom: 10 }}>Perché segnaliamo il fast fashion</p>
              <p className="muted" style={{ fontSize: 14, margin: 0, lineHeight: 1.55 }}>{FAST_FASHION_NOTE}</p>
            </div>

            <div style={{ marginTop: 32, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/wardrobe" className="btn ghost">Ho già dei capi da abbinare</Link>
              <button className="btn ghost" onClick={() => { setStep(1); setResult(null); }}>Ricomincia</button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
