import Link from "next/link";
import BrandMark from "@/components/BrandMark";

export default function Nav() {
  const links = [
    { href: "/cerca", label: "Cerca" },
    { href: "/dashboard", label: "Dashboard" },
  ];
  return (
    <header style={{ borderBottom: "1px solid var(--line)", position: "sticky", top: 0, background: "var(--paper)", zIndex: 20 }}>
      <div className="wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 66 }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center" }}>
          <BrandMark small />
        </Link>
        <nav style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="eyebrow" style={{ letterSpacing: "0.08em" }}>
              {l.label}
            </Link>
          ))}
          <Link href="/start" className="btn" style={{ marginLeft: 6 }}>Iscriviti</Link>
        </nav>
      </div>
    </header>
  );
}
