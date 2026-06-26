interface LoadingStateProps {
  label?: string;
  tone?: "light" | "dark";
}

export function LoadingState({ label = "Loading", tone = "light" }: LoadingStateProps) {
  if (tone === "dark") {
    return (
      <div className="flex min-h-32 items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-sm text-slate-400">
        <span className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
        {label}
      </div>
    );
  }

  return (
    <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
      <span className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-indigo-700 border-t-transparent" />
      {label}
    </div>
  );
}
