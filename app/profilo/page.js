"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import ColorePelle from "@/components/ColorePelle";
import Drappeggio from "@/components/Drappeggio";
import Gruppo from "@/components/Gruppo";
import TestArmocromia from "@/components/TestArmocromia";
import { EYES, FAMIGLIE_STILI, HAIR, spiegaStile } from "@/lib/data";
import { fileToDataUrl } from "@/lib/img";
import { FORME } from "@/lib/proporzioni";
import { tonoPelle } from "@/lib/pelle";
import { aggiornaSessione, arricchisciConAI, eseguiAnalisi, leggiSessione, salvaAnalisi } from "@/lib/analisiCompleta";
import { apiFetch, completaProfilo, getUser, hasAccounts } from "@/lib/session";

// Il profilo.
//
// Stava dentro Impostazioni, in mezzo alla password e alla cancellazione
// dell'account: chi voleva cambiare una foto doveva prima immaginarsi che
// "la propria faccia" fosse un'impostazione. Adesso sta nel menu in basso,
// dove stanno le cose che si guardano.
//
// E soprattutto: qui le informazioni dell'analisi si possono CAMBIARE. Prima
// si scrivevano una volta sola, all'iscrizione, e per correggere il colore
// degli occhi o rifare una foto venuta male bisognava azzerare tutto e
// ripercorrere il questionario dal primo passo. Adesso si tocca «Modifica»,
// si cambia quel che serve — anche una riga sola, anche solo una foto — e al
// salvataggio palette, stagione e stili si rifanno da soli.

const COLORI_PROFILO = [
  "#1B2A41", "#5C1F26", "#B98F5E", "#9AA88B",
  "#3F4A3C", "#7A5C8E", "#B5654A", "#111213",
];

const VUOTO = {
  height: "", weight: "", forma: "", hair: "", eyes: "", pelle: "", style: "", sex: "",
};

// La correzione a mano, tradotta in numeri.
//
// Il motore accettava già una correzione che scavalca tutto — "nessuna misura
// vale quanto una persona che si guarda allo specchio", diceva il commento —
// ma nessuna pagina gliela passava: era una promessa senza il tasto per
// mantenerla. Questi sono i valori con cui la si mantiene.
//
// Non si chiede un numero: si chiede la cosa che una persona sa di sé. Poi la
// traduciamo noi, perché "quanto sei luminoso in scala Lab" non è una domanda.
const LUCE = { chiara: 74, media: 58, scura: 36 };
const CONTRASTO = { netto: 48, morbido: 16 };

const SCELTE_CORREZIONE = [
  {
    campo: "sottotono",
    voce: "Sottotono",
    detta: "L'oro ti illumina o ti spegne? Il caldo tira al dorato, il freddo al rosato.",
    opzioni: [{ id: "caldo", nome: "Caldo" }, { id: "freddo", nome: "Freddo" }],
    valore: (id) => id,
  },
  {
    campo: "luce",
    voce: "Quanto sei chiaro",
    detta: "Nel complesso, pelle e capelli insieme: non solo la pelle.",
    opzioni: [{ id: "chiara", nome: "Chiaro" }, { id: "media", nome: "Medio" }, { id: "scura", nome: "Scuro" }],
    valore: (id) => LUCE[id],
  },
  {
    campo: "contrasto",
    voce: "Contrasto",
    detta: "La distanza fra i tuoi capelli e la tua pelle. Netta come il bianco e nero, o sfumata.",
    opzioni: [{ id: "netto", nome: "Netto" }, { id: "morbido", nome: "Morbido" }],
    valore: (id) => CONTRASTO[id],
  },
];

// Dal numero salvato alla voce accesa: serve a riaprire la pagina trovando
// selezionato quello che si era scelto, invece di tre caselle vuote.
const idScelto = (campo, correzione) => {
  const v = correzione?.[campo];
  if (v == null) return "";
  if (campo === "sottotono") return v;
  const tabella = campo === "luce" ? LUCE : CONTRASTO;
  return Object.keys(tabella).find((k) => tabella[k] === v) || "";
};

