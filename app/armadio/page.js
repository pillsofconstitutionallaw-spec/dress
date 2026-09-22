"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch, getUser } from "@/lib/session";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { coloreDominante, RUOLI_ARMADIO } from "@/lib/armadio";
import { fileToDataUrl } from "@/lib/img";

// Il tuo armadio.
//
// Il catalogo dice cosa si può comprare. Questo dice cosa hai già — ed è la
// domanda che uno si fa davvero la mattina. Si fotografa un capo, l'app
// riconosce cos'è e di che colore, e da lì in poi se lo ricorda.
//
// Quello che l'app capisce si può correggere sempre: chi ha il capo in mano
// ne sa più di un modello che guarda una foto.

const LATO_MISURA = 64; // basta poco per la media di un colore

export default function Armadio() {
  const [chi, setChi] = useState(undefined); // undefined = ancora non so
  const [capi, setCapi] = useState([]);
  const [stato, setStato] = useState("fermo"); // fermo | leggo | salvo
  const [bozza, setBozza] = useState(null);
  const [problema, setProblema] = useState("");
  const [cerca, setCerca] = useState("");
  const [trovati, setTrovati] = useState(null); // null = non ho ancora cercato
  const [cercando, setCercando] = useState(false);
  const campo = useRef(null);

  useEffect(() => {
    (async () => {
      const u = await getUser().catch(() => null);
      setChi(u || null);
      if (!u) return;
      const risposta = await apiFetch("/api/armadio").catch(() => null);
      if (risposta?.ok) setCapi(risposta.capi);
    })();
  }, []);

  /** Dalla foto: cosa sembra che sia, e di che colore è. */
  async function guarda(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProblema("");
    setStato("leggo");
    try {
      const dataUrl = await fileToDataUrl(file);

      // Il colore lo misuriamo qui nel telefono, non lo chiediamo al modello:
      // di un colore un modello dà il nome, e i nomi dei colori sono
      // opinioni. Le tre coordinate sono una misura, e sono quelle che poi
      // reggono gli abbinamenti.
      const hex = await misuraColore(dataUrl);

      // Cosa sia, invece, lo chiediamo: è l'unica parte in cui un modello
      // vede qualcosa che noi non sappiamo calcolare.
      let titolo = "";
      let categoria = "";
      try {
        const r = await fetch("/api/abbina", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: dataUrl }),
        });
        const d = await r.json();
        if (d?.title) titolo = d.title;
        if (d?.category) categoria = d.category;
      } catch {
        /* se nessuno risponde il nome lo scrive la persona: si va avanti */
      }

      setBozza({ file, anteprima: dataUrl, titolo, categoria, ruolo: "", colore_hex: hex, note: "" });
    } catch {
      setProblema("Questa foto non riesco a leggerla. Provane un'altra.");
    }
    setStato("fermo");
    if (campo.current) campo.current.value = "";
  }

  async function salva() {
    if (!bozza?.titolo.trim()) {
      setProblema("Dagli un nome, altrimenti fra sei mesi non lo ritrovi.");
      return;
    }
    setStato("salvo");
    setProblema("");
    try {
      const foto = await caricaLaFoto(bozza.file);
      const risposta = await apiFetch("/api/armadio", {
        method: "POST",
        body: {
          capo: {
            titolo: bozza.titolo,
            ruolo: bozza.ruolo || undefined,
            categoria: bozza.categoria,
            note: bozza.note,
            colore_hex: bozza.colore_hex,
            foto,
          },
        },
      });
      if (!risposta?.ok) throw new Error("no");
      setCapi((elenco) => [risposta.capo, ...elenco]);
      setBozza(null);
    } catch (e) {
      setProblema(e.message === "no" ? "Non sono riuscito a salvarlo. Riprova." : e.message);
    }
    setStato("fermo");
  }

  /**
   * Cercare il capo nel catalogo invece di fotografarlo.
   *
   * È il modo migliore, e non è ovvio. Una foto fatta in camera da letto dà
   * un titolo indovinato da un modello e un colore misurato su un lenzuolo.
   * Una riga di catalogo dà marca, nome esatto, foto del negozio e colore
   * già misurato — gli stessi dati con cui l'app ragiona per tutto il resto.
   *
   * Fotografare resta, per tutto quello che in catalogo non c'è: i regali,
   * l'usato, la roba di dieci anni fa.
   */
  async function cercaInCatalogo(e) {
    e?.preventDefault?.();
    const q = cerca.trim();
    if (q.length < 2 || cercando) return;
    setCercando(true);
    setProblema("");
    try {
      const r = await fetch(`/api/catalogo?q=${encodeURIComponent(q)}`);
      const d = await r.json();
      setTrovati(d.ok ? d.capi : []);
    } catch {
      setProblema("Il catalogo non risponde in questo momento.");
      setTrovati(null);
    }
    setCercando(false);
  }

  async function prendiDalCatalogo(c) {
    setStato("salvo");
    try {
      const risposta = await apiFetch("/api/armadio", {
        method: "POST",
        body: {
          capo: {
            titolo: c.titolo,
            categoria: c.categoria,
            // Il colore del catalogo è già misurato, e meglio del nostro:
            // viene dalla foto del negozio, fatta in studio, non dal muro
            // di una camera.
            colore_hex: c.colore_hex,
            colore_nome: c.colore_nome,
            colore_l: c.colore_l,
            colore_a: c.colore_a,
            colore_b: c.colore_b,
            foto: c.immagine,
            note: c.marca || c.negozio || undefined,
          },
        },
      });
      if (risposta?.ok) {
        setCapi((elenco) => [risposta.capo, ...elenco]);
        setTrovati((elenco) => (elenco || []).filter((x) => x.id !== c.id));
      } else {
        setProblema("Non sono riuscito a salvarlo.");
      }
    } catch (e) {
      // apiFetch alza un'eccezione già tradotta quando il server dice di no:
      // mostrarla è meglio che sostituirla con una frase generica.
      setProblema(e.message || "Non sono riuscito a salvarlo.");
    }
    setStato("fermo");
  }

  async function butta(id) {
    setCapi((elenco) => elenco.filter((c) => c.id !== id));
    await apiFetch(`/api/armadio?id=${id}`, { method: "DELETE" });
  }

  const perRuolo = useMemo(() => {
    const gruppi = RUOLI_ARMADIO.map((r) => ({ ...r, capi: capi.filter((c) => c.ruolo === r.chiave) }));
    const senza = capi.filter((c) => !RUOLI_ARMADIO.some((r) => r.chiave === c.ruolo));
    if (senza.length) gruppi.push({ chiave: "altro", etichetta: "Da sistemare", capi: senza });
    return gruppi.filter((g) => g.capi.length);
  }, [capi]);

  if (chi === undefined) return <div className="wrap" style={{ paddingTop: 32 }}><p className="muted">Un momento…</p></div>;

  if (!chi) {
    return (
      <div className="wrap" style={{ paddingTop: 32, maxWidth: 640 }}>
        <h1 className="h2" style={{ marginBottom: 4 }}>Il tuo armadio</h1>
        <p className="muted" style={{ fontSize: 14 }}>
          Per ricordarsi i tuoi vestiti serve sapere che sei tu. <Link href="/start">Entra o iscriviti</Link>, poi
          torna qui.
        </p>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ paddingTop: 32, paddingBottom: 40, maxWidth: 640 }}>
      <h1 className="h2" style={{ marginBottom: 4 }}>Il tuo armadio</h1>
      <p className="muted" style={{ fontSize: 14 }}>
        Quello che hai già. Fotografa un capo: capiamo cos'è e di che colore, tu correggi se sbagliamo.
      </p>

      {!bozza ? (
        <>
          <form onSubmit={cercaInCatalogo} style={{ marginTop: 22 }}>
            <label className="label" style={{ display: "block", marginBottom: 8 }} htmlFor="cerca">
              Cercalo nel catalogo
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                id="cerca"
                className="control"
                style={{ flex: "1 1 200px", minWidth: 0 }}
                value={cerca}
                onChange={(e) => setCerca(e.target.value)}
                placeholder="es. camicia bianca"
                maxLength={80}
              />
              <button type="submit" className="btn-app" disabled={cercando || cerca.trim().length < 2}>
                {cercando ? "Cerco…" : "Cerca"}
              </button>
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              Se il capo è di un negozio che seguiamo, di lui sappiamo già tutto: marca, colore
              misurato, foto pulita. Meglio di una foto fatta in camera.
            </p>
          </form>

          {trovati?.length ? (
            <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
              {trovati.map((c) => (
                <li key={c.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderTop: "1px solid #f0f0f0" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {c.immagine ? <img src={c.immagine} alt="" style={{ width: 40, height: 52, objectFit: "cover", flex: "0 0 auto" }} /> : null}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13 }}>{c.titolo}</div>
                    <div className="muted" style={{ fontSize: 11 }}>
                      {[c.marca || c.negozio, c.prezzo ? `${c.prezzo} €` : null].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <button type="button" className="chip" style={{ cursor: "pointer" }} onClick={() => prendiDalCatalogo(c)}>
                    è mio
                  </button>
                </li>
              ))}
            </ul>
          ) : trovati ? (
            <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
              Nel catalogo non c'è. Fotografalo: funziona per tutto il resto.
            </p>
          ) : null}

          <p className="muted" style={{ fontSize: 12, marginTop: 22, marginBottom: 6 }}>Oppure</p>
          <label className="btn-app" style={{ display: "block", textAlign: "center", cursor: "pointer" }}>
            {stato === "leggo" ? "Guardo…" : "Fotografa un capo"}
            <input
              ref={campo}
              type="file"
              accept="image/*"
              onChange={guarda}
              disabled={stato === "leggo"}
              style={{ display: "none" }}
            />
          </label>
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            Meglio su un fondo semplice, il capo al centro. La foto resta tua: la vedi solo tu.
          </p>
        </>
      ) : (
        <div style={{ marginTop: 22, padding: 14, border: "1px solid #e8e8e8" }}>
          <div style={{ display: "flex", gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bozza.anteprima} alt="" style={{ width: 84, height: 110, objectFit: "cover", flex: "0 0 auto" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <label className="label" htmlFor="titolo">Cos'è</label>
              <input
                id="titolo"
                className="control"
                style={{ width: "100%", marginTop: 4 }}
                value={bozza.titolo}
                maxLength={120}
                placeholder="es. Camicia di lino bianca"
                onChange={(e) => setBozza({ ...bozza, titolo: e.target.value })}
              />
              {bozza.colore_hex ? (
                <p className="muted" style={{ fontSize: 12, marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 14, height: 14, background: bozza.colore_hex, border: "1px solid #ccc", display: "inline-block" }} />
                  colore misurato dalla foto
                </p>
              ) : null}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <span className="label" style={{ display: "block", marginBottom: 6 }}>Dove si mette</span>
            <div className="chips">
              {RUOLI_ARMADIO.map((r) => (
                <button
                  key={r.chiave}
                  type="button"
                  className="chip"
                  onClick={() => setBozza({ ...bozza, ruolo: bozza.ruolo === r.chiave ? "" : r.chiave })}
                  style={{ cursor: "pointer", background: bozza.ruolo === r.chiave ? "#111" : undefined, color: bozza.ruolo === r.chiave ? "#fff" : undefined }}
                >
                  {r.etichetta}
                </button>
              ))}
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              Se non scegli niente lo deduciamo dal nome.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <button type="button" className="btn-app" onClick={salva} disabled={stato === "salvo"}>
              {stato === "salvo" ? "Salvo…" : "Mettilo nell'armadio"}
            </button>
            <button type="button" className="chip" style={{ cursor: "pointer" }} onClick={() => setBozza(null)}>
              Lascia stare
            </button>
          </div>
        </div>
      )}

      {problema ? <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>{problema}</p> : null}

      {capi.length ? (
        <>
          <p className="muted" style={{ fontSize: 13, marginTop: 28 }}>
            {capi.length === 1 ? "Un capo" : `${capi.length} capi`} nell'armadio.
          </p>
          {perRuolo.map((g) => (
            <div key={g.chiave} style={{ marginTop: 18 }}>
              <span className="label" style={{ display: "block", marginBottom: 8 }}>{g.etichetta}</span>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {g.capi.map((c) => (
                  <li key={c.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderTop: "1px solid #f0f0f0" }}>
                    {/* La foto c'è solo per i capi presi dal catalogo: quelle
                        fotografate in casa stanno in un secchio non pubblico e
                        per mostrarle serve un link firmato. Per ora un
                        quadratino del colore, che è l'informazione che conta.
                        eslint-disable-next-line @next/next/no-img-element */}
                    {c.foto && c.foto.startsWith("http") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.foto} alt="" style={{ width: 34, height: 44, objectFit: "cover", flex: "0 0 auto" }} />
                    ) : c.colore_hex ? (
                      <span style={{ width: 34, height: 44, background: c.colore_hex, border: "1px solid #ddd", flex: "0 0 auto" }} />
                    ) : null}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14 }}>{c.titolo}</div>
                      {c.note ? <div className="muted" style={{ fontSize: 11 }}>{c.note}</div> : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => butta(c.id)}
                      className="muted"
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, padding: 4 }}
                    >
                      togli
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}

/** Il colore medio del centro della foto, senza mandarla a nessuno. */
async function misuraColore(dataUrl) {
  return new Promise((risolvi) => {
    const img = new Image();
    img.onload = () => {
      try {
        const tela = document.createElement("canvas");
        tela.width = LATO_MISURA;
        tela.height = LATO_MISURA;
        const c = tela.getContext("2d", { willReadFrequently: true });
        c.drawImage(img, 0, 0, LATO_MISURA, LATO_MISURA);
        risolvi(coloreDominante(c.getImageData(0, 0, LATO_MISURA, LATO_MISURA).data, LATO_MISURA));
      } catch {
        risolvi(null);
      }
    };
    img.onerror = () => risolvi(null);
    img.src = dataUrl;
  });
}

/**
 * La foto va nel secchio, non nel database.
 *
 * Il secchio non è pubblico: ogni persona scrive e legge solo nella cartella
 * che si chiama come lei, e le regole stanno nel database (sql/armadio.sql),
 * non qui. Se il caricamento non riesce il capo si salva lo stesso, senza
 * foto: meglio un armadio con i nomi che nessun armadio.
 */
async function caricaLaFoto(file) {
  try {
    const sb = getSupabaseBrowser();
    if (!sb || !file) return null;
    const { data: sessione } = await sb.auth.getSession();
    const chi = sessione?.session?.user?.id;
    if (!chi) return null;

    const estensione = (file.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const dove = `${chi}/${Date.now()}.${estensione}`;
    const { error } = await sb.storage.from("armadio").upload(dove, file, { contentType: file.type });
    return error ? null : dove;
  } catch {
    return null;
  }
}
