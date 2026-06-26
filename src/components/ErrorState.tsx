interface ErrorStateProps {
  title?: string;
  message: string;
  tone?: "light" | "dark";
}

export function ErrorState({ title = "Something went wrong", message, tone = "light" }: ErrorStateProps) {
  if (tone === "dark") {
    return (
      <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-red-200/80">{message}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <p className="font-semibold">{title}</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}
