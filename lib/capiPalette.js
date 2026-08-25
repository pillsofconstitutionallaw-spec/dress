import { differenza, hexALab } from "@/lib/colore";

// I pezzi condivisi fra chi cerca capi per palette.
//
// Stavano tutti dentro app/api/capi/route.js, e la pagina degli stili aveva
// bisogno degli stessi: prima di copiarli si spostano qui.

// Dalla palette (nomi e hex) alle coordinate percettive.
export function coloriVoluti(palette) {
  return (palette || [])
    .map((c) => ({ nome: c.name || c.nome || "", lab: hexALab(c.hex) }))
    .filter((c) => c.lab);
}

// A ogni capo si attacca QUALE colore della palette ha centrato, e di quanto
// ha sbagliato. È l'informazione che rende il consiglio comprensibile.
export function arricchisci(righe, voluti) {
  return (righe || []).map((capo) => {
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
    return { ...capo, colore_palette: vicino, scarto: Number(scarto.toFixed(1)) };
  });
}

// Alcuni negozi pubblicano lo stesso capo una volta per variante: senza
// questo l'utente vede sei volte lo stesso portafortuna bordeaux.
export function senzaDoppioni(capi) {
  const visti = new Set();
  return capi.filter((c) => {
    const chiave = `${c.negozio}|${String(c.titolo).toLowerCase().trim()}`;
    if (visti.has(chiave)) return false;
    visti.add(chiave);
    return true;
  });
}

/**
 * Alterna i capi fra i colori della palette.
 *
 * Senza questo la classifica la vincono i capi che il negozio chiama già col
 * nome esatto del colore — scarto zero — e l'utente vede sei magliette verdi
 * invece dei suoi cinque colori. Qui si pesca a turno dal gruppo di ogni
 * colore, tenendo l'ordine di merito dentro ciascuno.
 */
export function distribuisci(capi, voluti) {
  const gruppi = new Map(voluti.map((v) => [v.nome, []]));
  for (const capo of capi) {
    if (!gruppi.has(capo.colore_palette)) gruppi.set(capo.colore_palette, []);
    gruppi.get(capo.colore_palette).push(capo);
  }

  const code = [...gruppi.values()].filter((g) => g.length);
  const fuori = [];
  let i = 0;
  while (fuori.length < capi.length) {
    const coda = code[i % code.length];
    if (coda.length) fuori.push(coda.shift());
    else if (code.every((c) => !c.length)) break;
    i++;
  }
  return fuori;
}
