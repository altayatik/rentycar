import { Link } from "react-router-dom";
import { useTheme } from "../features/theme/themeStore";

export function Footer() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <footer className={isDark ? "border-t border-white/10 bg-[#070a12]" : "border-t border-slate-200 bg-white"}>
      <div
        className={`mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8 ${
          isDark ? "text-slate-400" : "text-slate-500"
        }`}
      >
        <p>
          RentyCar is an independent hobby project. Not affiliated with any rental car company,
          airport, automaker, or travel provider.
        </p>
        <nav className="flex gap-4 font-medium">
          <Link
            className={
              isDark
                ? "text-slate-400 transition hover:text-teal-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
                : "text-slate-500 transition hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
            }
            to="/about"
          >
            About
          </Link>
          <Link
            className={
              isDark
                ? "text-slate-400 transition hover:text-teal-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
                : "text-slate-500 transition hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
            }
            to="/legal"
          >
            Legal
          </Link>
        </nav>
      </div>
    </footer>
  );
}
