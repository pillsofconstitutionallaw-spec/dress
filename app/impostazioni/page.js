"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Gruppo from "@/components/Gruppo";
import Avatar from "@/components/Avatar";
import { fileToDataUrl } from "@/lib/img";
import { controllaPassword, LUNGHEZZA_MINIMA } from "@/lib/password";
import { RETAILERS } from "@/lib/data";
import {
  apiFetch,
  apparecchiRegistrati,
  cambiaEmail,
  cambiaPassword,
  completaProfilo,
  deleteAccount,
  entraConImpronta,
  esciDaTuttiIDispositivi,
  getUser,
  hasAccounts,
  passkeyAttive,
  questoApparecchioSaFarlo,
  registraQuestoApparecchio,
  signOut,
  togliApparecchio,
} from "@/lib/session";

// I colori fra cui scegliere la propria faccia. Pochi e decisi: una tavolozza
// da cui non si può sbagliare vale più di un selettore con sedici milioni di
// tinte in cui si finisce sempre sul grigio.
const COLORI_PROFILO = [
  "#1B2A41", "#5C1F26", "#B98F5E", "#9AA88B",
  "#3F4A3C", "#7A5C8E", "#B5654A", "#111213",
];

// I nomi come li ha salvati chi seguiva già un negozio: in elenco Vinted si
// chiama "Vinted (second-hand)", ma nei preferiti di chi c'era prima è
// scritto "Vinted", e il tasto risulterebbe spento.
const NEGOZI = [...new Set(RETAILERS.map((r) => r.name.replace(/\s*\(.*\)\s*$/, "").trim()))];

// Sul profilo i preferiti possono essere stringhe o oggetti, a seconda di
// quando sono stati salvati. Si legge il nome in entrambi i casi.
const nomeNegozio = (voce) => (typeof voce === "string" ? voce : voce?.label || voce?.name || voce?.id || "");

