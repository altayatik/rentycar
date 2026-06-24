interface ErrorStateProps {
  title?: string;
  message: string;
}

export function ErrorState({ title = "Something went wrong", message }: ErrorStateProps) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <p className="font-semibold">{title}</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}
