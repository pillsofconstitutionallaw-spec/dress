"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getUser,
  hasAccounts,
  passkeyAttive,
  improntaAttivaQui,
  questoApparecchioSaFarlo,
  registraQuestoApparecchio,
} from "@/lib/session";

// La proposta di attivare Face ID, per chi è GIÀ dentro.
//
// Stava solo dopo l'accesso con la password, e chi ha l'app in home sullo
// schermo del telefono non passa mai da lì: la sessione resta aperta, la
// password non la riscrive più, e la proposta non la vedeva mai nessuno.
// Cioè: proprio le persone a cui serve di più erano le uniche escluse.
//
// Si mostra una volta. Chi dice di no non se la ritrova addosso ogni volta
// che apre — ed è per questo che il rifiuto si scrive nel browser.
const RIFIUTATA = "dress:improntaRifiutata";

export default function ProponiImpronta() {
  const [mostra, setMostra] = useState(false);
  const [attivando, setAttivando] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        if (!hasAccounts()) return;
        if (localStorage.getItem(RIFIUTATA)) return;
        // Su QUESTO apparecchio, non su questo account: la chiave sta dentro
        // l'apparecchio, e il telefono e il computer ne vogliono una a testa.
        if (improntaAttivaQui()) return;
        if (!(await getUser())) return;

        // Le stesse due condizioni di sempre: acceso sul progetto, e
        // l'apparecchio deve avere un lettore.
        const [accese, puo] = await Promise.all([passkeyAttive(), questoApparecchioSaFarlo()]);
        if (!accese || !puo) return;

        if (vivo) setMostra(true);
      } catch {
        /* nel dubbio non si propone niente */
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const nonAdesso = useCallback(() => {
    try {
      localStorage.setItem(RIFIUTATA, "1");
    } catch {
      /* se non si può scrivere, ricomparirà: è il male minore */
    }
    setMostra(false);
  }, []);

  async function attiva() {
    setErr("");
    setAttivando(true);
    try {
      await registraQuestoApparecchio();
      setMostra(false);
    } catch (e) {
      setErr(e.message);
      setAttivando(false);
    }
  }

  if (!mostra) return null;

  return (
    <div className="card" style={{ padding: "clamp(16px,2.6vw,22px)", marginTop: 22, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto" }}>
          <path d="M4 8V6a2 2 0 0 1 2-2h2" />
          <path d="M16 4h2a2 2 0 0 1 2 2v2" />
          <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
          <path d="M8 20H6a2 2 0 0 1-2-2v-2" />
          <path d="M9 10v1" />
          <path d="M15 10v1" />
          <path d="M9.5 15c.7.7 1.6 1 2.5 1s1.8-.3 2.5-1" />
        </svg>
        <strong style={{ fontSize: 16 }}>Entra con Face ID</strong>
      </div>

      <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>
        La prossima volta che ti chiede la password, puoi non scriverla: basta la faccia, o il dito.
        La chiave resta dentro questo apparecchio e non esce mai — a noi arriva solo che ti ha
        riconosciuto. La password continua a funzionare.
      </p>

      {err ? <p style={{ color: "var(--signal)", margin: 0, fontSize: 13.5 }}>{err}</p> : null}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn" onClick={attiva} disabled={attivando}>
          {attivando ? "Aspetto l’apparecchio…" : "Attiva su questo apparecchio"}
        </button>
        <button className="btn ghost" onClick={nonAdesso} disabled={attivando}>
          Non adesso
        </button>
      </div>
    </div>
  );
}
