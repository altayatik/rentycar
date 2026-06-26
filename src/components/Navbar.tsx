import { BookOpen, CarFront, Info, LayoutDashboard, LogIn, Map, Scale, Shield, UserPlus, Users } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../features/auth/authStore";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 ${
    isActive ? "bg-indigo-50 text-indigo-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
  }`;

export function Navbar() {
  const { user, profile, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-[1000] border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-slate-950">
          <span className="rounded-lg bg-indigo-700 p-2 text-white">
            <CarFront className="h-5 w-5" aria-hidden="true" />
          </span>
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
              <button className="button-secondary" type="button" onClick={signOut}>
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
        </nav>
      </div>
    </header>
  );
}
