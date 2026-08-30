import { hexALab } from "@/lib/colore";

// Il colore della pelle, dichiarato guardandolo.
//
// Era l'unico dato dell'analisi che non chiedevamo mai: capelli e occhi sì,
// l'incarnato no. Senza foto leggibile l'app partiva da un incarnato medio
// inventato — chiaro e giallino — e da lì usciva "caldo" per chiunque.
//
// Le parole da sole non bastano a chiederlo: "oliva" è la casella in cui si
// mette chi non è né bianchissimo né scuro, e ci finisce dentro anche chi ha
// la pelle rosa tenue. Per questo ogni voce ha il suo quadratino: si sceglie
// confrontando il braccio con il colore, non ricordando come ci si definisce.
//
// hex serve a farlo vedere. L è un'altra cosa: è quanto risulta chiara quella
// pelle QUANDO LA SI MISURA IN UNA FOTO, ed è più bassa del campioncino,
// perché un viso non è mai illuminato come una tinta stesa su carta. Tenerli
// separati evita che, scegliendo il quadratino giusto, si finisca in una
// stagione troppo chiara solo perché il campione è squillante.
//
// indizio è il contributo al sottotono: positivo verso il caldo, negativo
// verso il freddo, sulla stessa scala di occhi e capelli.

export const TONI_PELLE = [
  { id: "porcellana", nome: "Porcellana", hex: "#F7DFD9", L: 80, indizio: -1.6,
    detta: "Chiarissima e rosata. Al sole diventa rossa, non dorata." },
  { id: "avorio", nome: "Avorio", hex: "#F7E3C6", L: 79, indizio: 1.6,
    detta: "Chiarissima ma gialla, come la panna. Nessun rosa sotto." },
  { id: "rosa-tenue", nome: "Rosa tenue", hex: "#F0CDBF", L: 74, indizio: -1.4,
    detta: "Chiara, con un velo di rosa fisso su guance e naso." },
  { id: "miele-chiaro", nome: "Miele chiaro", hex: "#EED3A4", L: 73, indizio: 1.4,
    detta: "Chiara e dorata: prende colore in fretta e lo tiene." },
  { id: "oliva-chiara", nome: "Oliva chiara", hex: "#E2CCA0", L: 71, indizio: 0.7,
    detta: "Chiara, ma con un fondo verdino. Al confronto il rosa non c'è." },
  { id: "beige-rosato", nome: "Beige rosato", hex: "#D9AE9C", L: 66, indizio: -1.2,
    detta: "Media, e il fondo tira al rosa mattone più che al giallo." },
  { id: "sabbia", nome: "Sabbia", hex: "#DCB894", L: 65, indizio: 1.2,
    detta: "Media e dorata, il colore della sabbia asciutta." },
  { id: "oliva-media", nome: "Oliva media", hex: "#C7AC7C", L: 62, indizio: 0.7,
    detta: "Media con fondo verde-oro. La più diffusa nel Mediterraneo." },
  { id: "ambra", nome: "Ambra", hex: "#BE8D5D", L: 55, indizio: 1.3,
    detta: "Ambrata calda, dorata anche d'inverno." },
  { id: "nocciola", nome: "Nocciola", hex: "#A6745A", L: 47, indizio: -0.5,
    detta: "Scura di media intensità, con un fondo più freddo che dorato." },
  { id: "bronzo", nome: "Bronzo", hex: "#8A5C3A", L: 40, indizio: 1.2,
    detta: "Scura e ramata: alla luce si accende di rosso-arancio." },
  { id: "ebano", nome: "Ebano", hex: "#3E2519", L: 27, indizio: 0.4,
    detta: "Molto scura e profonda, con riflessi caldi." },
];

export const tonoPelle = (id) => TONI_PELLE.find((t) => t.id === id) || null;

/**
 * Il colore dichiarato come lo misurerebbe la foto.
 *
 * L'inclinazione (a, b) viene dal campioncino: è quella a dire se la pelle
 * tira al rosa o al giallo, ed è il motivo per cui il quadratino esiste.
 * La luminosità no, viene dalla tabella: vedi sopra.
 */
export function labDelTono(id) {
  const tono = tonoPelle(id);
  if (!tono) return null;
  const lab = hexALab(tono.hex);
  if (!lab) return null;
  return { L: tono.L, a: lab.a, b: lab.b, dichiarato: true };
}

// Quanto pesa sul sottotono. Zero se non l'ha detto: non si inventa.
export const indizioPelle = (id) => tonoPelle(id)?.indizio ?? 0;
