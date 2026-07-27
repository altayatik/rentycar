import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/authStore";
import { BackgroundArt } from "./BackgroundArt";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";
import { cx } from "./ui";

interface AppShellProps {
  children: ReactNode;
  /** Full-bleed pages (the map home page) skip the centred content gutter. */
  wide?: boolean;
}

export function AppShell({ children, wide = false }: AppShellProps) {
  const { user } = useAuth();
  const location = useLocation();
  const isWorkspace = Boolean(
    user && ["/dashboard", "/stamps", "/friends", "/account", "/submit", "/admin"].some((path) => location.pathname.startsWith(path)),
  );

  return (
    <div className={cx("app-shell", isWorkspace && "app-shell-workspace")}>
      <BackgroundArt />
      <Navbar />
      <main className={cx(isWorkspace ? "workspace-main" : "public-main", wide ? "w-full" : "shell")}>
        {children}
      </main>
      {!isWorkspace ? <Footer /> : null}
    </div>
  );
}
