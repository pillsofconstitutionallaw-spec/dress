import { NextResponse } from "next/server";
import { arrotondaPosizione } from "@/lib/vicini";
import { consiglioMeteo, leggiMetNorway, periodoDaGradi } from "@/lib/meteo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

// Il tempo che fa, da MET Norway.
//
// L'istituto meteorologico norvegese dà le previsioni di tutto il mondo senza
// chiave e senza vietarne l'uso commerciale. Open-Meteo, che sarebbe stata la
// scelta ovvia, nelle condizioni dice il contrario — «you may only use the
// free API services for non-commercial purposes» — e Dress rimanda ai negozi.
//
// In cambio del gratis chiedono tre cose, e le rispettiamo tutte e tre:
const METEO = "https://api.met.no/weatherapi/locationforecast/2.0/compact";

// 1. Presentarsi, con un modo per essere contattati. Senza, rispondono 403.
const CHI_SIAMO = "DressApp/1.0 (https://www.dressapp.it)";

// 2. Non chiedere troppo spesso. Un'ora di cache: il tempo non cambia in
// cinque minuti, e la posizione arriva arrotondata a cento metri, quindi
// tutta una via riceve la stessa risposta senza ripetere la domanda.
const CACHE = "public, s-maxage=3600, stale-while-revalidate=10800";

// 3. Le coordinate con al massimo quattro decimali. Noi ne usiamo tre —
// lo arrotonda già arrotondaPosizione, per un motivo diverso: non serve
// sapere in che stanza sta una persona per sapere se piove.

export async function GET(req) {
  const p = new URL(req.url).searchParams;
  const dove = arrotondaPosizione({ lat: p.get("lat"), lon: p.get("lon") });
  if (!dove) {
    return NextResponse.json({ error: "Serve sapere dove sei." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const res = await fetch(`${METEO}?lat=${dove.lat}&lon=${dove.lon}`, {
      headers: { "User-Agent": CHI_SIAMO },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`met_${res.status}`);

    const misura = leggiMetNorway(await res.json());
    if (!misura) throw new Error("met_vuoto");

    return NextResponse.json(
      {
        ok: true,
        ...misura,
        // Il periodo scelto dal termometro invece che dal calendario: è
        // questo il pezzo che cambia i completi.
        periodo: periodoDaGradi(misura.gradi),
        consiglio: consiglioMeteo(misura),
        fonte: "MET Norway",
      },
      { headers: { "Cache-Control": CACHE } },
    );
  } catch {
    // Se non si sa che tempo fa, si dice. L'app torna a decidere col
    // calendario, che è quello che faceva prima e funziona.
    return NextResponse.json(
      { error: "Non so che tempo fa dalle tue parti in questo momento." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
