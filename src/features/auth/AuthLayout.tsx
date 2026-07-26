import { ArrowLeft } from "lucide-react";
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
  return (
    <div className="relative flex min-h-screen flex-col px-4 py-8 sm:px-6">
      <BackgroundArt />

      <div className="mx-auto w-full max-w-5xl">
        <Link
          to="/"
          className="muted inline-flex items-center gap-1.5 text-sm font-semibold transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to RentyCar
        </Link>
      </div>

      <div
        className={`mx-auto flex w-full flex-1 items-center ${aside ? "max-w-5xl" : "max-w-md"}`}
      >
        <div className={`grid w-full gap-8 py-8 ${aside ? "lg:grid-cols-[1fr_0.85fr] lg:items-center" : ""}`}>
          <div className="animate-rise mx-auto w-full max-w-md">
            <Link to="/" className="mb-7 flex items-center justify-center gap-3">
              <img
                src={logo}
                alt=""
                className="h-14 w-14 rounded-full object-cover"
                style={{ boxShadow: "var(--sh-2)" }}
              />
              <span className="text-2xl font-extrabold tracking-tight">RentyCar</span>
            </Link>

            <div className="card p-6 sm:p-8">
              <div className="mb-6 text-center">
                <h1 className="h1">{title}</h1>
                {subtitle ? <p className="muted mt-2 text-sm leading-relaxed">{subtitle}</p> : null}
              </div>
              {children}
            </div>

            {footer ? <div className="mt-6 text-center text-sm">{footer}</div> : null}
          </div>

          {aside ? (
            <div className="animate-rise hidden lg:block" style={{ animationDelay: "0.12s" }}>
              {aside}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
