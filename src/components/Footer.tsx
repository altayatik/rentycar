import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

export function Footer() {
  return (
    <footer
      className="relative mt-auto"
      style={{ background: "linear-gradient(180deg, #1e2127 0%, #16181c 100%)" }}
    >
      <div className="hazard" style={{ borderRadius: 0, opacity: 0.35 }} />

      <div className="shell py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <img src={logo} alt="" className="h-10 w-10 rounded-[3px] object-cover" />
            <div>
              <p className="sign text-lg" style={{ color: "var(--board-ink)" }}>
                RentyCar
              </p>
              <p className="mono mt-1.5 max-w-md text-[11px] leading-relaxed" style={{ color: "#8d8a80" }}>
                An independent hobby project. Not affiliated with any rental car company, airport,
                automaker, or travel provider.
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap items-start gap-x-10 gap-y-6">
            <div>
              <p className="stencil" style={{ color: "#6f6c64" }}>
                Register
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <FooterLink to="/">Map &amp; board</FooterLink>
                <FooterLink to="/submit">Log a sighting</FooterLink>
              </div>
            </div>
            <div>
              <p className="stencil" style={{ color: "#6f6c64" }}>
                Project
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <FooterLink to="/about">About</FooterLink>
                <FooterLink to="/about#legal">Legal &amp; disclaimers</FooterLink>
              </div>
            </div>
          </nav>
        </div>

        <div
          className="mt-8 flex flex-wrap items-center justify-between gap-3 pt-6"
          style={{ borderTop: "1px solid #ffffff14" }}
        >
          <p className="mono text-[11px]" style={{ color: "#6f6c64" }}>
            © {new Date().getFullYear()} RentyCar
          </p>
          <p className="mono text-[11px]" style={{ color: "#6f6c64" }}>
            Built as a hobby project
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="text-xs font-bold uppercase tracking-[0.06em] transition-colors"
      style={{ color: "var(--board-ink-2)" }}
    >
      {children}
    </Link>
  );
}
