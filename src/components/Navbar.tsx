import {
  BookOpen,
  LayoutDashboard,
  LogIn,
  LogOut,
  type LucideIcon,
  Menu,
  PlusCircle,
  Shield,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/authStore";
import logo from "../assets/logo.png";
import { Badge, Button, cx } from "./ui";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

// Deliberately empty. The map is the default page — the logo already goes
// there — and About lives in the footer, so a signed-out visitor gets a bare
// bar with just the wordmark and the two account actions.
const publicLinks: NavItem[] = [];

const memberLinks: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/stamps", label: "Stamps", icon: BookOpen },
  { to: "/friends", label: "Friends", icon: Users },
];

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = user ? [...publicLinks, ...memberLinks] : publicLinks;
  const isAdmin = profile?.role === "admin";
  const isPending = profile?.status === "pending";

  return (
    <header className="sticky top-0 z-40">
      {/* Overhead terminal sign: dark bar, sodium underline. */}
      <div
        className="w-full transition-shadow duration-300"
        style={{
          background: "#f2eee6f2",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid var(--line-2)",
          boxShadow: scrolled ? "0 6px 20px -14px #1b1d2159" : "none",
        }}
      >
        {/* Full width, not the centred shell — otherwise the sign-in buttons
            stop at the content column and look stranded mid-screen on a wide
            display instead of sitting at the window edge. */}
        <div className="flex w-full items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          {/* Logo sits on its own dark chip so its colours don't fight the bar */}
          <span
            className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-[3px]"
            style={{ background: "var(--board)" }}
          >
            <img src={logo} alt="" className="h-7 w-7 object-contain" />
          </span>
          <span className="sign hidden text-xl sm:inline">RentyCar</span>
        </Link>

        {/* Desktop nav */}
        <nav className="mx-auto hidden items-center gap-0.5 lg:flex">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.08em] transition-colors duration-150"
              style={({ isActive }) => ({
                color: isActive ? "var(--ink)" : "var(--ink-3)",
                boxShadow: isActive ? "inset 0 -2px 0 var(--sodium)" : "none",
              })}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
          {isAdmin ? (
            <NavLink
              to="/admin"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.08em] transition-colors duration-150"
              style={({ isActive }) => ({
                color: isActive ? "var(--ink)" : "var(--ink-3)",
                boxShadow: isActive ? "inset 0 -2px 0 var(--sodium)" : "none",
              })}
            >
              <Shield className="h-3.5 w-3.5" aria-hidden="true" />
              Admin
            </NavLink>
          ) : null}
        </nav>

        {/* Desktop actions */}
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              {isPending ? (
                <Badge tone="gold">Pending approval</Badge>
              ) : (
                <Link to="/submit" className="btn btn-accent btn-sm">
                  <PlusCircle className="h-4 w-4" aria-hidden="true" />
                  Log a car
                </Link>
              )}
              <Link
                to="/dashboard"
                className="flex items-center gap-2 rounded-xs py-1 pl-1 pr-2.5 transition-colors hover:bg-[#1b1d210f]"
                title={profile?.username ? `Signed in as ${profile.username}` : "Your account"}
              >
                <Avatar name={profile?.nickname || profile?.username || "?"} size={28} />
                <span
                  className="max-w-[8rem] truncate text-xs font-bold uppercase tracking-[0.06em]"
                >
                  {profile?.nickname || profile?.username}
                </span>
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="btn btn-ghost btn-sm"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="btn btn-ghost btn-sm"
              >
                <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                Sign in
              </Link>
              <Link to="/signup" className="btn btn-accent btn-sm">
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                Join free
              </Link>
            </>
          )}
        </div>

        {/* Mobile trigger */}
        <button
          type="button"
          className="btn btn-ghost btn-icon ml-auto lg:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        </div>
      </div>

      {/* Mobile sheet */}
      {open ? (
        <div
          className="animate-rise shell overflow-hidden py-2 lg:hidden"
          style={{
            background: "var(--paper)",
            borderBottom: "1px solid var(--line-2)",
            boxShadow: "var(--sh-2)",
          }}
        >
          {user ? (
            <div className="mb-2 flex items-center gap-2.5 px-3 py-2.5">
              <Avatar name={profile?.nickname || profile?.username || "?"} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{profile?.nickname || profile?.username}</p>
                <p className="hint truncate">@{profile?.username}</p>
              </div>
              {isPending ? (
                <Badge tone="gold" className="ml-auto">
                  Pending
                </Badge>
              ) : null}
            </div>
          ) : null}

          <nav className="flex flex-col gap-0.5">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  cx(
                    "flex items-center gap-2.5 rounded-xs px-3 py-2.5 text-sm font-semibold transition-colors",
                    isActive ? "text-ink" : "text-ink-2",
                  )
                }
                style={({ isActive }) => ({
                  background: isActive ? "var(--paper)" : "transparent",
                })}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
            {isAdmin ? (
              <NavLink
                to="/admin"
                className="flex items-center gap-2.5 rounded-xs px-3 py-2.5 text-sm font-semibold"
                style={{ color: "var(--gold)" }}
              >
                <Shield className="h-4 w-4" aria-hidden="true" />
                Admin
              </NavLink>
            ) : null}
          </nav>

          <div className="mt-2 flex flex-col gap-2 border-t pt-2" style={{ borderColor: "var(--line)" }}>
            {user ? (
              <>
                {!isPending ? (
                  <Link to="/submit" className="btn btn-accent w-full">
                    <PlusCircle className="h-4 w-4" aria-hidden="true" />
                    Log a car
                  </Link>
                ) : null}
                <Button variant="ghost" onClick={signOut} icon={<LogOut className="h-4 w-4" />}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-secondary w-full">
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  Sign in
                </Link>
                <Link to="/signup" className="btn btn-primary w-full">
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  Join free
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  // Deterministic colour per name so avatars stay stable across renders.
  const palette = ["--sky", "--mint", "--gold", "--terracotta", "--lavender", "--forest"];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const token = palette[hash % palette.length];

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `var(${token})`,
        boxShadow: "var(--sh-1)",
      }}
      aria-hidden="true"
    >
      {initials || "?"}
    </span>
  );
}
