"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandMark from "@/components/BrandMark";

// Decide che aspetto ha lo schermo intorno al contenuto.
//
// Dress è un'app, non un sito: dentro non ci sono barre di navigazione con
// link né piè di pagina, ma quattro comandi in basso, dove arriva il pollice.
// Le uniche due pagine che restano "sito" sono la vetrina e la privacy,
// perché quelle si aprono da un link e vanno lette.

const PAGINE_SITO = ["/scopri", "/privacy"];
const SENZA_CORNICE = ["/", "/auth/confirmed"];

// Quattro posti, non dodici.
//
// La barra in basso aveva sei voci, più una rotella in alto, più otto schede
// nel Guardaroba che portavano alle stesse pagine e ad altre che dalla barra
// non si raggiungevano: i saldi, gli smalti, i negozi vicini. Chi apriva
// l'app non sapeva da dove cominciare, e chi cercava una cosa doveva
// ricordarsi da quale porta si entrava.
//
// Adesso ogni pagina sta dentro uno di quattro posti, e ogni posto ha in
// alto le sue schede. Una pagina che non è nella barra si trova lo stesso,
// perché sta sotto la voce di cui fa parte.
const VOCI = [
  {
    href: "/tuo-stile",
    label: "I miei colori",
    schede: [
      { href: "/tuo-stile", label: "Colori e stili" },
      { href: "/unghie", label: "Smalti" },
      { href: "/colors", label: "Colori dell'anno" },
    ],
    icona: (
      <>
        <path d="M12 3.5c4.7 0 8.5 3.4 8.5 7.6 0 2.6-2.1 4.2-4.6 4.2h-1.6a1.6 1.6 0 0 0-1.1 2.7 1.6 1.6 0 0 1-1.2 2.5C7.3 20.5 3.5 16.7 3.5 12S7.3 3.5 12 3.5z" />
        <circle cx="8" cy="11" r="1.1" />
        <circle cx="11.5" cy="7.6" r="1.1" />
        <circle cx="15.8" cy="9.2" r="1.1" />
      </>
    ),
  },
  {
    href: "/cerca",
    label: "Cerca",
    schede: [
      { href: "/cerca", label: "Catalogo" },
      { href: "/offers", label: "In sconto" },
      { href: "/vicini", label: "Vicino a te" },
    ],
    icona: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4.5 4.5" />
      </>
    ),
  },
  {
    href: "/armadio",
    label: "Armadio",
    schede: [
      { href: "/armadio", label: "I miei capi" },
      { href: "/dashboard", label: "Preferiti" },
      { href: "/outfit", label: "Completi" },
      { href: "/wardrobe", label: "Abbina" },
      { href: "/vendi", label: "Vendi" },
    ],
    icona: (
      <>
        <path d="M12 7.2a1.9 1.9 0 1 1 1.9-1.9c0 1-.6 1.4-1.3 1.9-.5.3-.6.6-.6 1.2" />
        <path d="M12 8.4 3.6 14.6c-.8.6-.4 1.9.6 1.9h15.6c1 0 1.4-1.3.6-1.9z" />
      </>
    ),
  },
  {
    // Le impostazioni stavano sotto una rotella fissa in alto a destra, che
    // copriva i titoli delle pagine. Sono cose del proprio account: stanno
    // col profilo.
    href: "/profilo",
    label: "Profilo",
    schede: [
      { href: "/profilo", label: "Profilo" },
      { href: "/impostazioni", label: "Impostazioni" },
    ],
    icona: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
      </>
    ),
  },
];

const dentro = (percorso, href) => percorso === href || percorso.startsWith(href + "/");

export default function Cornice({ children }) {
  const percorso = usePathname() || "/";
  const sezione = VOCI.find((v) => v.schede.some((sc) => dentro(percorso, sc.href)));

  if (SENZA_CORNICE.includes(percorso)) {
    return <main style={{ minHeight: "100dvh" }}>{children}</main>;
  }

  if (PAGINE_SITO.includes(percorso)) {
    return (
      <>
        <header style={{ borderBottom: "1px solid var(--line)", position: "sticky", top: 0, background: "var(--paper)", zIndex: 20 }}>
          <div className="wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 66 }}>
            <Link href="/scopri" style={{ display: "inline-flex", alignItems: "center" }}>
              <BrandMark small />
            </Link>
            <Link href="/" className="btn">Entra</Link>
          </div>
        </header>
        <main>{children}</main>
        <footer style={{ borderTop: "1px solid var(--line)", marginTop: 96 }}>
          <div className="wrap" style={{ padding: "40px var(--pad)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
            <span className="eyebrow">Dress</span>
            <span className="muted" style={{ fontSize: 13, display: "flex", gap: 16 }}>
              <Link href="/privacy">Privacy</Link>
              <span>Moda che ti somiglia.</span>
            </span>
          </div>
        </footer>
      </>
    );
  }

  // Dentro l'app: le schede della voce in alto, il contenuto, e la barra in
  // basso dove arriva il pollice.
  return (
    <>
      {sezione && sezione.schede.length > 1 ? (
        <nav
          aria-label={sezione.label}
          style={{
            position: "sticky",
            top: 0,
            zIndex: 20,
            background: "var(--paper)",
            borderBottom: "1px solid var(--line)",
            paddingTop: "env(safe-area-inset-top)",
          }}
        >
          <div className="wrap schede" style={{ display: "flex", gap: 22, overflowX: "auto", maxWidth: 960 }}>
            {sezione.schede.map((sc) => {
              const attiva = dentro(percorso, sc.href);
              return (
                <Link
                  key={sc.href}
                  href={sc.href}
                  aria-current={attiva ? "page" : undefined}
                  style={{
                    padding: "14px 0 12px",
                    fontSize: 14,
                    whiteSpace: "nowrap",
                    color: attiva ? "var(--ink)" : "var(--greige)",
                    fontWeight: attiva ? 600 : 400,
                    borderBottom: `2px solid ${attiva ? "var(--ink)" : "transparent"}`,
                  }}
                >
                  {sc.label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}

      <main style={{ minHeight: "100dvh", paddingBottom: "calc(72px + env(safe-area-inset-bottom))" }}>
        {children}
      </main>

      <nav
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 30,
          background: "var(--paper)",
          borderTop: "1px solid var(--line)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Le colonne le conta l'elenco: erano fissate a quattro, e la quinta
            voce sarebbe finita fuori dalla griglia. */}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${VOCI.length}, 1fr)`, maxWidth: 560, margin: "0 auto" }}>
          {VOCI.map((v) => {
            const attiva = v === sezione;
            return (
              <Link
                key={v.href}
                href={v.href}
                aria-current={attiva ? "page" : undefined}
                style={{
                  display: "grid",
                  justifyItems: "center",
                  gap: 4,
                  padding: "10px 0 12px",
                  color: attiva ? "var(--ink)" : "var(--greige)",
                  textDecoration: "none",
                }}
              >
                <svg
                  width={23}
                  height={23}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={attiva ? 1.9 : 1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {v.icona}
                </svg>
                <span style={{ fontSize: 12, letterSpacing: "0.01em", whiteSpace: "nowrap", fontWeight: attiva ? 600 : 400 }}>{v.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