const nomeForma = (id) => FORME.find((f) => f.id === id)?.nome || null;
const nomeSesso = (v) => ({ female: "Donna", male: "Uomo", nonbinary: "Non binario" }[v] || null);

// Una riga di sola lettura: l'etichetta e il valore, o un trattino onesto
// quando quel dato non c'è. Nascondere le righe vuote farebbe credere che
// quella cosa non la chiediamo, e non si saprebbe che si può aggiungere.
function Riga({ voce, valore, quadratino = null }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
      <span className="muted" style={{ fontSize: 13 }}>{voce}</span>
      <span style={{ fontSize: 14, textAlign: "right", display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        {quadratino ? (
          <span aria-hidden="true" style={{ width: 18, height: 18, background: quadratino, border: "1px solid rgba(0,0,0,0.14)", flex: "0 0 18px" }} />
        ) : null}
        <span style={{ color: valore ? "var(--ink)" : "var(--greige)" }}>{valore || "—"}</span>
      </span>
    </div>
  );
}

// Una foto dell'analisi: si guarda, e si rifà quando si vuole.
function Foto({ etichetta, valore, modifica = false, onFile, onTogli }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <span className="label">{etichetta}</span>
      <div style={{ aspectRatio: "3/4", background: "var(--stone)", display: "grid", placeItems: "center", overflow: "hidden", border: "1px solid var(--line)" }}>
        {valore ? (
          <img src={valore} alt={etichetta} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span className="muted" style={{ fontSize: 12.5, textAlign: "center", padding: 12, lineHeight: 1.4 }}>
            Non c&apos;è, o è rimasta su un altro dispositivo
          </span>
        )}
      </div>
      {modifica ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <label className="btn ghost" style={{ cursor: "pointer", padding: "6px 12px", fontSize: 12.5 }}>
            {valore ? "Rifai la foto" : "Aggiungi"}
            <input type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
          </label>
          {valore ? (
            <button className="btn ghost" onClick={onTogli} style={{ padding: "6px 12px", fontSize: 12.5 }}>Togli</button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function Profilo() {
  const [utente, setUtente] = useState(null);
  const [caricamento, setCaricamento] = useState(true);
  const [err, setErr] = useState("");
  const [detto, setDetto] = useState("");
  const [salvando, setSalvando] = useState("");
  const [mancanze, setMancanze] = useState([]);

  // Chi sei: quello che si vede nell'app.
  const [identita, setIdentita] = useState({ nome: "", cognome: "", username: "", dataNascita: "", avatar: null, colore: COLORI_PROFILO[0] });
  const [modificaIdentita, setModificaIdentita] = useState(false);

  // Le informazioni da cui esce la palette. Due copie: quella salvata e la
  // bozza che si sta scrivendo. Senza la bozza, «Annulla» non potrebbe
  // annullare niente.
  const [info, setInfo] = useState(VUOTO);
  const [bozza, setBozza] = useState(VUOTO);
  const [foto, setFoto] = useState({ closeup: null, fullbody: null });
  const [bozzaFoto, setBozzaFoto] = useState({ closeup: null, fullbody: null });
  const [budget, setBudget] = useState("");
  const [bozzaBudget, setBozzaBudget] = useState("");
  const [modificaInfo, setModificaInfo] = useState(false);

  // Le risposte al drappeggio pesano più di ogni domanda del questionario
  // (il confronto oro/argento vale 3.4 contro il 2.4 della domanda più
  // pesante): rigenerare senza poterle rifare voleva dire rigenerare col
  // pezzo più importante bloccato.
  const [testRisposte, setTestRisposte] = useState({});
  const [bozzaTest, setBozzaTest] = useState({});
  const [mostraDrappeggio, setMostraDrappeggio] = useState(false);

  const [correzione, setCorrezione] = useState(null);
  const [bozzaCorrezione, setBozzaCorrezione] = useState({});

  const [risultato, setRisultato] = useState(null);

  const avvisa = useCallback((testo) => {
    setErr("");
    setDetto(testo);
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      // Prima questo browser: è l'unico posto in cui stanno le foto. Non le
      // mandiamo da nessuna parte, ed è una promessa che vale più della
      // comodità di ritrovarle su un altro telefono.
      const sessione = leggiSessione();
      if (vivo && sessione) {
        const p = { ...VUOTO, ...(sessione.profile || {}) };
        setInfo(p);
        setBozza(p);
        setFoto({ closeup: sessione.closeup || null, fullbody: sessione.fullbody || null });
        setBozzaFoto({ closeup: sessione.closeup || null, fullbody: sessione.fullbody || null });
        setBudget(sessione.budget || "");
        setBozzaBudget(sessione.budget || "");
        setTestRisposte(sessione.testRisposte || {});
        setBozzaTest(sessione.testRisposte || {});
        setCorrezione(sessione.correzione || null);
        setBozzaCorrezione(sessione.correzione || {});
        setRisultato(sessione.result || null);
      }

      let u = null;
      try {
        u = hasAccounts() ? await getUser() : null;
      } catch {
        // Rete assente o sessione illeggibile: si va avanti come senza
        // account. Restare sullo scheletro per sempre sarebbe peggio.
      }
      if (!vivo) return;
      setUtente(u);

      if (u) {
        try {
          const { profile } = await apiFetch("/api/profile/get");
          if (!vivo) return;
          setIdentita({
            nome: profile?.name || "",
            cognome: profile?.cognome || "",
            username: profile?.username || "",
            dataNascita: profile?.data_nascita || "",
            avatar: profile?.avatar || null,
            colore: profile?.dati?.coloreProfilo || COLORI_PROFILO[0],
          });
          // Il profilo sul server riempie i buchi del browser, non lo
          // sovrascrive: chi ha appena cambiato qualcosa qui deve ritrovarlo.
          if (!sessione?.profile && profile?.dati?.profilo) {
            const p = { ...VUOTO, ...profile.dati.profilo };
            setInfo(p);
            setBozza(p);
            setBudget(profile.dati.profilo.budget || "");
            setBozzaBudget(profile.dati.profilo.budget || "");
          }
          if (!sessione?.testRisposte && profile?.dati?.testArmocromia) {
            setTestRisposte(profile.dati.testArmocromia);
            setBozzaTest(profile.dati.testArmocromia);
          }
          if (!sessione?.correzione && profile?.dati?.correzione) {
            setCorrezione(profile.dati.correzione);
            setBozzaCorrezione(profile.dati.correzione);
          }
          if (!sessione?.result && profile?.palette?.length) {
            setRisultato({ palette: profile.palette, ...(profile.dati || {}) });
          }
        } catch (e) {
          if (vivo) setErr(e.message);
        }
      }
      if (vivo) setCaricamento(false);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const cambiaIdentita = (campo) => (e) => setIdentita((c) => ({ ...c, [campo]: e.target.value }));
  const cambiaBozza = (campo) => (e) => setBozza((c) => ({ ...c, [campo]: e.target.value }));

  async function scegliAvatar(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // Piccola: è un quadratino, non un poster.
      const piccola = await fileToDataUrl(file, 320, 0.8);
      setIdentita((c) => ({ ...c, avatar: piccola }));
      avvisa("Foto pronta. Premi «Salva» per tenerla.");
    } catch {
      setErr("Immagine non leggibile.");
    }
  }

  async function scegliFotoAnalisi(quale, e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setBozzaFoto((f) => ({ ...f, [quale]: null }));
      const url = await fileToDataUrl(file);
      setBozzaFoto((f) => ({ ...f, [quale]: url }));
      setErr("");
    } catch {
      setErr("Non sono riuscito a leggere l'immagine. Riprova con un'altra foto.");
    }
  }

  async function salvaIdentita() {
    setErr("");
    setDetto("");
    setSalvando("identita");
    try {
      await completaProfilo({
        nome: identita.nome,
        cognome: identita.cognome,
        username: identita.username,
        dataNascita: identita.dataNascita,
        avatar: identita.avatar,
      });
      // Il colore sta nel campo libero del profilo: non è un dato di sistema,
      // e non merita una colonna sua.
      await apiFetch("/api/profile/save", { method: "POST", body: { dati: { coloreProfilo: identita.colore } } });
      setModificaIdentita(false);
      avvisa("Salvato.");
    } catch (e) {
      setErr(e.message);
    }
    setSalvando("");
  }

  /**
   * Rifà l'analisi e la salva ovunque debba stare.
   *
   * Una procedura sola per due tasti — «Salva e rigenera» e «Applica la
   * correzione» — perché fanno la stessa cosa con dati diversi, e due copie
   * della stessa procedura prima o poi si comportano in due modi diversi.
   */
  async function rigenera({ profilo, foto: nuoveFoto, budget: nuovoBudget, test, corr, quale, detto: messaggio }) {
    setErr("");
    setDetto("");
    setMancanze([]);
    setSalvando(quale);
    try {
      const { risultato: nuovo, avvisi } = await eseguiAnalisi({
        profile: profilo,
        closeup: nuoveFoto.closeup,
        fullbody: nuoveFoto.fullbody,
        testRisposte: test,
        correzione: corr,
      });

      // Lo stile che avevi scelto resta scelto, se è ancora fra i consigliati:
      // cambiare l'altezza non è un motivo per perderlo.
      const primaScelto = risultato?.stileScelto || null;
      const restaScelto = (nuovo.stili || []).some((st) => st.nome === primaScelto) ? primaScelto : null;
      const completo = { ...nuovo, stileScelto: restaScelto };

      setInfo(profilo);
      setFoto(nuoveFoto);
      setBudget(nuovoBudget);
      setTestRisposte(test);
      setCorrezione(corr);
      setRisultato(completo);
      setMancanze(avvisi);

      aggiornaSessione({
        profile: profilo,
        closeup: nuoveFoto.closeup,
        fullbody: nuoveFoto.fullbody,
        budget: nuovoBudget,
        testRisposte: test,
        correzione: corr,
        result: completo,
      });
      const daSalvare = { profile: profilo, budget: nuovoBudget, testRisposte: test, correzione: corr, stileScelto: restaScelto };
      await salvaAnalisi({ risultato: completo, ...daSalvare });

      avvisa(
        `${messaggio}: ${completo.season}.` +
          (avvisi.length ? " Qui sotto c'è cosa lo renderebbe ancora più preciso." : ""),
      );
      setSalvando("");

      // Le parole, se l'AI risponde. Il risultato è già completo senza, e
      // aspettarla col tasto spento terrebbe fermo chi ha già finito.
      const parole = await arricchisciConAI(completo, profilo);
      if (parole) {
        const arricchito = { ...completo, ...parole };
        setRisultato(arricchito);
        aggiornaSessione({ result: arricchito });
        await salvaAnalisi({ risultato: arricchito, ...daSalvare });
      }
      return true;
    } catch (e) {
      setErr("Non sono riuscito a rifare l'analisi. Se hai cambiato una foto, riprova con una più luminosa.");
      setSalvando("");
      return false;
    }
  }

  /**
   * Il salvataggio che rigenera tutto.
   *
   * Non importa se hai cambiato dieci righe o solo il colore degli occhi: da
   * qui riparte la stessa analisi del questionario, con i dati nuovi e le
   * foto nuove. È quello che ci si aspetta premendo «Salva» sotto a dei dati
   * da cui dipende un risultato — e finora non succedeva.
   */
  async function salvaInformazioni() {
    const fatto = await rigenera({
      profilo: bozza,
      foto: bozzaFoto,
      budget: bozzaBudget,
      test: bozzaTest,
      corr: correzione,
      quale: "info",
      detto: "Rifatto tutto con i dati nuovi",
    });
    if (fatto) setModificaInfo(false);
  }

  /** La correzione a mano: comanda su tutto, e da qui si toglie. */
  function applicaCorrezione() {
    const pulita = {};
    for (const { campo, valore } of SCELTE_CORREZIONE) {
      const id = bozzaCorrezione[campo];
      if (id) pulita[campo] = valore(id);
    }
    rigenera({
      profilo: info,
      foto,
      budget,
      test: testRisposte,
      corr: Object.keys(pulita).length ? pulita : null,
      quale: "correzione",
      detto: "Corretto",
    });
  }

  function togliCorrezione() {
    setBozzaCorrezione({});
    rigenera({
      profilo: info, foto, budget, test: testRisposte, corr: null,
      quale: "correzione", detto: "Correzione tolta, torna la misura",
    });
  }

  function annullaInformazioni() {
    setBozza(info);
    setBozzaFoto(foto);
    setBozzaBudget(budget);
    setBozzaTest(testRisposte);
    setModificaInfo(false);
    setErr("");
    setDetto("");
  }

  if (caricamento) {
    return (
      <div className="wrap" style={{ paddingTop: 56, paddingBottom: 40, maxWidth: 720 }}>
        <div style={{ height: 30, width: 200, background: "var(--stone)" }} />
        <div style={{ height: 140, marginTop: 24, background: "var(--stone)", opacity: 0.7 }} />
      </div>
    );
  }

  const tono = tonoPelle(info.pelle);
  const quanteRisposte = Object.values(bozzaTest).filter((v) => v !== undefined && v !== null).length;

  return (
    <div className="wrap" style={{ paddingTop: 56, paddingBottom: 40, maxWidth: 720 }}>
      <p className="eyebrow">Profilo</p>

      <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 14 }}>
        <Avatar foto={identita.avatar} nome={identita.nome} cognome={identita.cognome} colore={identita.colore} />
        <div style={{ minWidth: 0 }}>
          <h1 className="h2" style={{ margin: 0, fontSize: "clamp(22px, 4vw, 30px)" }}>
            {[identita.nome, identita.cognome].filter(Boolean).join(" ") || identita.username || "Ciao"}
          </h1>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 13, overflowWrap: "anywhere" }}>
            {utente ? utente.email : "Nessun account: quello che scegli resta in questo browser."}
          </p>
        </div>
      </div>

      {err ? <p style={{ color: "var(--signal)", marginTop: 14 }}>{err}</p> : null}
      {detto ? <p className="muted" style={{ marginTop: 14 }}>{detto}</p> : null}

      {/* ── Chi sei ─────────────────────────────────────────────────── */}
      {utente ? (
        <Gruppo titolo="Chi sei" detta="Il nome e la faccia che vedi dentro l’app. Nell’analisi non entrano.">
          <section style={{ display: "grid", gap: 14 }}>
            {!modificaIdentita ? (
              <>
                <div>
                  <Riga voce="Nome" valore={identita.nome} />
                  <Riga voce="Cognome" valore={identita.cognome} />
                  <Riga voce="Nome utente" valore={identita.username} />
                  <Riga voce="Data di nascita" valore={identita.dataNascita ? new Date(identita.dataNascita).toLocaleDateString("it-IT") : ""} />
                  <Riga voce="Colore" valore={identita.colore.toUpperCase()} quadratino={identita.colore} />
                </div>
                <button className="btn ghost" onClick={() => setModificaIdentita(true)} style={{ justifySelf: "start" }}>
                  Modifica
                </button>
              </>
            ) : (
              <>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <Avatar foto={identita.avatar} nome={identita.nome} cognome={identita.cognome} colore={identita.colore} />
                  <div style={{ display: "grid", gap: 8 }}>
                    <label className="btn ghost" style={{ cursor: "pointer", justifySelf: "start", padding: "6px 14px", fontSize: 13 }}>
                      {identita.avatar ? "Cambia foto" : "Scegli una foto"}
                      <input type="file" accept="image/*" onChange={scegliAvatar} style={{ display: "none" }} />
                    </label>
                    {identita.avatar ? (
                      <button className="btn ghost" onClick={() => setIdentita((c) => ({ ...c, avatar: null }))}
                        style={{ justifySelf: "start", padding: "6px 14px", fontSize: 13 }}>
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
                      <button key={c} type="button" aria-label={`Colore ${c}`} onClick={() => setIdentita((x) => ({ ...x, colore: c }))}
                        style={{ width: 34, height: 34, background: c, border: identita.colore === c ? "2px solid var(--ink)" : "1px solid var(--line)", cursor: "pointer", padding: 0 }} />
                    ))}
                  </div>
                </div>

                <label className="field"><span className="label">Nome</span>
                  <input className="control" value={identita.nome} onChange={cambiaIdentita("nome")} /></label>
                <label className="field"><span className="label">Cognome</span>
                  <input className="control" value={identita.cognome} onChange={cambiaIdentita("cognome")} /></label>
                <label className="field"><span className="label">Nome utente</span>
                  <input className="control" value={identita.username} onChange={cambiaIdentita("username")} /></label>
                <label className="field"><span className="label">Data di nascita</span>
                  <input className="control" type="date" value={identita.dataNascita || ""} onChange={cambiaIdentita("dataNascita")} /></label>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="btn" onClick={salvaIdentita} disabled={salvando === "identita"}>
                    {salvando === "identita" ? "Salvo…" : "Salva"}
                  </button>
                  <button className="btn ghost" onClick={() => setModificaIdentita(false)} disabled={salvando === "identita"}>Annulla</button>
                </div>
              </>
            )}
          </section>
        </Gruppo>
      ) : null}

      {/* ── Informazioni ────────────────────────────────────────────── */}
      <Gruppo
        titolo="Informazioni"
        detta="Le risposte e le foto da cui escono i tuoi colori. Cambiane una, o tutte: al salvataggio la palette si rifà."
      >
        <section style={{ display: "grid", gap: 16 }}>
          {!modificaInfo ? (
            <>
              <div className="two-eq">
                <Foto etichetta="Primo piano" valore={foto.closeup} />
                <Foto etichetta="Figura intera" valore={foto.fullbody} />
              </div>

              <div>
                <Riga voce="Altezza" valore={info.height ? `${info.height} cm` : ""} />
                <Riga voce="Peso" valore={info.weight ? `${info.weight} kg` : ""} />
                <Riga voce="Proporzioni" valore={nomeForma(info.forma)} />
                <Riga voce="Capelli" valore={info.hair} />
                <Riga voce="Occhi" valore={info.eyes} />
                <Riga voce="Pelle" valore={tono?.nome} quadratino={tono?.hex} />
                <Riga voce="Sesso" valore={nomeSesso(info.sex)} />
                <Riga voce="Stile attuale" valore={info.style} />
                <Riga voce="Budget per capo" valore={budget ? `${budget} €` : ""} />
              </div>

              <button className="btn" onClick={() => setModificaInfo(true)} style={{ justifySelf: "start" }}>
                Modifica
              </button>
            </>
          ) : (
            <>
              <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
                Le foto restano in questo dispositivo: i colori si misurano qui dentro, e da qui non
                escono. È anche il motivo per cui su un telefono nuovo non le ritrovi.
              </p>

              <div className="two-eq">
                <Foto
                  etichetta="Primo piano" valore={bozzaFoto.closeup} modifica
                  onFile={(e) => scegliFotoAnalisi("closeup", e)}
                  onTogli={() => setBozzaFoto((f) => ({ ...f, closeup: null }))}
                />
                <Foto
                  etichetta="Figura intera" valore={bozzaFoto.fullbody} modifica
                  onFile={(e) => scegliFotoAnalisi("fullbody", e)}
                  onTogli={() => setBozzaFoto((f) => ({ ...f, fullbody: null }))}
                />
              </div>

              <label className="field"><span className="label">Altezza (cm)</span>
                <input className="control" inputMode="numeric" value={bozza.height} onChange={cambiaBozza("height")} placeholder="es. 178" /></label>

              <label className="field"><span className="label">Peso (kg) — facoltativo</span>
                <input className="control" inputMode="numeric" value={bozza.weight} onChange={cambiaBozza("weight")} placeholder="es. 72" /></label>

              <label className="field"><span className="label">Proporzioni — facoltativo</span>
                <select className="control" value={bozza.forma} onChange={cambiaBozza("forma")}>
                  <option value="">Preferisco non dirlo</option>
                  {FORME.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select></label>

              <label className="field"><span className="label">Colore capelli</span>
                <select className="control" value={bozza.hair} onChange={cambiaBozza("hair")}>
                  <option value="">Scegli…</option>
                  {HAIR.map((h) => <option key={h} value={h}>{h}</option>)}
                </select></label>

              <label className="field"><span className="label">Colore occhi</span>
                <select className="control" value={bozza.eyes} onChange={cambiaBozza("eyes")}>
                  <option value="">Scegli…</option>
                  {EYES.map((h) => <option key={h} value={h}>{h}</option>)}
                </select></label>

              <div className="field">
                <span className="label">Colore della pelle</span>
                <ColorePelle valore={bozza.pelle} onCambia={(id) => setBozza((b) => ({ ...b, pelle: id }))} />
              </div>

              {/* Il drappeggio pesa più di ogni domanda del questionario, ed è
                  l'unico momento in cui uno GUARDA sé stesso accanto a un
                  colore invece di ricordare. Rigenerare senza poterlo rifare
                  voleva dire tenere bloccato il pezzo che conta di più.
                  Chiuso di suo: è lungo, e chi è venuto a correggere
                  l'altezza non deve scavalcarlo. */}
              <div className="field">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <span className="label">Il drappeggio e le domande</span>
                  <button className="btn ghost" type="button" onClick={() => setMostraDrappeggio((v) => !v)}
                    style={{ padding: "6px 12px", fontSize: 12.5 }}>
                    {mostraDrappeggio ? "Chiudi" : quanteRisposte ? "Rifallo" : "Fallo"}
                  </button>
                </div>
                <span className="muted" style={{ fontSize: 12.5, display: "block", marginTop: 6, lineHeight: 1.45 }}>
                  {quanteRisposte
                    ? `Hai risposto a ${quanteRisposte} ${quanteRisposte === 1 ? "domanda" : "domande"}. Pesano più della foto, e restano valide finché non le cambi.`
                    : "Non l'hai mai fatto. Sono le domande che fa un armocromista prima di appoggiarti i teli sotto il viso, e pesano più della foto."}
                </span>

                {mostraDrappeggio ? (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ marginBottom: 22 }}>
                      <Drappeggio
                        foto={bozzaFoto.closeup}
                        scelte={bozzaTest}
                        onScelta={(id, v) => setBozzaTest((r) => ({ ...r, [id]: v }))}
                      />
                    </div>
                    <TestArmocromia
                      risposte={bozzaTest}
                      onRisposta={(id, v) => setBozzaTest((r) => ({ ...r, [id]: v }))}
                      compatto
                    />
                  </div>
                ) : null}
              </div>

              <label className="field"><span className="label">Sesso</span>
                <select className="control" value={bozza.sex} onChange={cambiaBozza("sex")}>
                  <option value="">Preferisco non specificare</option>
                  <option value="female">Donna</option>
                  <option value="male">Uomo</option>
                  <option value="nonbinary">Non binario</option>
                </select></label>

              <label className="field"><span className="label">Il tuo stile attuale</span>
                <select className="control" value={bozza.style} onChange={cambiaBozza("style")}>
                  <option value="">Scegli…</option>
                  <option value="Non so ancora — aiutami a scoprirlo">Non so ancora — aiutami a scoprirlo</option>
                  {FAMIGLIE_STILI.map((f) => (
                    <optgroup key={f.famiglia} label={f.famiglia}>
                      {f.stili.map((st) => (
                        <option key={st} value={st} title={spiegaStile(st)}>
                          {st}{spiegaStile(st) ? ` — ${spiegaStile(st).split(/[.:]/)[0]}` : ""}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select></label>

              <label className="field" style={{ maxWidth: 260 }}><span className="label">Budget per capo (€)</span>
                <input className="control" inputMode="numeric" value={bozzaBudget} onChange={(e) => setBozzaBudget(e.target.value)} placeholder="es. 60" /></label>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn" onClick={salvaInformazioni} disabled={salvando === "info"}>
                  {salvando === "info" ? "Rifaccio l’analisi…" : "Salva e rigenera"}
                </button>
                <button className="btn ghost" onClick={annullaInformazioni} disabled={salvando === "info"}>Annulla</button>
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5 }}>
                Salvando, palette, stagione e stili si rifanno con questi dati. I capi che hai messo
                da parte e i completi salvati restano dove sono.
              </p>
            </>
          )}

          {mancanze.length ? (
            <div className="card" style={{ padding: 16, display: "grid", gap: 8, borderColor: "var(--signal)" }}>
              <strong style={{ fontSize: 14 }}>Il risultato può essere migliore</strong>
              {mancanze.map((a) => (
                <p key={a} className="muted" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5 }}>{a}</p>
              ))}
            </div>
          ) : null}
        </section>
      </Gruppo>

      {/* ── Quello che ne esce ──────────────────────────────────────── */}
      {risultato?.palette?.length ? (
        <Gruppo titolo="Quello che ne esce" detta="Il risultato di adesso. Cambia da solo ogni volta che salvi qui sopra.">
          <section style={{ display: "grid", gap: 12 }}>
            {risultato.season ? <strong style={{ fontSize: 17 }}>{risultato.season}</strong> : null}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {risultato.palette.slice(0, 12).map((c) => (
                <span key={c.hex + c.name} title={`${c.name} ${c.hex}`}
                  style={{ width: 38, height: 38, background: c.hex, border: "1px solid rgba(0,0,0,0.10)", display: "block" }} />
              ))}
            </div>
            <Link href="/tuo-stile" className="btn ghost" style={{ justifySelf: "start" }}>Vedi colori e stili</Link>
          </section>

          {/* La correzione a mano.
              Il motore la accettava da sempre — e il commento accanto diceva
              che nessuna misura vale quanto una persona che si guarda allo
              specchio — ma nessuna pagina gliela passava: chi leggeva una
              stagione che non era la sua poteva solo rifare il questionario e
              sperare in un risultato diverso. Adesso ha l'ultima parola, e
              può ritirarla. */}
          <section style={{ display: "grid", gap: 14 }}>
            <div>
              <strong style={{ fontSize: 15 }}>Non ti somiglia? Correggila tu</strong>
              <p className="muted" style={{ margin: "6px 0 0", fontSize: 13.5, lineHeight: 1.5 }}>
                La misura può sbagliare: la luce di una stanza, una foto storta, un caso al limite.
                Quello che vedi allo specchio vale di più, e qui comanda. Cambia solo quello di cui
                sei sicuro: il resto resta come l&apos;abbiamo misurato.
              </p>
            </div>

            {correzione ? (
              <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.5, borderLeft: "2px solid var(--ink)", paddingLeft: 12 }}>
                Adesso comanda la tua correzione, non la misura. Si vede anche nel risultato, dove
                al posto di com&apos;è stato deciso c&apos;è scritto «tua correzione».
              </p>
            ) : null}

            {SCELTE_CORREZIONE.map((scelta) => {
              const attuale = bozzaCorrezione[scelta.campo] || "";
              return (
                <div key={scelta.campo} style={{ display: "grid", gap: 7 }}>
                  <span className="label">{scelta.voce}</span>
                  <span className="muted" style={{ fontSize: 12, lineHeight: 1.4 }}>{scelta.detta}</span>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" className={!attuale ? "btn" : "btn ghost"}
                      onClick={() => setBozzaCorrezione((c) => ({ ...c, [scelta.campo]: "" }))}
                      style={{ padding: "6px 14px", fontSize: 13 }}>
                      Come misurato
                    </button>
                    {scelta.opzioni.map((o) => (
                      <button key={o.id} type="button" className={attuale === o.id ? "btn" : "btn ghost"}
                        onClick={() => setBozzaCorrezione((c) => ({ ...c, [scelta.campo]: o.id }))}
                        style={{ padding: "6px 14px", fontSize: 13 }}>
                        {o.nome}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn" onClick={applicaCorrezione} disabled={salvando === "correzione"}>
                {salvando === "correzione" ? "Rifaccio…" : "Applica la correzione"}
              </button>
              {correzione ? (
                <button className="btn ghost" onClick={togliCorrezione} disabled={salvando === "correzione"}>
                  Torna alla misura
                </button>
              ) : null}
            </div>
          </section>
        </Gruppo>
      ) : (
        <Gruppo titolo="Quello che ne esce" detta="Non hai ancora un’analisi.">
          <div>
            <Link href="/start" className="btn">Falla adesso</Link>
          </div>
        </Gruppo>
      )}

      <Gruppo titolo="Altro" detta="Password, accesso, negozi che segui, cancellazione dell’account.">
        <div>
          <Link href="/impostazioni" className="btn ghost">Impostazioni</Link>
        </div>
      </Gruppo>
    </div>
  );
}
