interface EmptyStateProps {
  title: string;
  message: string;
  tone?: "light" | "dark";
}

export function EmptyState({ title, message, tone = "light" }: EmptyStateProps) {
  if (tone === "dark") {
    return (
      <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
        <h3 className="font-display text-base font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm text-slate-400">{message}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
    </div>
  );
}
