"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { paletteAggiornata } from "@/lib/stagioni";
import { spiegaStile } from "@/lib/data";
import { apiFetch, getUser } from "@/lib/session";
import { fasciaDaBudget } from "@/lib/ricerca";
import Gruppo from "@/components/Gruppo";
import StileConCapi from "@/components/StileConCapi";

// I tuoi colori e i tuoi stili.
//
// C'erano già, ma in fondo alla pagina del questionario: per rivederli si
// doveva ripassare da lì e scorrere tutta l'analisi. La voce "Stile" nella
// barra in basso portava al questionario, cioè a rifare una cosa già fatta,
// invece che al suo risultato. Adesso porta qui.
export default function TuoStile() {
  const [analisi, setAnalisi] = useState(null);
  const [profilo, setProfilo] = useState(null);
  const [budget, setBudget] = useState(null);
  const [caricamento, setCaricamento] = useState(true);

  // Prima il browser, poi il profilo: chi ha un account e cambia dispositivo
  // deve ritrovare i suoi colori, non una pagina vuota.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const s = JSON.parse(localStorage.getItem("dress:session") || "null");
        if (s?.result?.palette?.length) {
          if (vivo) {
            setAnalisi(s.result);
            setProfilo(s.profile || null);
            setBudget(s.budget || null);
            setCaricamento(false);
          }
          return;
        }
      } catch {
        /* niente in questo browser */
      }

      try {
        if (await getUser()) {
          const { profile } = await apiFetch("/api/profile/get");
          if (vivo && profile?.palette?.length) {
            setAnalisi({ palette: profile.palette, ...(profile.dati || {}) });
            setProfilo(profile.dati?.profilo || null);
            setBudget(profile.dati?.profilo?.budget || null);
          }
        }
      } catch {
        /* nessun account, o niente salvato */
      }
      if (vivo) setCaricamento(false);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  // I capi di tutti gli stili in una chiamata sola: cinque insieme il
  // database non le regge, e le rifiutava tutte per timeout.
  const [capiPerStile, setCapiPerStile] = useState(null);
  useEffect(() => {
    const colori = analisi?.palette;
    const nomi = (analisi?.stili || []).slice(0, 5).map((s) => s.nome);
    if (!colori?.length || !nomi.length) return;
    let vivo = true;
    fetch("/api/capi-per-stili", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        palette: colori,
        stili: nomi,
        genere: profilo?.sex === "female" ? "donna" : profilo?.sex === "male" ? "uomo" : null,
        escludiFast: true,
        perStile: 3,
        // Dentro quello che hai detto di poter spendere: sotto, perché
        // nessuno spende esattamente la cifra pensata, e un po' sopra.
        ...(budget ? fasciaDaBudget(budget) : {}),
      }),
    })
      .then((r) => r.json())
      .then((d) => vivo && setCapiPerStile(d?.perStile || {}))
      .catch(() => vivo && setCapiPerStile({}));
    return () => {
      vivo = false;
    };
  }, [analisi?.palette, analisi?.stili, profilo?.sex, budget]);

  const scegliStile = useCallback(
    (nome) => {
      setAnalisi((a) => ({ ...a, stileScelto: nome }));
      try {
        const s = JSON.parse(localStorage.getItem("dress:session") || "null") || {};
        s.result = { ...(s.result || {}), stileScelto: nome };
        localStorage.setItem("dress:session", JSON.stringify(s));
      } catch {
        /* il browser non vuole scrivere: resta scelto per questa visita */
      }
      // Sul profilo solo se c'è: senza account la scelta vive nel browser.
      apiFetch("/api/profile/save", {
        method: "POST",
        body: { dati: { ...(analisi || {}), stileScelto: nome } },
      }).catch(() => {});
    },
    [analisi],
  );

  const palette = analisi?.palette?.length ? paletteAggiornata(analisi) : [];
  const stili = analisi?.stili || [];

  if (caricamento) {
    return (
      <div className="wrap" style={{ paddingTop: 56, paddingBottom: 40, maxWidth: 860 }}>
        <div style={{ height: 34, width: 240, background: "var(--stone)" }} />
        <div style={{ height: 120, marginTop: 22, background: "var(--stone)", opacity: 0.7 }} />
      </div>
    );
  }

  // Nessuna analisi: non si mostra una pagina vuota, si dice cosa fare.
  if (!palette.length) {
    return (
      <div className="wrap" style={{ paddingTop: 56, paddingBottom: 40, maxWidth: 640 }}>
        <p className="eyebrow">I tuoi colori</p>
        <h1 className="h1" style={{ fontSize: "clamp(28px, 5vw, 46px)", marginTop: 14, marginBottom: 12 }}>
          Non li hai ancora
        </h1>
        <p className="lead" style={{ marginBottom: 28 }}>
          Servono una foto e qualche risposta: cinque minuti, una volta sola. Poi i tuoi colori e i
          tuoi stili stanno qui, e li ritrovi ogni volta che apri.
        </p>
        <Link className="btn" href="/start">Fai l&apos;analisi</Link>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ paddingTop: 56, paddingBottom: 40, maxWidth: 860 }}>
      <p className="eyebrow">Il tuo risultato</p>
      <h1 className="h1" style={{ fontSize: "clamp(28px, 5vw, 46px)", marginTop: 14, marginBottom: 10 }}>
        I tuoi colori e i tuoi stili
      </h1>
      {analisi?.season ? (
        <p className="lead" style={{ marginBottom: 6 }}>{analisi.season}</p>
      ) : null}
      {analisi?.styleReading ? (
        <p className="muted" style={{ maxWidth: "56ch", marginTop: 8 }}>{analisi.styleReading}</p>
      ) : null}

      <Gruppo titolo="I tuoi colori" detta="I cinque che ti stanno meglio. Sono questi a filtrare tutto il resto dell’app.">
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
          {palette.map((c) => (
            <div key={c.hex} className="card" style={{ overflow: "hidden" }}>
              <div style={{ height: 96, background: c.hex }} />
              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                <div className="muted" style={{ fontSize: 11, marginTop: 2, letterSpacing: "0.04em" }}>{c.hex}</div>
                {c.why ? (
                  <p className="muted" style={{ margin: "8px 0 0", fontSize: 12.5, lineHeight: 1.45 }}>{c.why}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Gruppo>

      {stili.length ? (
        <Gruppo
          titolo="I tuoi stili"
          detta="In ordine, dal più adatto. Sotto ognuno, capi veri del catalogo nei tuoi colori e dentro il tuo budget: guardali, e scegli quello che ti somiglia."
        >
          {stili.slice(0, 5).map((st, i) => (
            <StileConCapi
              key={st.nome + i}
              stile={st}
              posizione={i + 1}
              spiegazione={spiegaStile(st.nome)}
              scelto={analisi?.stileScelto === st.nome}
              capi={capiPerStile ? capiPerStile[st.nome] || [] : null}
              onScegli={scegliStile}
            />
          ))}
        </Gruppo>
      ) : null}

      <Gruppo titolo="Non ti convince">
        <div style={{ display: "grid", gap: 10 }}>
          <Link href="/start" className="btn-app chiaro">Rifai l&apos;analisi</Link>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Se hai cambiato capelli, o la foto non era buona. I capi che hai messo da parte restano
            dove sono.
          </p>
        </div>
      </Gruppo>
    </div>
  );
}
