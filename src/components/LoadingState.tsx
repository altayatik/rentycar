interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Loading" }: LoadingStateProps) {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
      <span className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-indigo-700 border-t-transparent" />
      {label}
    </div>
  );
}
