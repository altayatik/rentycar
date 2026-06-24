import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white/80">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <p>
          RentyCar is an independent hobby project. Not affiliated with any rental car company,
          airport, automaker, or travel provider.
        </p>
        <nav className="flex gap-4 font-medium">
          <Link className="text-slate-600 transition hover:text-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700" to="/about">
            About
          </Link>
          <Link className="text-slate-600 transition hover:text-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700" to="/legal">
            Legal
          </Link>
        </nav>
      </div>
    </footer>
  );
}
