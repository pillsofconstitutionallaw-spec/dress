import { NextResponse } from "next/server";
import { soloFoto } from "@/lib/unghie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

// Le foto di manicure, da Wikimedia Commons.
//
// È l'unico posto dove si trovano con una licenza che si può davvero usare,
// senza chiedere una chiave a nessuno e senza le condizioni «solo per uso non
// commerciale» che hanno fatto scartare Open-Meteo per il tempo e IDM-VTON
// per la prova virtuale.
//
// In cambio va filtrato: cercando «nail» escono libri scansionati, cataloghi
// del 1912 e PDF di commissioni parlamentari. Il filtro sta in lib/unghie.js,
// con le sue prove.
const COMMONS = "https://commons.wikimedia.org/w/api.php";

// Wikimedia chiede di presentarsi con un contatto, come MET Norway. Senza,
// prima o poi arriva un blocco e nessuno sa perché.
const CHI_SIAMO = "DressApp/1.0 (https://www.dressapp.it)";

// Un giorno di cache. Queste foto non cambiano: sono di gente che le ha
// caricate anni fa, e ridomandarle a ogni visita è scortese verso un servizio
// che non ci chiede niente.
const CACHE = "public, s-maxage=86400, stale-while-revalidate=604800";

function pulisci(html) {
  return String(html || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export async function GET() {
  const q = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrsearch: "nail art manicure",
    gsrnamespace: "6",
    gsrlimit: "40",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "500",
  });

  try {
    const res = await fetch(`${COMMONS}?${q}`, {
      headers: { "User-Agent": CHI_SIAMO },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`commons_${res.status}`);

    const dati = await res.json();
    const pagine = Object.values(dati?.query?.pages || {});

    const grezze = pagine.map((p) => {
      const ii = (p.imageinfo || [])[0] || {};
      const m = ii.extmetadata || {};
      return {
        title: p.title,
        // La miniatura, non l'originale: qualcuna di quelle foto pesa otto
        // megabyte, e nessuno le guarda a quella dimensione.
        url: ii.thumburl || ii.url || "",
        pagina: ii.descriptionurl || null,
        licenza: pulisci((m.LicenseShortName || {}).value),
        autore: pulisci((m.Artist || {}).value).slice(0, 60),
      };
    });

    // Il nome del file è l'unica descrizione che abbiamo: si ripulisce e
    // diventa la didascalia. Meglio «French tip nail art» di niente.
    const foto = soloFoto(grezze).slice(0, 12).map((f) => ({
      ...f,
      didascalia: f.title.replace(/^File:/, "").replace(/\.[a-z]+$/i, "").replace(/[_-]+/g, " "),
    }));

    return NextResponse.json({ ok: true, foto, fonte: "Wikimedia Commons" }, { headers: { "Cache-Control": CACHE } });
  } catch {
    // Senza foto la pagina vale lo stesso: i colori sono la parte che conta,
    // le fotografie sono un di più.
    return NextResponse.json(
      { ok: true, foto: [], problema: "Le foto non arrivano in questo momento." },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
