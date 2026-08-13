"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandMark from "@/components/BrandMark";

// Decide che aspetto ha lo schermo intorno al contenuto.
//
// Dress è un'app, non un sito: dentro non ci sono barre di navigazione con
// link né piè di pagina, ma tre comandi in basso, dove arriva il pollice.
// Le uniche due pagine che restano "sito" sono la vetrina e la privacy,
// perché quelle si aprono da un link e vanno lette.

const PAGINE_SITO = ["/scopri", "/privacy"];
const SENZA_CORNICE = ["/", "/auth/confirmed"];

const VOCI = [
  {
    href: "/start",
    label: "Stile",
    icona: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
      </>
    ),
  },
  {
    href: "/outfit",
    label: "Completi",
    icona: (
      <>
        <path d="M6 3l6 3 6-3 2 6-3 1v11H7V10L4 9z" />
      </>
    ),
  },
  {
    href: "/cerca",
    label: "Cerca",
    icona: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4.5 4.5" />
      </>
    ),
  },
  {
    href: "/dashboard",
    label: "Guardaroba",
    icona: (
      <>
        <path d="M4 9h16v11H4z" />
        <path d="M9 9V6a3 3 0 0 1 6 0v3" />
      </>
    ),
  },
];

export default function Cornice({ children }) {
  const percorso = usePathname() || "/";

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

  // Dentro l'app: contenuto a schermo pieno e barra in basso.
  return (
    <>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", maxWidth: 560, margin: "0 auto" }}>
          {VOCI.map((v) => {
            const attiva = percorso.startsWith(v.href);
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
                  width="23"
                  height="23"
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
                <span style={{ fontSize: 11, letterSpacing: "0.06em" }}>{v.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
