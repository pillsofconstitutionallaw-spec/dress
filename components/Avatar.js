"use client";

// La faccia dell'account: la foto se c'è, altrimenti le iniziali sul colore
// che hai scelto. Un quadrato, non un cerchio — qui i bordi sono squadrati.
export default function Avatar({ foto, nome, cognome, colore = "#1B2A41", lato = 84 }) {
  const iniziali = `${(nome || "").trim()[0] || ""}${(cognome || "").trim()[0] || ""}`.toUpperCase();

  return (
    <div
      style={{
        width: lato,
        height: lato,
        flex: `0 0 ${lato}px`,
        background: foto ? "var(--stone)" : colore,
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        border: "1px solid var(--line)",
      }}
    >
      {foto ? (
        <img src={foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span
          style={{
            // Il testo sopra un colore scelto da qualcun altro: si calcola se
            // quel colore è chiaro o scuro, invece di sperare che vada bene.
            color: chiaroSopra(colore) ? "#111213" : "#ffffff",
            fontSize: lato * 0.34,
            fontWeight: 600,
            letterSpacing: "0.02em",
          }}
        >
          {iniziali || "•"}
        </span>
      )}
    </div>
  );
}

// Luminanza percepita: il verde pesa più del blu, e il rosso sta in mezzo.
function chiaroSopra(hex) {
  const h = String(hex || "").replace("#", "");
  if (h.length !== 6) return false;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}
