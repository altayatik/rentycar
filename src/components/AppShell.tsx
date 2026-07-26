import type { ReactNode } from "react";
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
  return (
    <div className="relative flex min-h-screen flex-col">
      <BackgroundArt />
      <Navbar />
      <main className={cx("flex-1 pb-16 pt-8", wide ? "w-full" : "shell")}>{children}</main>
      <Footer />
    </div>
  );
}
