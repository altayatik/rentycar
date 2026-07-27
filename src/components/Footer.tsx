import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="site-footer-brand">
          <img src={logo} alt="" width="42" height="42" loading="lazy" decoding="async" />
          <div>
            <strong>RentyCar</strong>
            <span>The community field atlas for airport rental cars.</span>
          </div>
        </div>

        <p>
          An independent hobby project. Not affiliated with any rental company, airport,
          automaker, or travel provider.
        </p>

        <nav>
          <Link to="/">Explore</Link>
          <Link to="/about">About</Link>
          <a href="/rentycar/0.rentycar/">Low bandwidth</a>
          <Link to="/about#legal">Legal</Link>
          <a href="mailto:rentycar@altayatik.com">Contact <ArrowUpRight /></a>
        </nav>

        <div className="site-footer-bottom">
          <span>© {new Date().getFullYear()} RentyCar</span>
          <span>Built for the rental-counter curious.</span>
        </div>
      </div>
    </footer>
  );
}
