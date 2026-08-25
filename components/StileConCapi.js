"use client";

// Uno stile consigliato, con sotto i capi veri di quello stile.
//
// Scegliere uno stile leggendone il nome è un atto di fede: "Blokecore" non
// dice niente a nessuno, e nemmeno la riga che lo spiega basta. Sotto ci
// stanno quattro capi veri del catalogo, di quello stile e nei colori di chi
// guarda — non foto di repertorio con una modella che non c'entra niente, ma
// cose che si possono comprare adesso.
//
// I capi arrivano da fuori, già pescati: cinque componenti che se li cercano
// da soli erano cinque interrogazioni insieme, e il database le rifiutava
// tutte per timeout.
// Certi negozi mettono nel campo "marca" il codice di magazzino:
// "MCWGAPAINDIP0710S26-058". Sotto una foto non dice niente a nessuno, e il
// nome del negozio almeno è un nome.
function chiLoVende(capo) {
  const marca = String(capo.marca || "").trim();
  const pareUnCodice = /\d{3,}/.test(marca) || (marca.length > 14 && !/\s/.test(marca));
  return (!marca || pareUnCodice ? capo.negozio : marca) || capo.negozio || "";
}

export default function StileConCapi({ stile, posizione, spiegazione, scelto, capi, onScegli }) {
  const inArrivo = capi === null || capi === undefined;

  return (
    <section
      className="card"
      style={{
        padding: "clamp(16px,2.6vw,22px)",
        display: "grid",
        gap: 12,
        border: scelto ? "2px solid var(--ink)" : undefined,
        background: scelto ? "var(--stone)" : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span className="eyebrow" style={{ fontSize: 11, color: "var(--greige)" }}>{posizione}</span>
        <strong style={{ fontSize: 17 }}>{stile.nome}</strong>
      </div>

      {spiegazione ? <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{spiegazione}</p> : null}

      {/* Il perché, e dentro il perché le foto.
          Stavano sotto, come una riga a parte: la ragione da un lato e le
          prove dall'altro. Ma le foto SONO la ragione — "questo stile ti sta
          bene" e "ecco tre capi tuoi di questo stile" sono la stessa frase
          detta in due modi, e vanno lette insieme. */}
      <div
        style={{
          borderLeft: "2px solid var(--ink)",
          paddingLeft: 14,
          display: "grid",
          gap: 12,
          marginTop: 2,
        }}
      >
        <p className="eyebrow" style={{ margin: 0 }}>Perché è adatto a te</p>

        {stile.perche ? (
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>{stile.perche}</p>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {inArrivo
            ? [0, 1, 2].map((i) => (
                <div key={i} style={{ aspectRatio: "3/4", background: "var(--stone)", opacity: 1 - i * 0.18 }} />
              ))
            : capi.slice(0, 3).map((capo) => (
                <a
                  key={capo.id}
                  href={capo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "block", color: "inherit", textDecoration: "none" }}
                >
                  <div style={{ aspectRatio: "3/4", background: "var(--stone)", overflow: "hidden" }}>
                    {capo.immagine ? (
                      <img
                        src={capo.immagine}
                        alt={capo.titolo}
                        loading="lazy"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : null}
                  </div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 5, lineHeight: 1.3 }}>
                    {chiLoVende(capo)}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>
                    {capo.prezzo ? `${Math.round(capo.prezzo)} €` : ""}
                  </div>
                </a>
              ))}
        </div>

        {!inArrivo && capi.length === 0 ? (
          <p className="muted" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5 }}>
            Di questo stile, nei tuoi colori, in catalogo non c&apos;è ancora niente da mostrarti. Il
            consiglio resta valido: mancano i capi, non lo stile.
          </p>
        ) : (
          <p className="muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>
            Capi veri, dei tuoi colori. Toccali per vederli sul sito del negozio.
          </p>
        )}
      </div>

      <button
        className={scelto ? "btn" : "btn ghost"}
        onClick={() => onScegli(scelto ? null : stile.nome)}
        style={{ justifySelf: "start", marginTop: 2 }}
      >
        {scelto ? "È il tuo stile ✓" : "Scegli questo stile"}
      </button>
    </section>
  );
}
