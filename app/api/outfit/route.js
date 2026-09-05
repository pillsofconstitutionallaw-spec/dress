import { NextResponse } from "next/server";
import { getSupabaseAnon } from "@/lib/supabaseClient";
import { readJson } from "@/lib/authServer";
import { differenza, hexALab } from "@/lib/colore";
import { capiDelloStile, paroleDaIndossare } from "@/lib/stiliCapi";
import { PERIODI, RUOLI, adattoAlPeriodo, ruoliDaRiempire, ruoloDelCapo } from "@/lib/periodiAnno";
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
  // La palette si chiede intera, in una domanda sola.
  //
  // Prima si spezzava in gruppi chiesti in fila, e per un mese è stato
  // giusto: il costo cresceva con i colori, con dodici una domanda sola non
  // ci stava nei tre secondi, e due insieme si ostacolavano e sforavano
  // tutte e due — i completi non uscivano MAI a chi aveva la palette piena.
  //
  // I due indici hanno cambiato il conto. Misurato oggi sul catalogo vero,
  // una domanda con tutti e dodici i colori: 378-434 ms senza parole, e
  // 1,4 secondi nel caso peggiore con le parole — nessun genere, fast
  // fashion incluso, quattrocento righe. Metà del limite. E dodici colori
  // costano quanto tre, quindi spezzare pagava quattro volte per niente.
  //
  // Quanti colori per volta, misurato su tutte e dodici le palette vere:
  //
  //   2 → mediana 1535 ms, peggiore 2269 ms → 6 domande,  9,2 s
  //   3 → mediana 1846 ms, peggiore 2470 ms → 4 domande,  7,4 s
  //   4 → mediana 1830 ms, peggiore 2112 ms → 3 domande,  5,5 s
  //   5 → mediana 2449 ms, peggiore 2871 ms → 3 domande,  7,3 s
  //
  // Quattro è il punto: il totale più basso, e con un margine sotto il limite
  // PIÙ LARGO e non più stretto — il peggiore dei dodici sta a 2112 ms contro
  // i 2269 che toccava già a due. A cinque il margine si chiude (2871 su
  // 3000), e una ricerca che sfora non rallenta: muore.
  //
  // Misurato poi dall'app, che è l'unico numero che conta davvero — dodici
  // completi con due e con quattro, di fila nella stessa sessione:
  //
  //   2 → mediana 6609 ms, peggiore 7118 ms
  //   4 → mediana 5972 ms, peggiore 6857 ms
  //
  // Un decimo, non la metà: fuori dall'app ogni domanda pagava un saluto al
  // server che qui dentro si paga una volta sola, e le misure isolate quindi
  // gonfiavano il guadagno. Vale comunque, perché migliora anche il peggiore
  // dei casi, ma il grosso del tempo NON sta qui — vedi sotto.
  //
  // Il tempo sta nel database, ed è righe per colori: la ricerca calcola la
  // distanza fra ogni tinta di ogni capo e ogni colore della palette, e sono
  // 79.169 capi per dodici colori. Misurato: con una parola che riduce le
  // righe a centocinquanta, dodici colori costano 307 ms invece di 3.176.
  // Nessun indice può togliere quelle righe — il 93% del catalogo sta entro
  // 34 da un colore della palette, cioè non c'è niente da scartare — e
  // togliere colori cambierebbe i completi, perché i sette meno importanti
  // valgono comunque il 37% dei capi scelti. Sotto i sei secondi non si va
  // senza cambiare come il database calcola quel minimo.
  //
  const pesca = async (parole) => {
    // Con le parole vince la ricerca che parte dalle parole; senza, quella
    // che parte dall'indice dei colori. Sono due domande diverse e vogliono
    // due strategie opposte — la misura sta in app/api/capi.
    const risposta = await supabase.rpc(parole?.length ? "capi_per_palette" : "capi_per_palette_v2", {
      ...comuni,
      palette: voluti.map((c) => ({ l: c.lab.L, a: c.lab.a, b: c.lab.b })),
      quanti: 420,
      parole,
    });
    if (risposta.error) return { data: null, error: risposta.error };
    return { data: risposta.data || [], error: null };
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

  // E un abito lo prende UN completo solo, non tutti e quattro.
  //
  // Con 2.949 abiti in catalogo e una palette di dodici colori ce n'è sempre
  // uno perfetto — chiesti tutti e quarantotto i completi, dodici stagioni
  // per quattro periodi, l'abito c'era in quarantotto su quarantotto, e lo
  // scarto mediano era 0,8 su una soglia di 12. Siccome l'abito fa da solo
  // sopra e sotto, quei due ruoli saltavano sempre: maglia e pantaloni non
  // venivano proposti MAI, e i quattro completi erano lo stesso completo con
  // un cappotto diverso.
  //
  // Vale la stessa regola dei capi già usati, un passo più su: non è il capo
  // che si ripete, è la forma del completo.
  let abitoGiaUsato = false;

  const completi = PERIODI.map((periodo) => {
    const adatti = (righe) => righe.filter((c) => c.ruolo && adattoAlPeriodo(c.titolo, periodo));
    const daStile = adatti(vestiti);
    const daTutto = adatti(qualsiasi);

    const scelti = [];
    const negoziUsati = new Set();
    const coloriUsati = new Set();

    // Un abito fa da solo sopra e sotto: se c'è, gli altri due ruoli saltano
    // e al loro posto si riempie lui — vedi ruoliDaRiempire, che è dove la
    // sostituzione stava a metà.
    const conAbito = abitoGiaUsato
      ? null
      : daStile.find((c) => c.ruolo === "intero" && !giaUsati.has(c.id) && c.scarto < 12);
    if (conAbito) abitoGiaUsato = true;

    for (const ruolo of ruoliDaRiempire(periodo, Boolean(conAbito))) {
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
