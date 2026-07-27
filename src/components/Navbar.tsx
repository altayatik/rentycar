import {
  BookOpen,
  CarFront,
  Compass,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Plus,
  Settings,
  Shield,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/authStore";
import logo from "../assets/logo.png";
import { Badge, cx } from "./ui";

const memberLinks = [
  { to: "/dashboard", label: "Logbook", icon: LayoutDashboard },
  { to: "/stamps", label: "Achievements", icon: BookOpen },
  { to: "/friends", label: "Friends", icon: Users },
  { to: "/account", label: "Account", icon: Settings },
] as const;

const workspacePaths = ["/dashboard", "/stamps", "/friends", "/account", "/submit", "/admin"];

export function Navbar() {
  const { user, profile, loading, signOut } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const isWorkspace = Boolean(user && workspacePaths.some((path) => location.pathname.startsWith(path)));
  const isAdmin = profile?.role === "admin";
  const isPending = profile?.status === "pending";

  useEffect(() => setOpen(false), [location.pathname]);

  if (isWorkspace) {
    const links = isAdmin
      ? [...memberLinks, { to: "/admin", label: "Admin", icon: Shield } as const]
      : memberLinks;

    return (
      <>
        <aside className="workspace-rail">
          <BrandLink compact />

          <nav className="workspace-nav" aria-label="Member navigation">
            <p>Workspace</p>
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === "/dashboard"}>
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
            <p>Explore</p>
            <NavLink to="/">
              <Compass aria-hidden="true" />
              <span>Public atlas</span>
            </NavLink>
          </nav>

          {!isPending ? (
            <Link to="/submit" className="workspace-add">
              <Plus aria-hidden="true" />
              Log a car
            </Link>
          ) : (
            <Badge tone="gold">Pending approval</Badge>
          )}

          <div className="workspace-account">
            <Avatar name={profile?.nickname || profile?.username || "?"} size={38} />
            <div>
              <strong>{profile?.nickname || profile?.username}</strong>
              <span>@{profile?.username}</span>
            </div>
            <button type="button" onClick={signOut} aria-label="Sign out" title="Sign out">
              <LogOut aria-hidden="true" />
            </button>
          </div>
        </aside>

        <header className="workspace-mobile-header">
          <BrandLink />
          <button type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? "Close menu" : "Open menu"}>
            {open ? <X /> : <Menu />}
          </button>
        </header>

        {open ? (
          <div className="workspace-mobile-menu">
            <nav>
              {links.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} end={to === "/dashboard"}>
                  <Icon aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
              <NavLink to="/"><Compass aria-hidden="true" />Public atlas</NavLink>
            </nav>
            {!isPending ? <Link to="/submit" className="btn btn-accent"><Plus />Log a car</Link> : null}
            <button type="button" className="btn btn-ghost" onClick={signOut}><LogOut />Sign out</button>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <header className="public-nav">
      <BrandLink />
      <nav aria-label="Public navigation">
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/search">Search</NavLink>
        <NavLink to="/about">About</NavLink>
      </nav>
      <div className="public-nav-actions">
        {loading ? (
          <span className="nav-auth-loading" aria-label="Loading account" />
        ) : user ? (
          <>
            <Link to="/dashboard" className="btn btn-secondary btn-sm">
              <LayoutDashboard />
              My logbook
            </Link>
            {!isPending ? <Link to="/submit" className="btn btn-accent btn-sm"><Plus />Log a car</Link> : null}
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-secondary btn-sm"><LogIn />Sign in</Link>
            <Link to="/signup" className="btn btn-primary btn-sm"><UserPlus />Join RentyCar</Link>
          </>
        )}
      </div>
    </header>
  );
}

function BrandLink({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className={cx("renty-brand", compact && "renty-brand-compact")} aria-label="RentyCar home">
      <span><img src={logo} alt="" width="42" height="42" decoding="async" /></span>
      <strong>RentyCar</strong>
    </Link>
  );
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      aria-hidden="true"
    >
      {initials || <CarFront />}
    </span>
  );
}
