import { NextResponse } from "next/server";
import { getSupabaseAnon } from "@/lib/supabaseClient";
import { readJson } from "@/lib/authServer";
import { differenza, hexALab } from "@/lib/colore";
import { capiDelloStile, paroleDaIndossare } from "@/lib/stiliCapi";
import { PERIODI, RUOLI, adattoAlPeriodo, ruoloDelCapo } from "@/lib/periodiAnno";
import { tagliConsigliati } from "@/lib/proporzioni";
import { TUTTE_LE_VESTIBILITA } from "@/lib/data";

export const runtime = "nodejs";

// Compone un completo per ogni periodo dell'anno.
//
// Non è una lista di capi: è un ruolo per volta. Sopra, maglia, pantaloni,
// scarpe, e un accessorio se c'è. Un completo senza scarpe non è un completo,
// per quanti maglioni si mostrino.
export async function POST(req) {
  const supabase = getSupabaseAnon();
  if (!supabase) return NextResponse.json({ error: "NO_SUPABASE" }, { status: 503 });

  const { body, error: badJson } = await readJson(req);
  if (badJson) return badJson;

  const { palette, stile = null, genere = null, max = null, escludiFast = false, forma = null, altezza = null } = body || {};
  if (!Array.isArray(palette) || !palette.length) {
    return NextResponse.json({ error: "SERVE_LA_PALETTE" }, { status: 400 });
  }

  const voluti = palette
    .map((c) => ({ nome: c.name || c.nome || "", lab: hexALab(c.hex) }))
    .filter((c) => c.lab);
  if (!voluti.length) return NextResponse.json({ error: "PALETTE_SENZA_COLORI" }, { status: 400 });

  const comuni = {
    prezzo_min: null,
    prezzo_max: max ? Number(max) : null,
    genere_voluto: genere || null,
    escludi_fast: Boolean(escludiFast),
  };

  // Due pescaggi, non uno.
  //
  // Le parole dello stile descrivono i VESTITI — "tweed", "maglione a trecce" —
  // e nei titoli delle scarpe non compaiono mai. Filtrando tutto il catalogo
  // con quelle, un completo Romantico restava senza scarpe. Quindi lo stile
  // vincola i capi d'abbigliamento, mentre scarpe e accessori si scelgono per
  // colore su tutto il catalogo.
  //
  // La palette si spezza in gruppi da quattro e si chiede UN PEZZO ALLA
  // VOLTA. Il costo della ricerca è lineare nei colori e il database concede
  // tre secondi a una domanda: con dodici colori una domanda sola non ci sta,
  // e due domande insieme si ostacolano e sforano tutte e due. Qui c'era
  // Promise.all con la palette intera, e i completi non uscivano MAI a chi
  // aveva una palette piena — con o senza genere, provato oggi: 500 in tre
  // secondi. La distanza dalla palette è il minimo fra le distanze dai
  // singoli colori, quindi spezzare non cambia una riga di quello che esce.
  const META = 2;
  const gruppi = [];
  for (let i = 0; i < voluti.length; i += META) gruppi.push(voluti.slice(i, i + META));

  const pesca = async (parole) => {
    const righe = [];
    for (const gruppo of gruppi) {
      const risposta = await supabase.rpc("capi_per_palette", {
        ...comuni,
        palette: gruppo.map((c) => ({ l: c.lab.L, a: c.lab.a, b: c.lab.b })),
        quanti: 420,
        parole,
      });
      if (risposta.error) return { data: null, error: risposta.error };
      righe.push(...(risposta.data || []));
    }
    return { data: righe, error: null };
  };

  // Una domanda sola, e i vestiti dello stile si scelgono dopo, fra le righe
  // già in mano.
  //
  // Qui ce n'erano due, e in /api/capi adesso è giusto che siano al
  // database: il filtro delle parole passa da una colonna indicizzata e
  // costa meno della domanda senza parole. Ma qui le domande RADDOPPIANO,
  // perché le scarpe si scelgono per colore su tutto il catalogo mentre i
  // vestiti no, e il conto è misurato: con due passaggi un completo
  // Streetwear senza genere prende 11,5 secondi contro 6,3, e i capi che
  // escono sono gli stessi quattro. Il doppio del tempo per niente.
  const tutto = await pesca(null);
  if (tutto.error) return NextResponse.json({ error: tutto.error.message }, { status: 500 });

  const suoi = stile ? capiDelloStile(tutto.data, stile) : null;
  const conStile = { data: suoi?.length ? suoi : null };

  const arricchisci = (righe) => (righe || []).map((capo) => {
    const suo = { L: capo.colore_l, a: capo.colore_a, b: capo.colore_b };
    let vicino = null;
    let scarto = Infinity;
    for (const v of voluti) {
      const d = differenza(suo, v.lab);
      if (d < scarto) {
        scarto = d;
        vicino = v.nome;
      }
    }
    return { ...capo, colore_palette: vicino, scarto: Number(scarto.toFixed(1)), ruolo: ruoloDelCapo(capo.titolo, capo.categoria) };
  });

  // Se dello stile non è uscito niente si tiene tutto: un completo
  // approssimativo è più utile di nessun completo.
  const vestiti = arricchisci(conStile.data?.length ? conStile.data : tutto.data);
  const qualsiasi = arricchisci(tutto.data);

  // Lo stile comanda su quello che si indossa. Scarpe e accessori seguivano
  // solo il colore, e si vedeva: allo Streetwear toccavano le décolleté, al
  // Balletcore le sneakers da running, e la stessa sciarpa bordeaux finiva in
  // ogni completo di ogni stile. Ora hanno un vocabolario loro — vedi
  // paroleDaIndossare — e il colore torna a fare quello che deve, scegliere
  // fra le scarpe giuste invece che al posto loro.
  const RUOLI_DELLO_STILE = new Set(["capospalla", "top", "bottom", "intero"]);
  const daIndossare = stile ? paroleDaIndossare(stile) : null;
  const paroleDelRuolo = (ruolo) => {
    if (!daIndossare) return null;
    if (ruolo === "scarpe") return daIndossare.scarpe;
    if (ruolo === "accessorio") return daIndossare.accessori;
    return null;
  };

  // I tagli che cadono meglio su queste proporzioni: si traducono nelle
  // parole con cui i negozi li chiamano, e diventano una preferenza — mai un
  // filtro. Escludere capi per la forma di una persona sarebbe esattamente
  // quello che abbiamo deciso di non fare.
  const { tagli } = tagliConsigliati({ forma, altezza });
  const paroleTaglio = tagli.flatMap((t) => {
    const v = TUTTE_LE_VESTIBILITA.find((x) => x.nome === t);
    return v ? v.chiavi : [String(t).toLowerCase()];
  });

  // Un capo scelto per un periodo non torna negli altri: quattro completi con
  // lo stesso cappello sono un completo solo mostrato quattro volte.
  const giaUsati = new Set();

  const completi = PERIODI.map((periodo) => {
    const adatti = (righe) => righe.filter((c) => c.ruolo && adattoAlPeriodo(c.titolo, periodo));
    const daStile = adatti(vestiti);
    const daTutto = adatti(qualsiasi);

    const scelti = [];
    const negoziUsati = new Set();
    const coloriUsati = new Set();

    // Un abito fa da solo sopra e sotto: se c'è, gli altri due ruoli saltano.
    const conAbito = daStile.find((c) => c.ruolo === "intero" && !giaUsati.has(c.id) && c.scarto < 12);
    const ruoliDaRiempire = conAbito
      ? periodo.ruoli.filter((r) => r !== "top" && r !== "bottom").flatMap((r) => (r === "capospalla" ? [r, "intero"] : [r]))
      : periodo.ruoli;

    for (const ruolo of ruoliDaRiempire) {
      let bacino = RUOLI_DELLO_STILE.has(ruolo) ? daStile : daTutto;

      // Scarpe e accessori: si tiene solo quello che lo stile porterebbe
      // davvero. Prima le sue parole precise, poi quelle della sua famiglia,
      // e se in catalogo non c'è nulla né dell'una né dell'altra si molla il
      // filtro — un completo scalzo è peggio di un completo con la scarpa
      // sbagliata, e in quel caso almeno il colore è giusto.
      const livelli = paroleDelRuolo(ruolo);
      let parole = null;
      if (livelli) {
        const restringi = (chiavi) =>
          chiavi.length
            ? bacino.filter((c) => {
                const t = String(c.titolo).toLowerCase();
                return c.ruolo === ruolo && chiavi.some((k) => t.includes(k));
              })
            : [];

        const prime = restringi(livelli.prime);
        if (prime.length) {
          bacino = prime;
          parole = livelli.prime;
        } else {
          const poi = restringi(livelli.poi);
          if (poi.length) {
            bacino = poi;
            parole = livelli.poi;
          }
        }
      }

      const candidati = bacino
        .filter((c) => c.ruolo === ruolo && !scelti.some((s) => s.id === c.id) && !giaUsati.has(c.id))
        .map((c) => {
          const t = c.titolo.toLowerCase();
          let punti = 40 - c.scarto;
          // Le parole stanno in ordine: prima quelle dello stile preciso, poi
          // quelle della sua famiglia. Al Western i texani prima dei sandali.
          if (parole?.length) {
            const posto = parole.findIndex((k) => t.includes(k));
            if (posto >= 0) punti += 12 - Math.min(posto, 8);
          }
          // Chi usa le parole giuste per il periodo va davanti.
          if (periodo.preferisci.some((p) => t.includes(p))) punti += 14;
          // Un completo di cinque capi dello stesso negozio è una vetrina,
          // non un consiglio: si preferisce variare.
          if (negoziUsati.has(c.negozio)) punti -= 9;
          // E cinque capi dello stesso colore non sono un outfit.
          if (coloriUsati.has(c.colore_palette)) punti -= 7;
          if (c.qualita) punti += c.qualita / 25;
          // I tagli adatti salgono, gli altri restano dove sono.
          if (paroleTaglio.length && paroleTaglio.some((k) => t.includes(k))) punti += 11;
          return { ...c, punti };
        })
        .sort((a, b) => b.punti - a.punti);

      let scelto = candidati[0];

      // Se lo stile non ha niente per un ruolo che serve — d'estate un
      // Romantico può non avere magliette in catalogo — si pesca dal colore
      // invece di lasciare il buco. Un capo giusto di colore vale più di uno
      // slot vuoto, e l'utente vede un completo invece di una lista monca.
      if (!scelto && periodo.obbligatori.includes(ruolo)) {
        scelto = daTutto
          .filter((c) => c.ruolo === ruolo && !scelti.some((x) => x.id === c.id) && !giaUsati.has(c.id))
          .sort((a, b) => a.scarto - b.scarto)[0];

        // E se anche così non c'è, si accetta di ripetere un capo già usato in
        // un altro periodo. La regola "mai due volte lo stesso" serve a non
        // mostrare quattro completi identici, non a lasciare l'estate senza
        // pantaloni: quando le due cose confliggono, vince il completo.
        if (!scelto) {
          scelto = daTutto
            .filter((c) => c.ruolo === ruolo && !scelti.some((x) => x.id === c.id))
            .sort((a, b) => a.scarto - b.scarto)[0];
        }
      }
      if (scelto) {
        scelti.push({ ...scelto, ruolo, ruoloEtichetta: RUOLI[ruolo].etichetta });
        negoziUsati.add(scelto.negozio);
        coloriUsati.add(scelto.colore_palette);
        giaUsati.add(scelto.id);
      }
    }

    // Con un abito, "maglia" e "pantaloni" non mancano: sono coperti.
    const haAbito = scelti.some((s) => s.ruolo === "intero");
    const mancanti = periodo.obbligatori.filter(
      (r) => !scelti.some((s) => s.ruolo === r) && !(haAbito && (r === "top" || r === "bottom")),
    );

    return {
      periodo: periodo.id,
      nome: periodo.nome,
      mesi: periodo.mesi,
      capi: scelti,
      completo: mancanti.length === 0,
      // Se manca un pezzo lo diciamo, invece di mostrare tre capi e chiamarlo completo.
      mancano: mancanti.map((r) => RUOLI[r].etichetta),
      totale: scelti.reduce((s, c) => s + Number(c.prezzo || 0), 0),
    };
  });

  return NextResponse.json({ ok: true, stile, completi });
}
