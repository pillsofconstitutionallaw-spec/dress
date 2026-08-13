"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, getUser } from "@/lib/session";

const CHIAVE = "dress:capiPreferiti";

// I capi messi da parte.
//
// Lo stato è UNO SOLO per tutta l'app, tenuto qui fuori dai componenti.
// Serve perché la stessa lista compare in più punti — le schede dei risultati
// e il guardaroba — e se ognuno tenesse i suoi preferiti, togliendo un cuore
// da una parte l'altra resterebbe indietro.
let stato = { capi: [], collegato: false, pronto: false, avviato: false };
const ascoltatori = new Set();

function pubblica(nuovo) {
  stato = { ...stato, ...nuovo };
  for (const f of ascoltatori) f(stato);
}

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

// Il primo componente che chiede i preferiti li carica; gli altri si
// agganciano a quelli già caricati.
async function avvia() {
  if (stato.avviato) return;
  pubblica({ avviato: true });

  const locali = leggiLocali();
  pubblica({ capi: locali });

  const u = await getUser().catch(() => null);
  if (!u) return pubblica({ pronto: true });
  pubblica({ collegato: true });

  try {
    const d = await apiFetch("/api/preferiti");
    // Chi si è appena iscritto porta con sé quelli salvati da ospite.
    const daFondere = locali.filter((l) => !(d.capi || []).some((c) => String(c.id) === String(l.id)));
    for (const c of daFondere) await apiFetch("/api/preferiti", { method: "POST", body: { capo: c } });
    const finali = daFondere.length ? (await apiFetch("/api/preferiti")).capi : d.capi;
    scriviLocali(finali || []);
    pubblica({ capi: finali || [] });
  } catch {
    /* restano quelli locali */
  }
  pubblica({ pronto: true });
}

export function usaPreferiti() {
  const [locale, setLocale] = useState(stato);

  useEffect(() => {
    ascoltatori.add(setLocale);
    setLocale(stato);
    avvia();
    return () => ascoltatori.delete(setLocale);
  }, []);

  const preferito = useCallback((id) => locale.capi.some((c) => String(c.id) === String(id)), [locale.capi]);

  const alterna = useCallback(async (capo) => {
    // Prima si aggiorna quello che si vede, poi si scrive: il cuore deve
    // rispondere al tocco, non aspettare la rete.
    const c_era = stato.capi.some((c) => String(c.id) === String(capo.id));
    const subito = c_era
      ? stato.capi.filter((c) => String(c.id) !== String(capo.id))
      : [{ ...capo, salvato: new Date().toISOString() }, ...stato.capi];
    scriviLocali(subito);
    pubblica({ capi: subito });

    if (!stato.collegato) return;
    try {
      const d = await apiFetch("/api/preferiti", { method: "POST", body: { capo } });
      scriviLocali(d.capi || []);
      pubblica({ capi: d.capi || [] });
    } catch {
      /* resta il salvataggio locale */
    }
  }, []);

  return { capi: locale.capi, preferito, alterna, collegato: locale.collegato, pronto: locale.pronto };
}
