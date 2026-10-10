"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fileToDataUrl } from "@/lib/img";
import { fallbackOutfits } from "@/lib/fallback";
import { OUTFIT_MODES, RETAILERS, FAST_FASHION_NOTE, spiegaStile } from "@/lib/data";
import { getUser, hasAccounts, resendConfirmation, signIn } from "@/lib/session";
import { principali } from "@/lib/stagioni";
import { arricchisciConAI, eseguiAnalisi, salvaAnalisi } from "@/lib/analisiCompleta";
import { tonoPelle } from "@/lib/pelle";
import ColorePelle from "@/components/ColorePelle";
import TestArmocromia from "@/components/TestArmocromia";
import Drappeggio from "@/components/Drappeggio";
import { soloCifre } from "@/lib/numeri";
import { senzaDatiInutili } from "@/lib/taglie";
import Questionario from "@/components/Questionario";

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
  const [profile, setProfile] = useState({ height: "", forma: "", hair: "", eyes: "", pelle: "", style: "", sex: "", tagliaSopra: "", tagliaSotto: "", tagliaScarpe: "" });
  // A quale domanda siamo. Una per schermata: prima stavano tutte in una
  // pagina sola, otto campi uno sotto l'altro con peso e altezza in cima, e
  // la prima cosa che uno vedeva era un modulo da compilare invece del
  // motivo per cui era venuto.
  const [domanda, setDomanda] = useState(0);
  const [closeup, setCloseup] = useState(null);
  const [fullbody, setFullbody] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [mode, setMode] = useState("smart");
  const [budget, setBudget] = useState("");
  const [err, setErr] = useState("");
  const [signedUp, setSignedUp] = useState(false);
  const [signup, setSignup] = useState({ email: "", password: "" });
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pending, setPending] = useState(null); // messaggio "controlla la mail"
  const [busy, setBusy] = useState(false);
  const [avvisi, setAvvisi] = useState([]);
  const [testRisposte, setTestRisposte] = useState({});
  const [mostraTest, setMostraTest] = useState(false);
  // La correzione a mano si fa dal profilo, ma vale dappertutto: se la
  // scordassimo qui, rifare l'analisi da questa pagina riporterebbe di
  // soppiatto la stagione che la persona aveva già rifiutato.
  const [correzione, setCorrezione] = useState(null);

  const set = (k) => (e) => setProfile((p) => ({ ...p, [k]: e.target.value }));

  // Persist state so user can navigate back without losing progress
  useEffect(() => {
    try {
      const saved = localStorage.getItem("dress:session");
      if (saved) {
        const s = JSON.parse(saved);
        if (s.profile) setProfile((p) => ({ ...p, ...senzaDatiInutili(s.profile) }));
        if (s.closeup) setCloseup(s.closeup);
        if (s.fullbody) setFullbody(s.fullbody);
        if (s.step) setStep(s.step === 4 ? 4 : 1);
        if (Number.isInteger(s.domanda)) setDomanda(s.domanda);
        if (s.mode) setMode(s.mode);
        if (s.budget) setBudget(s.budget);
        if (s.result) setResult(s.result);
        if (s.testRisposte) setTestRisposte(s.testRisposte);
        if (s.correzione) setCorrezione(s.correzione);
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
      const s = { profile, closeup, fullbody, step, domanda, mode, budget, result, testRisposte, correzione };
      localStorage.setItem("dress:session", JSON.stringify(s));
    } catch (e) {}
  }, [profile, closeup, fullbody, step, domanda, mode, budget, result, testRisposte, correzione]);

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

  // Il tasto «Rimandami la mail» c'era, la funzione no: alla prima email
  // non confermata la pagina andava in errore invece di rimandarla.
  async function resendMail() {
    setErr("");
    try {
      const data = await resendConfirmation(signup.email);
      setPending({ email: signup.email, message: data?.message || "Te l'abbiamo rimandata." });
    } catch (e) {
      setErr(String(e.message || e));
    }
  }

  async function analyze() {
    setLoading(true);
    setErr("");
    setAvvisi([]);
    try {
      // L'analisi la facciamo qui nel telefono: misura la foto, calcola la
      // stagione, sceglie i cinque stili. Non serve rete, non serve una
      // chiave, non può esaurirsi. E la foto non esce da qui.
      const { risultato, avvisi: mancanze } = await eseguiAnalisi({ profile, closeup, fullbody, testRisposte, correzione });
      setAvvisi(mancanze);

      // Sotto la soglia di certezza non affermiamo: apriamo il drappeggio.
      // È la regola che tiene l'analisi quasi sempre giusta — non rispondere
      // vale più di rispondere male.
      if (risultato.daConfermare) setMostraTest(true);
      setResult(risultato);
      setStep(4);

      // Palette e stili si salvano: rifare l'analisi vorrebbe dire richiedere
      // le foto ogni volta, e nessuno lo farebbe.
      salvaAnalisi({ risultato, profile, budget, testRisposte, correzione });

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

      {/* Chi ha già un account lo dice qui, in una riga. Prima stavano in
          cima due bottoni grandi — Iscriviti e Accedi — sopra il logo, e
          sotto partiva il questionario: non si capiva se bisognasse prima
          iscriversi o rispondere. Si risponde; l'account è facoltativo. */}
      {!signedUp && step !== 4 ? (
        <p className="muted" style={{ fontSize: 14, margin: "0 0 18px" }}>
          Hai già un account?{" "}
          <button
            type="button"
            onClick={() => setShowLoginModal(true)}
            style={{ padding: 0, background: "none", border: 0, font: "inherit", color: "var(--ink)", textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}
          >
            Accedi
          </button>
        </p>
      ) : null}

      {/* Signup modal */}
      {showSignupModal && (
        <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.36)", zIndex: 60 }}>
          <div className="card" style={{ padding: 28, width: 420 }}>
            <h2 className="h2" style={{ marginBottom: 8 }}>Iscriviti a {"dress"}</h2>

            {/* Qui c'era un secondo modulo d'iscrizione, e non poteva
                funzionare: chiedeva nome, email e password, mentre la rotta
                pretende anche cognome, nome utente e data di nascita — che
                servono a sapere come chiamarti e se hai l'età per
                iscriverti. Premendo "Iscriviti" tornava indietro «Compila
                nome, cognome, nome utente, email e password», su una scheda
                che quei due campi non li aveva. Un modulo d'iscrizione basta
                e avanza, ed è quello della pagina d'ingresso. */}
            <p className="muted" style={{ marginBottom: 12 }}>
              L'iscrizione chiede qualche dato in più — nome e cognome, un nome utente e
              la data di nascita — e sta tutta in una scheda sola. Poi torni qui e l'analisi
              riprende da dove l'hai lasciata.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn ghost" onClick={() => { setErr(""); setShowSignupModal(false); }}>Annulla</button>
              <Link className="btn" href="/">Vai all'iscrizione</Link>
            </div>
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
              <>
                <button className="btn ghost" style={{ marginBottom: 10 }} onClick={resendMail}>Rimandami la mail di conferma</button>
                {pending.message ? <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>{pending.message}</p> : null}
              </>
            ) : null}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn ghost" onClick={() => { setSignup({ name: "", email: "", password: "", consent: true }); setErr(""); setShowLoginModal(false); }}>Annulla</button>
              <button className="btn" onClick={completeLogin} disabled={busy}>{busy ? "Accedo…" : "Accedi"}</button>
            </div>
          </div>
        </div>
      )}
      {err ? <p style={{ color: "var(--signal)", marginBottom: 20 }}>{err}</p> : null}

      {step !== 4 ? (
        <Questionario
          domanda={domanda}
          setDomanda={setDomanda}
          profile={profile}
          setProfile={setProfile}
          closeup={closeup}
          fullbody={fullbody}
          onFoto={(quale, e) => onPhoto(quale === "closeup" ? setCloseup : setFullbody, e)}
          analizza={analyze}
          loading={loading}
        />
      ) : null}

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
                <button className="btn ghost" style={{ marginTop: 4, justifySelf: "start" }} onClick={() => { setDomanda(0); setStep(1); }}>
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
                        salvaAnalisi({ risultato: { ...result, stileScelto: nuovo }, profile, budget, testRisposte, correzione, stileScelto: nuovo });
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
              <input className="control" inputMode="numeric" value={budget} onChange={(e) => setBudget(soloCifre(e.target.value, 6))} placeholder="es. 60" />
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
              <Link href="/armadio" className="btn ghost">Metti su il tuo armadio</Link>
              {/* Solo a chi ha dichiarato sesso femminile, come da richiesta.
                  Non è un giudizio su chi porta lo smalto: è che mettere una
                  voce in più a tutti, per una cosa che alla maggior parte
                  degli uomini non serve, rende la schermata più lunga per
                  tutti e più utile per nessuno. Chi la vuole la trova
                  comunque dall'indirizzo. */}
              {profile.sex === "female" ? (
                <Link href="/unghie" className="btn ghost">Smalti nei tuoi colori</Link>
              ) : null}
              <Link href="/wardrobe" className="btn ghost">Abbina un capo solo</Link>
              <button className="btn ghost" onClick={() => { setDomanda(0); setStep(1); setResult(null); }}>Ricomincia</button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
