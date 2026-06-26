import type { ReactNode } from "react";

export type StatCardTone = "teal" | "indigo" | "rose" | "amber" | "sky" | "violet";

const toneClassesLight: Record<StatCardTone, string> = {
  teal: "border-teal-100 bg-teal-50 text-teal-700",
  indigo: "border-indigo-100 bg-indigo-50 text-indigo-700",
  rose: "border-rose-100 bg-rose-50 text-rose-700",
  amber: "border-amber-100 bg-amber-50 text-amber-700",
  sky: "border-sky-100 bg-sky-50 text-sky-700",
  violet: "border-violet-100 bg-violet-50 text-violet-700",
};

const toneClassesDark: Record<StatCardTone, string> = {
  teal: "border-teal-400/20 bg-teal-400/10 text-teal-300",
  indigo: "border-indigo-400/20 bg-indigo-400/10 text-indigo-300",
  rose: "border-rose-400/20 bg-rose-400/10 text-rose-300",
  amber: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  sky: "border-sky-400/20 bg-sky-400/10 text-sky-300",
  violet: "border-violet-400/20 bg-violet-400/10 text-violet-300",
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  tone?: StatCardTone;
  theme?: "light" | "dark";
}

export function StatCard({ label, value, icon, tone = "teal", theme = "light" }: StatCardProps) {
  const isDark = theme === "dark";
  const toneClasses = isDark ? toneClassesDark : toneClassesLight;

  return (
    <div
      className={
        isDark
          ? "glass-panel flex h-full flex-col justify-between p-5 transition hover:-translate-y-0.5"
          : "panel flex h-full flex-col justify-between p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
      }
    >
      <div className="flex items-center justify-between gap-4">
        <p className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>{label}</p>
        {icon ? <div className={`rounded-xl border p-2 ${toneClasses[tone]}`}>{icon}</div> : null}
      </div>
      <p
        className={`mt-4 line-clamp-2 break-words text-2xl font-semibold tracking-normal ${
          isDark ? "font-display text-white" : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
