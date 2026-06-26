import type { ReactNode } from "react";
import { useTheme } from "../features/theme/themeStore";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { theme } = useTheme();
  return (
    <div className={`flex min-h-screen flex-col ${theme === "dark" ? "night-shell" : "bg-slate-50"}`}>
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      <Footer />
    </div>
  );
}
