import { NextResponse } from "next/server";
import { GENERI_OSM, arrotondaPosizione, negoziDaOsm } from "@/lib/vicini";
import { soloCifre } from "@/lib/numeri";
import { getSupabaseAnon } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Overpass è il motore di ricerca di OpenStreetMap. È un servizio pubblico
// mantenuto da volontari: chi lo usa si presenta con un nome, non lo martella,
// e accetta che ogni tanto sia lento. Le misure del 22 settembre 2026: due
// secondi e mezzo per sessanta negozi intorno a Napoli.
const OVERPASS = "https://overpass-api.de/api/interpreter";

// Senza un User-Agent riconoscibile Overpass risponde 406 e non spiega
// perché. Ci è costato il primo tentativo.
const CHI_SIAMO = "DressApp/1.0 (https://www.dressapp.it)";

// Mezz'ora di cache. I negozi non aprono e chiudono a ritmo di minuti, e la
// posizione arriva arrotondata a cento metri: chi cammina per la stessa via
// riceve la stessa risposta senza che nessuno ridisturbi i volontari.
const CACHE = "public, s-maxage=1800, stale-while-revalidate=86400";

const RAGGIO_PREDEFINITO = 1500;
const RAGGIO_MASSIMO = 5000;

/**
 * Per i negozi che importiamo, quanti capi ne abbiamo adesso.
 *
 * Senza questo numero la targhetta «lo abbiamo in catalogo» è una curiosità.
 * Con il numero è un motivo per restare: di quel negozio a duecento metri si
 * possono guardare milleduecento capi, coi prezzi e i colori, prima di
 * mettersi le scarpe.
 *
 * Se il database non risponde non succede niente: si perde il numero, non
 * l'elenco dei negozi. Il conto è un di più, la posizione era la domanda.
 */
async function aggiungiQuantiNeAbbiamo(negozi) {
  const nostri = negozi.filter((n) => n.inCatalogo);
  if (!nostri.length) return;

  const sb = getSupabaseAnon();
  if (!sb) return;

  await Promise.all(
    nostri.map(async (n) => {
      try {
        const { count } = await sb
          .from("prodotti")
          .select("id", { count: "exact", head: true })
          .eq("negozio", n.inCatalogo)
          .eq("disponibile", true);
        if (count) n.quantiInCatalogo = count;
      } catch {
        /* il numero è un di più: senza, la riga si mostra lo stesso */
      }
    }),
  );
}

export async function GET(req) {
  const p = new URL(req.url).searchParams;

  // La posizione si arrotonda subito, prima di qualunque altra cosa: da qui
  // in poi nel programma non esiste più il punto esatto in cui sta una
  // persona, esiste un quadrato di cento metri. E non si scrive da nessuna
  // parte — non nei registri, non in un database. Serve per la domanda che
  // stiamo facendo adesso, e finisce con lei.
  const dove = arrotondaPosizione({ lat: p.get("lat"), lon: p.get("lon") });
  if (!dove) {
    return NextResponse.json({ error: "Serve sapere dove sei." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const chiesto = Number(soloCifre(p.get("raggio"), 5)) || RAGGIO_PREDEFINITO;
  const raggio = Math.min(Math.max(chiesto, 200), RAGGIO_MASSIMO);

  const domanda = `[out:json][timeout:25];
(nwr["shop"~"^(${GENERI_OSM.join("|")})$"](around:${raggio},${dove.lat},${dove.lon}););
out center 120;`;

  try {
    const res = await fetch(OVERPASS, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": CHI_SIAMO },
      body: new URLSearchParams({ data: domanda }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) throw new Error(`overpass_${res.status}`);

    const dati = await res.json();
    const negozi = negoziDaOsm(dati.elements, dove);
    await aggiungiQuantiNeAbbiamo(negozi);

    return NextResponse.json(
      {
        ok: true,
        negozi,
        raggio,
        // Chi usa OpenStreetMap lo dice: è la licenza, e in cambio di dati
        // gratuiti è il minimo.
        fonte: "OpenStreetMap",
      },
      { headers: { "Cache-Control": CACHE } },
    );
  } catch (e) {
    // Overpass è dei volontari e ogni tanto è giù o lento. Non è colpa di chi
    // sta guardando, e non si finge che non ci siano negozi: si dice.
    return NextResponse.json(
      { error: "La mappa dei negozi non risponde in questo momento. Riprova fra poco." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
