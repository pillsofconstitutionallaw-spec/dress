import Link from "next/link";
import BrandMark from "@/components/BrandMark";

export default function Nav() {
  const links = [
    { href: "/start", label: "Scopri il tuo stile" },
    { href: "/colors", label: "Colori dell'anno" },
    { href: "/offers", label: "Offerte" },
    { href: "/wardrobe", label: "Guardaroba" },
  ];
  return (
    <header style={{ borderBottom: "1px solid var(--line)", position: "sticky", top: 0, background: "var(--paper)", zIndex: 20 }}>
      <div className="wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 66 }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center" }}>
          <BrandMark small />
        </Link>
        <nav style={{ display: "flex", gap: "clamp(12px, 2.6vw, 30px)", flexWrap: "wrap", alignItems: "center" }}>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="eyebrow" style={{ letterSpacing: "0.16em" }}>
              {l.label}
            </Link>
          ))}
          <Link href="/start" className="btn ghost" style={{ marginLeft: 6 }}>Iscriviti</Link>
        </nav>
      </div>
    </header>
  );
}
