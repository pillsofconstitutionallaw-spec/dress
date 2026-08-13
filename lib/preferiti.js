"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, getUser } from "@/lib/session";

const CHIAVE = "dress:capiPreferiti";

// I capi messi da parte.
//
// Chi ha l'account li ritrova su qualsiasi dispositivo; chi non ce l'ha li
// tiene comunque, nel browser — non lo blocchiamo per costringerlo a iscriversi.
function leggiLocali() {
  try {
    const v = JSON.parse(localStorage.getItem(CHIAVE) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function scriviLocali(capi) {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(capi));
  } catch {
    /* memoria piena o modalità privata */
  }
}

export function usaPreferiti() {
  const [capi, setCapi] = useState([]);
  const [collegato, setCollegato] = useState(false);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const locali = leggiLocali();
      if (vivo) setCapi(locali);

      const u = await getUser().catch(() => null);
      if (!vivo) return;
      if (!u) {
        setPronto(true);
        return;
      }
      setCollegato(true);

      try {
        const d = await apiFetch("/api/preferiti");
        if (!vivo) return;
        // Chi si è appena iscritto porta con sé quelli salvati da ospite.
        const daFondere = locali.filter((l) => !(d.capi || []).some((c) => String(c.id) === String(l.id)));
        for (const c of daFondere) await apiFetch("/api/preferiti", { method: "POST", body: { capo: c } });
        const finali = daFondere.length
          ? (await apiFetch("/api/preferiti")).capi
          : d.capi;
        if (!vivo) return;
        setCapi(finali || []);
        scriviLocali(finali || []);
      } catch {
        /* restano quelli locali */
      }
      if (vivo) setPronto(true);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const preferito = useCallback((id) => capi.some((c) => String(c.id) === String(id)), [capi]);

  const alterna = useCallback(
    async (capo) => {
      // Prima si aggiorna quello che si vede, poi si scrive: il cuore deve
      // rispondere al tocco, non aspettare la rete.
      const c_era = capi.some((c) => String(c.id) === String(capo.id));
      const subito = c_era
        ? capi.filter((c) => String(c.id) !== String(capo.id))
        : [{ ...capo, salvato: new Date().toISOString() }, ...capi];
      setCapi(subito);
      scriviLocali(subito);

      if (!collegato) return;
      try {
        const d = await apiFetch("/api/preferiti", { method: "POST", body: { capo } });
        setCapi(d.capi || []);
        scriviLocali(d.capi || []);
      } catch {
        /* resta il salvataggio locale */
      }
    },
    [capi, collegato],
  );

  return { capi, preferito, alterna, collegato, pronto };
}
