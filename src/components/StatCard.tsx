import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
}

export function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="panel p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {icon ? (
          <div className="rounded-xl border border-teal-100 bg-teal-50 p-2 text-teal-700">{icon}</div>
        ) : null}
      </div>
      <p className="mt-4 break-words text-3xl font-semibold tracking-normal text-slate-950">{value}</p>
    </div>
  );
}
