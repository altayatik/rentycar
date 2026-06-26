import { BookOpen, Info, LayoutDashboard, LogIn, Map, Moon, Scale, Shield, Sun, UserPlus, Users } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../features/auth/authStore";
import { useTheme } from "../features/theme/themeStore";
import logo from "../assets/logo.png";

const navLinkClassDark = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 ${
    isActive ? "bg-teal-400/15 text-teal-300" : "text-slate-300 hover:bg-white/10 hover:text-white"
  }`;

const navLinkClassLight = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 ${
    isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
  }`;

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const navLinkClass = isDark ? navLinkClassDark : navLinkClassLight;

  return (
    <header
      className={
        isDark
          ? "sticky top-0 z-[1000] border-b border-white/10 bg-[#0a0f1a]/85 backdrop-blur-xl"
          : "sticky top-0 z-[1000] border-b border-slate-200 bg-white/90 backdrop-blur-xl"
      }
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          to="/"
          className={`flex items-center gap-2.5 font-display text-lg font-bold ${isDark ? "text-white" : "text-slate-950"}`}
        >
          <img src={logo} alt="RentyCar" className={`h-9 w-9 rounded-xl ${isDark ? "shadow-glass" : "shadow-sm"}`} />
          RentyCar
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          <NavLink to="/" className={navLinkClass}>
            <Map className="h-4 w-4" aria-hidden="true" />
            Map
          </NavLink>
          <NavLink to="/about" className={navLinkClass}>
            <Info className="h-4 w-4" aria-hidden="true" />
            About
          </NavLink>
          <NavLink to="/legal" className={navLinkClass}>
            <Scale className="h-4 w-4" aria-hidden="true" />
            Legal
          </NavLink>
          {user ? (
            <>
              <NavLink to="/dashboard" className={navLinkClass}>
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                Dashboard
              </NavLink>
              <NavLink to="/stamps" className={navLinkClass}>
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                Stamps
              </NavLink>
              <NavLink to="/friends" className={navLinkClass}>
                <Users className="h-4 w-4" aria-hidden="true" />
                Friends
              </NavLink>
              {profile?.role === "admin" ? (
                <NavLink to="/admin" className={navLinkClass}>
                  <Shield className="h-4 w-4" aria-hidden="true" />
                  Admin
                </NavLink>
              ) : null}
              <button
                className={isDark ? "glass-button-secondary" : "button-secondary"}
                type="button"
                onClick={signOut}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navLinkClass}>
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Login
              </NavLink>
              <NavLink to="/signup" className={navLinkClass}>
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Sign up
              </NavLink>
            </>
          )}
          <button
            type="button"
            className={
              isDark
                ? "inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                : "inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            }
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
