import type { ReactNode } from "react";

export type StatCardTone = "teal" | "indigo" | "rose" | "amber" | "sky" | "violet";

const toneClasses: Record<StatCardTone, string> = {
  teal: "border-teal-100 bg-teal-50 text-teal-700",
  indigo: "border-indigo-100 bg-indigo-50 text-indigo-700",
  rose: "border-rose-100 bg-rose-50 text-rose-700",
  amber: "border-amber-100 bg-amber-50 text-amber-700",
  sky: "border-sky-100 bg-sky-50 text-sky-700",
  violet: "border-violet-100 bg-violet-50 text-violet-700",
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  tone?: StatCardTone;
}

export function StatCard({ label, value, icon, tone = "teal" }: StatCardProps) {
  return (
    <div className="panel p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {icon ? <div className={`rounded-xl border p-2 ${toneClasses[tone]}`}>{icon}</div> : null}
      </div>
      <p className="mt-4 break-words text-3xl font-semibold tracking-normal text-slate-950">{value}</p>
    </div>
  );
}
