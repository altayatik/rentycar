import { Link } from "react-router-dom";

export function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="panel p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-normal text-indigo-700">About RentyCar</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          A small experiment for clearer rental car expectations.
        </h1>
        <div className="mt-6 space-y-4 text-base leading-8 text-slate-600">
          <p>
            RentyCar is an independent hobby project built to explore a simple idea: what if rental
            car customers could see real-world reports of the cars people actually receive at airport
            rental counters?
          </p>
          <p>
            Rental car websites often show example vehicles such as "Toyota Camry or similar."
            RentyCar is not trying to replace official rental company information. It is simply a
            community-style experiment for collecting observations about vehicle make, model, mileage,
            condition, airport, and rental company.
          </p>
          <p>
            RentyCar is not affiliated with, endorsed by, sponsored by, or connected to any rental car
            company, airport, automaker, travel agency, booking platform, or mapping provider.
          </p>
          <p>
            The information on this site is user-submitted and may be incomplete, inaccurate, outdated,
            or subjective. Vehicle availability changes constantly. Always verify rental details directly
            with the rental company before making travel decisions.
          </p>
          <p>
            RentyCar does not currently offer public account creation. Accounts are manually created by
            the project owner while the project is in early testing.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="button-primary" to="/">
            View public reports
          </Link>
          <Link className="button-secondary" to="/legal">
            Read disclaimers
          </Link>
        </div>
      </section>
    </div>
  );
}
