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
  const campo = useRef(null);

  useEffect(() => {
    (async () => {
      const u = await getUser().catch(() => null);
      setChi(u || null);
      if (!u) return;
      const { data } = await apiFetch("/api/armadio");
      if (data?.ok) setCapi(data.capi);
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
      const { data } = await apiFetch("/api/armadio", {
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
      if (!data?.ok) throw new Error(data?.error || "no");
      setCapi((elenco) => [data.capo, ...elenco]);
      setBozza(null);
    } catch (e) {
      setProblema(e.message === "no" ? "Non sono riuscito a salvarlo. Riprova." : e.message);
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
          <label className="btn-app" style={{ marginTop: 22, display: "block", textAlign: "center", cursor: "pointer" }}>
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
                    {c.colore_hex ? (
                      <span style={{ width: 22, height: 22, background: c.colore_hex, border: "1px solid #ddd", flex: "0 0 auto" }} />
                    ) : null}
                    <span style={{ flex: 1, minWidth: 0, fontSize: 14 }}>{c.titolo}</span>
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