export default function Impostazioni() {
  const router = useRouter();
  const [utente, setUtente] = useState(null);
  const [profilo, setProfilo] = useState(null);
  const [caricamento, setCaricamento] = useState(true);

  const [campi, setCampi] = useState({ nome: "", cognome: "", username: "", dataNascita: "", avatar: null, colore: COLORI_PROFILO[0] });
  const [negozi, setNegozi] = useState([]);
  const [password, setPassword] = useState({ nuova: "", ripeti: "" });
  const [email, setEmail] = useState("");

  // Face ID e impronta: tre cose separate, e servono tutte e tre.
  // Se il progetto le ha accese, se questo apparecchio sa farlo, e quali
  // apparecchi hai già registrato.
  const [impronta, setImpronta] = useState({ accese: false, puo: false, apparecchi: [] });

  const [salvando, setSalvando] = useState("");
  const [err, setErr] = useState("");
  const [detto, setDetto] = useState("");

  const avvisa = useCallback((testo) => {
    setErr("");
    setDetto(testo);
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const u = hasAccounts() ? await getUser() : null;
      if (!vivo) return;
      setUtente(u);
      if (!u) {
        // Senza account non c'è un profilo, ma c'è questo browser: i negozi
        // che segui e i tuoi dati stanno lì, e restano tuoi.
        try {
          setNegozi(JSON.parse(localStorage.getItem("dress:favorites") || "[]"));
        } catch {
          /* niente salvato */
        }
        setCaricamento(false);
        return;
      }
      setEmail(u.email || "");
      try {
        const { profile } = await apiFetch("/api/profile/get");
        if (!vivo) return;
        setProfilo(profile);
        setCampi({
          nome: profile?.name || "",
          cognome: profile?.cognome || "",
          username: profile?.username || "",
          dataNascita: profile?.data_nascita || "",
          avatar: profile?.avatar || null,
          colore: profile?.dati?.coloreProfilo || COLORI_PROFILO[0],
        });
        setNegozi(Array.isArray(profile?.favorites) ? profile.favorites : []);
      } catch (e) {
        if (vivo) setErr(e.message);
      }
      try {
        const [accese, puo] = await Promise.all([passkeyAttive(), questoApparecchioSaFarlo()]);
        const apparecchi = accese ? await apparecchiRegistrati() : [];
        if (vivo) setImpronta({ accese, puo, apparecchi });
      } catch {
        /* niente Face ID: la pagina funziona lo stesso */
      }

      if (vivo) setCaricamento(false);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  async function aggiungiImpronta() {
    setErr("");
    setDetto("");
    setSalvando("impronta");
    try {
      await registraQuestoApparecchio();
      const aggiornati = await apparecchiRegistrati();
      setImpronta((i) => ({ ...i, apparecchi: aggiornati }));
      avvisa("Fatto. Da adesso su questo apparecchio entri senza password.");
    } catch (e) {
      setErr(e.message);
    }
    setSalvando("");
  }

  async function rimuoviImpronta(id) {
    if (!window.confirm("Tolgo questa chiave: su quell'apparecchio tornerai a entrare con la password. Procedo?")) return;
    setErr("");
    try {
      await togliApparecchio(id);
      const aggiornati = await apparecchiRegistrati();
      setImpronta((i) => ({ ...i, apparecchi: aggiornati }));
      avvisa("Tolta.");
    } catch (e) {
      setErr(e.message);
    }
  }

  const cambia = (campo) => (e) => setCampi((c) => ({ ...c, [campo]: e.target.value }));

  async function scegliFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // Piccola: è un quadratino di ottantaquattro pixel, non un poster. Una
      // foto da tre megabyte nella colonna del profilo sarebbe una foto da
      // tre megabyte scaricata a ogni apertura.
      const piccola = await fileToDataUrl(file, 320, 0.8);
      setCampi((c) => ({ ...c, avatar: piccola }));
      avvisa("Foto pronta. Premi «Salva il profilo» per tenerla.");
    } catch {
      setErr("Immagine non leggibile.");
    }
  }

  async function salvaProfilo() {
    setErr("");
    setDetto("");
    setSalvando("profilo");
    try {
      await completaProfilo({
        nome: campi.nome,
        cognome: campi.cognome,
        username: campi.username,
        dataNascita: campi.dataNascita,
        avatar: campi.avatar,
      });
      // Il colore sta nel campo libero del profilo: non è un dato di
      // sistema, e non merita una colonna sua.
      await apiFetch("/api/profile/save", {
        method: "POST",
        body: { dati: { ...(profilo?.dati || {}), coloreProfilo: campi.colore } },
      });
      avvisa("Profilo salvato.");
    } catch (e) {
      setErr(e.message);
    }
    setSalvando("");
  }

  async function salvaPassword() {
    setErr("");
    setDetto("");
    const controllo = controllaPassword(password.nuova);
    if (!controllo.ok) return setErr(controllo.messaggio);
    if (password.nuova !== password.ripeti) return setErr("Le due password non coincidono.");
    setSalvando("password");
    try {
      await cambiaPassword(password.nuova);
      setPassword({ nuova: "", ripeti: "" });
      avvisa("Password cambiata. Vale da adesso, e qui resti dentro: non devi rientrare. Sugli altri dispositivi la vecchia sessione resta aperta finché non usi «Esci da tutti i dispositivi» qui sotto.");
    } catch (e) {
      setErr(e.message);
    }
    setSalvando("");
  }

  async function salvaEmail() {
    setErr("");
    setDetto("");
    if (!email.trim() || email.trim() === utente?.email) return setErr("Scrivi un indirizzo diverso da quello di adesso.");
    setSalvando("email");
    try {
      await cambiaEmail(email.trim());
      avvisa(`Ti ho mandato una mail a ${email.trim()}: finché non apri quel link, l'indirizzo resta quello di prima.`);
    } catch (e) {
      setErr(e.message);
    }
    setSalvando("");
  }

  async function alternaNegozio(nome) {
    const ceGia = negozi.some((n) => nomeNegozio(n) === nome);
    const prossimi = ceGia ? negozi.filter((n) => nomeNegozio(n) !== nome) : [...negozi, nome];
    setNegozi(prossimi);
    try {
      localStorage.setItem("dress:favorites", JSON.stringify(prossimi));
    } catch {
      /* il browser non vuole scrivere */
    }
    if (!utente) return;
    try {
      await apiFetch("/api/profile/save", { method: "POST", body: { favorites: prossimi } });
    } catch (e) {
      setErr(e.message);
    }
  }

  async function esciDaTutto() {
    if (!window.confirm("Chiudo la sessione su TUTTI i dispositivi, questo compreso. Dovrai rientrare ovunque. Procedo?")) return;
    try {
      await esciDaTuttiIDispositivi();
      router.replace("/");
    } catch (e) {
      setErr(e.message);
    }
  }

  // Tutto quello che sappiamo di te, in un file. Quello che sta sul profilo e
  // quello che sta solo in questo browser: sono due posti diversi, e sarebbe
  // disonesto darne solo uno.
  function scaricaIMieiDati() {
    let local = {};
    try {
      for (const chiave of ["dress:session", "dress:savedItems", "dress:favorites"]) {
        const grezzo = localStorage.getItem(chiave);
        if (grezzo) local[chiave] = JSON.parse(grezzo);
      }
    } catch {
      /* qualcosa non si legge: il resto si scarica lo stesso */
    }
    const tutto = {
      esportatoIl: new Date().toISOString(),
      account: { email: utente?.email || null, id: utente?.id || null },
      profilo: profilo || null,
      soloInQuestoBrowser: local,
    };
    const blob = new Blob([JSON.stringify(tutto, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dress-i-miei-dati-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    avvisa("Scaricato.");
  }

  async function azzeraAnalisi() {
    if (!window.confirm("Cancello palette, stagione e stili, e riparti dal questionario e dalle foto.\n\nI capi che hai messo da parte e i completi salvati RESTANO. Procedo?")) return;
    try {
      for (const chiave of ["dress:session"]) localStorage.removeItem(chiave);
    } catch {
      /* niente da togliere */
    }
    try {
      await apiFetch("/api/profile/save", { method: "POST", body: { palette: null, dati: {} } });
    } catch {
      /* senza account bastava il browser */
    }
    router.push("/start");
  }

  async function eliminaAccount() {
    setErr("");
    const scritta = window.prompt(
      `Questa operazione è definitiva: spariscono account, palette, preferiti e completi salvati.\n\nPer confermare scrivi la tua email (${utente?.email}):`,
    );
    if (!scritta) return;
    setSalvando("elimina");
    try {
      await deleteAccount(scritta);
      router.replace("/");
    } catch (e) {
      setErr(
        e.code === "CONFIRM_EMAIL_MISMATCH"
          ? "L'email scritta non corrisponde: account non eliminato."
          : e.message,
      );
    }
    setSalvando("");
  }

  if (caricamento) {
    return (
      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 40, maxWidth: 720 }}>
        <div style={{ height: 30, width: 200, background: "var(--stone)" }} />
        <div style={{ height: 140, marginTop: 24, background: "var(--stone)", opacity: 0.7 }} />
      </div>
    );
  }

  return (
    <div className="wrap" style={{ paddingTop: 48, paddingBottom: 40, maxWidth: 720 }}>
      <h1 className="h2">Impostazioni</h1>
      <p className="muted">{utente ? utente.email : "Non hai un account: quello che scegli resta in questo browser."}</p>

      {err ? <p style={{ color: "var(--signal)", marginTop: 12 }}>{err}</p> : null}
      {detto ? <p className="muted" style={{ marginTop: 12 }}>{detto}</p> : null}

      {!utente ? (
        <Gruppo titolo="Profilo e accesso" detta="Foto, nome, password: sono cose dell’account, e un account qui non c’è.">
          <section style={{ display: "grid", gap: 10 }}>
            <p className="muted" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5 }}>
              Con un account i tuoi colori, i preferiti e i completi salvati ti seguono su qualsiasi
              dispositivo, invece di restare in questo browser.
            </p>
            <Link className="btn" href="/" style={{ justifySelf: "start" }}>Entra o iscriviti</Link>
          </section>
        </Gruppo>
      ) : null}

      {utente ? (
      <Gruppo titolo="Profilo" detta="Come ti chiami e che faccia hai dentro l’app.">
        <section style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <Avatar foto={campi.avatar} nome={campi.nome} cognome={campi.cognome} colore={campi.colore} />
            <div style={{ display: "grid", gap: 8 }}>
              <label className="btn ghost" style={{ cursor: "pointer", justifySelf: "start", padding: "6px 14px", fontSize: 13 }}>
                {campi.avatar ? "Cambia foto" : "Scegli una foto"}
                <input type="file" accept="image/*" onChange={scegliFoto} style={{ display: "none" }} />
              </label>
              {campi.avatar ? (
                <button
                  className="btn ghost"
                  onClick={() => setCampi((c) => ({ ...c, avatar: null }))}
                  style={{ justifySelf: "start", padding: "6px 14px", fontSize: 13 }}
                >
                  Togli la foto
                </button>
              ) : (
                <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>Senza foto restano le tue iniziali.</p>
              )}
            </div>
          </div>

          <div>
            <span className="label" style={{ display: "block", marginBottom: 8 }}>Colore</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {COLORI_PROFILO.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Colore ${c}`}
                  onClick={() => setCampi((x) => ({ ...x, colore: c }))}
                  style={{
                    width: 34,
                    height: 34,
                    background: c,
                    border: campi.colore === c ? "2px solid var(--ink)" : "1px solid var(--line)",
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </div>

          <label className="field">
            <span className="label">Nome</span>
            <input className="control" value={campi.nome} onChange={cambia("nome")} />
          </label>
          <label className="field">
            <span className="label">Cognome</span>
            <input className="control" value={campi.cognome} onChange={cambia("cognome")} />
          </label>
          <label className="field">
            <span className="label">Nome utente</span>
            <input className="control" value={campi.username} onChange={cambia("username")} />
          </label>
          <label className="field">
            <span className="label">Data di nascita</span>
            <input className="control" type="date" value={campi.dataNascita || ""} onChange={cambia("dataNascita")} />
          </label>

          <button className="btn" onClick={salvaProfilo} disabled={salvando === "profilo"} style={{ justifySelf: "start" }}>
            {salvando === "profilo" ? "Salvo…" : "Salva il profilo"}
          </button>
        </section>
      </Gruppo>
      ) : null}

      {utente ? (
      <Gruppo titolo="Accesso" detta="L’indirizzo con cui entri, la password, e le sessioni aperte altrove.">
        <section style={{ display: "grid", gap: 12 }}>
          <label className="field">
            <span className="label">Email</span>
            <input className="control" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <span className="muted" style={{ fontSize: 12, display: "block", marginTop: 6 }}>
              Cambiandolo ti mando una mail al nuovo indirizzo: finché non apri quel link, l&apos;accesso
              resta col vecchio.
            </span>
          </label>
          <button className="btn ghost" onClick={salvaEmail} disabled={salvando === "email"} style={{ justifySelf: "start" }}>
            {salvando === "email" ? "Mando…" : "Cambia email"}
          </button>
        </section>

        <section style={{ display: "grid", gap: 12 }}>
          <label className="field">
            <span className="label">Nuova password</span>
            <input className="control" type="password" value={password.nuova} autoComplete="new-password"
              onChange={(e) => setPassword((p) => ({ ...p, nuova: e.target.value }))} />
            <span className="muted" style={{ fontSize: 12, display: "block", marginTop: 6 }}>
              Almeno {LUNGHEZZA_MINIMA} caratteri.
            </span>
          </label>
          <label className="field">
            <span className="label">Ripetila</span>
            <input className="control" type="password" value={password.ripeti} autoComplete="new-password"
              onChange={(e) => setPassword((p) => ({ ...p, ripeti: e.target.value }))} />
          </label>
          <button className="btn ghost" onClick={salvaPassword} disabled={salvando === "password"} style={{ justifySelf: "start" }}>
            {salvando === "password" ? "Cambio…" : "Cambia password"}
          </button>
        </section>

        <section style={{ display: "grid", gap: 10 }}>
          <strong style={{ fontSize: 15 }}>Face ID e impronta</strong>
          <p className="muted" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5 }}>
            Al posto della password puoi usare la faccia o il dito. La chiave resta dentro questo
            apparecchio e non esce mai: a noi arriva solo che ti ha riconosciuto, mai la tua
            impronta né il tuo viso. La password resta valida: questa si aggiunge, non la sostituisce.
          </p>

          {impronta.apparecchi.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {impronta.apparecchi.map((a) => (
                <div key={a.id} className="card" style={{ padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{a.friendly_name || "Un apparecchio"}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Aggiunto il {new Date(a.created_at).toLocaleDateString("it-IT")}
                      {a.last_used_at ? ` · usato il ${new Date(a.last_used_at).toLocaleDateString("it-IT")}` : " · mai usato"}
                    </div>
                  </div>
                  <button className="btn ghost" onClick={() => rimuoviImpronta(a.id)} style={{ padding: "6px 12px", fontSize: 13 }}>
                    Togli
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {/* Tre motivi diversi per non poterlo offrire, e tre frasi diverse:
              "non funziona" senza dire perché è la risposta che fa perdere
              tempo a chi legge. */}
          {!impronta.accese ? (
            <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
              Non è ancora attivo su questa installazione di Dress.
            </p>
          ) : !impronta.puo ? (
            <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
              Questo apparecchio non ha un lettore d&apos;impronta né il riconoscimento del viso — o il
              browser non lo mette a disposizione. Provalo dal telefono.
            </p>
          ) : (
            <button className="btn ghost" onClick={aggiungiImpronta} disabled={salvando === "impronta"} style={{ justifySelf: "start" }}>
              {salvando === "impronta" ? "Aspetto l\u2019apparecchio…" : "Attiva su questo apparecchio"}
            </button>
          )}
        </section>

        <section style={{ display: "grid", gap: 8 }}>
          <p className="muted" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5 }}>
            Il telefono lasciato a qualcuno, il computer dell&apos;ufficio, una sessione aperta un anno
            fa su un dispositivo che non hai più: restano valide finché non le chiudi.
          </p>
          <button className="btn ghost" onClick={esciDaTutto} style={{ justifySelf: "start" }}>
            Esci da tutti i dispositivi
          </button>
        </section>
      </Gruppo>
      ) : null}

      <Gruppo titolo="I tuoi dati" detta="I negozi che vuoi vedere, e tutto quello che sappiamo di te.">
        <section style={{ display: "grid", gap: 10 }}>
          <span className="label">Negozi che segui</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {NEGOZI.map((n) => (
              <button key={n} className={negozi.some((x) => nomeNegozio(x) === n) ? "btn" : "btn ghost"} onClick={() => alternaNegozio(n)}
                style={{ padding: "6px 14px", fontSize: 13 }}>
                {n}
              </button>
            ))}
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
            {negozi.length ? `Ne segui ${negozi.length}.` : "Non ne segui nessuno: vedi tutti i negozi in catalogo."}
          </p>
        </section>

        <section style={{ display: "grid", gap: 8 }}>
          <p className="muted" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5 }}>
            Un file con dentro il tuo profilo, la palette, i preferiti e i completi salvati — sia
            quelli sul tuo account sia quelli che stanno solo in questo browser.
          </p>
          <button className="btn ghost" onClick={scaricaIMieiDati} style={{ justifySelf: "start" }}>
            Scarica i miei dati
          </button>
        </section>
      </Gruppo>

      <Gruppo titolo="Ricominciare, o smettere" detta="Due cose diverse: una si può disfare, l’altra no.">
        <section style={{ display: "grid", gap: 8 }}>
          <strong style={{ fontSize: 15 }}>Rifai l&apos;analisi da capo</strong>
          <p className="muted" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5 }}>
            Cancella palette, stagione e stili, e riparte dal questionario e dalle foto. I capi che
            hai messo da parte e i completi salvati restano dove sono.
          </p>
          <button className="btn ghost" onClick={azzeraAnalisi} style={{ justifySelf: "start" }}>
            Azzera e ricomincia
          </button>
        </section>

        {utente ? (
        <section style={{ display: "grid", gap: 8, borderTop: "1px solid var(--line)", paddingTop: 18 }}>
          <strong style={{ fontSize: 15, color: "var(--signal)" }}>Elimina l&apos;account</strong>
          <p className="muted" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5 }}>
            Definitivo. Spariscono account, palette, preferiti e completi salvati, e non si tornano a
            prendere. Se prima vuoi tenerne una copia, scarica i tuoi dati qui sopra.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn ghost" onClick={eliminaAccount} disabled={salvando === "elimina"}
              style={{ color: "var(--signal)", borderColor: "var(--signal)" }}>
              {salvando === "elimina" ? "Elimino…" : "Elimina l'account"}
            </button>
            <button className="btn ghost" onClick={async () => { await signOut(); router.replace("/"); }}>
              Esci
            </button>
          </div>
        </section>
        ) : null}
      </Gruppo>
    </div>
  );
}
