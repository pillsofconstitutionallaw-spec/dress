import Link from "next/link";

// Quello che si vede dove serve l'analisi e l'analisi non c'è.
//
// Era scritto cinque volte, in cinque modi: un bottone piccolo in maiuscolo
// in una pagina, una barra larga in un'altra, un link dentro una frase dello
// stesso colore del testo in altre due. E sotto, ogni volta, una pagina
// bianca. Chi non aveva ancora fatto l'analisi trovava porte chiuse dappertutto,
// ognuna con una maniglia diversa.
//
// Adesso è una cosa sola, e fa vedere cosa c'è dietro la porta: un esempio
// di quello che arriverà, segnato come esempio, perché nessuno lo scambi per
// il proprio risultato.

// Una palette d'esempio, plausibile e non di nessuno: toni d'autunno caldo,
// i più comuni fra chi fa l'analisi.
const ESEMPIO = ["#7A4E3A", "#B5654A", "#C9A27E", "#E8D9C0", "#5A6B4E", "#9AA88B", "#2C3E5A", "#6E7F99", "#8C3B4A", "#D9B8B0", "#3B3330", "#F2EDE4"];

function Anteprima({ tipo }) {
  if (tipo === "completi") {
    // Un completo dall'alto in basso: capospalla, sopra, sotto, scarpe.
    const altezze = [54, 40, 64, 18];
    return (
      <div style={{ display: "flex", gap: 10 }}>
        {["Primavera", "Estate", "Autunno", "Inverno"].map((stagione, k) => (
          <div key={stagione} style={{ display: "grid", gap: 3, flex: 1 }}>
            {altezze.map((altezza, i) => (
              <div key={i} style={{ height: altezza, background: ESEMPIO[(i * 3 + k * 2) % ESEMPIO.length] }} />
            ))}
            <span className="muted" style={{ fontSize: 11, marginTop: 4, textAlign: "center" }}>{stagione}</span>
          </div>
        ))}
      </div>
    );
  }
  if (tipo === "smalti") {
    return (
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
        {["#8C3B4A", "#B5654A", "#D9B8B0", "#7A4E3A", "#E8D9C0", "#3B3330"].map((c) => (
          <div key={c} style={{ flex: 1, display: "grid", gap: 3 }}>
            <div style={{ height: 14, width: "46%", margin: "0 auto", background: "var(--ink)" }} />
            <div style={{ height: 56, background: c }} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
      {ESEMPIO.map((c) => (
        <div key={c} style={{ aspectRatio: "1", background: c }} />
      ))}
    </div>
  );
}

/**
 * @param titolo   il titolo della pagina, se la pagina non ne ha già uno
 * @param perche   una frase: cosa si ottiene, non perché manca
 * @param tipo     "palette" | "completi" | "smalti": l'esempio da mostrare
 */
export default function PrimaLAnalisi({ titolo, perche, tipo = "palette" }) {
  return (
    <div style={{ display: "grid", gap: 22, marginTop: titolo ? 0 : 24 }}>
      {titolo ? <h1 className="h2" style={{ margin: 0 }}>{titolo}</h1> : null}

      <div style={{ padding: "12px 16px 16px", border: "1px solid var(--line)", background: "var(--paper)" }}>
        <p className="eyebrow" style={{ margin: "0 0 10px", fontSize: 10 }}>Esempio</p>
        <div style={{ opacity: 0.9 }} aria-hidden="true">
          <Anteprima tipo={tipo} />
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5 }}>{perche}</p>

      <p className="muted" style={{ margin: 0, fontSize: 14 }}>
        Una foto e qualche domanda: cinque minuti, una volta sola.
      </p>

      <Link href="/start" className="btn-app">Fai l&apos;analisi</Link>
    </div>
  );
}
