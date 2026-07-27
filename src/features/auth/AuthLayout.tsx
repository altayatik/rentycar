import { ArrowLeft, CarFront, Gauge, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BackgroundArt } from "../../components/BackgroundArt";
import logo from "../../assets/logo.png";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  aside,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  aside?: ReactNode;
}) {
  const isLogin = title === "Welcome back";

  return (
    <div className="auth-shell">
      <BackgroundArt />
      <aside className="auth-brand-panel">
        <Link to="/" className="auth-brand">
          <img src={logo} alt="" width="42" height="42" decoding="async" />
          <span><strong>RentyCar</strong></span>
        </Link>
        <div className="auth-brand-copy">
          <p>{isLogin ? "WELCOME BACK" : "YOUR RENTAL LOGBOOK"}</p>
          <h2>
            {isLogin ? "Your travel history has been waiting." : "Remember every car behind the keys."}
          </h2>
          <p className="auth-brand-description">
            {isLogin
              ? "Pick up where you left off. Your sightings, airport stamps, and fleet notes are right where you left them."
              : "Build a private record of the airport rentals, equipment, and little details worth remembering."}
          </p>
        </div>
        <div className="auth-brand-note">
          <span><CarFront />Actual vehicles</span>
          <span><Gauge />Real mileage</span>
          <span><MapPin />Airport by airport</span>
        </div>
      </aside>

      <main className="auth-main">
        <Link to="/" className="auth-back"><ArrowLeft />Back to atlas</Link>
        <div className="auth-form-wrap animate-rise">
          <div className="auth-form-heading">
            <span>RentyCar account</span>
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <div className="auth-card">{children}</div>
          {footer ? <div className="auth-footer">{footer}</div> : null}
          {aside ? <div className="auth-aside">{aside}</div> : null}
        </div>
      </main>
    </div>
  );
}
