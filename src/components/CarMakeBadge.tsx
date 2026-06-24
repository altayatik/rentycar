type CarMakeBadgeProps = {
  make: string;
  size?: "sm" | "md" | "lg";
};

// Plain text badges only — no third-party logo assets. Brand names are
// shown as plain text for identification purposes; RentyCar is not
// affiliated with any of these companies. The text color is generated
// deterministically from the brand name so the same make always renders
// the same way, without reproducing any real manufacturer emblem.
const textColors = [
  "text-indigo-700",
  "text-sky-700",
  "text-rose-700",
  "text-amber-700",
  "text-violet-700",
  "text-emerald-700",
  "text-cyan-700",
  "text-fuchsia-700",
  "text-blue-700",
  "text-orange-700",
  "text-slate-700",
  "text-pink-700",
];

const sizeClasses: Record<NonNullable<CarMakeBadgeProps["size"]>, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
  lg: "px-3.5 py-1.5 text-sm",
};

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function CarMakeBadge({ make, size = "md" }: CarMakeBadgeProps) {
  const hash = hashString(make);
  const color = textColors[hash % textColors.length];

  return (
    <span
      role="img"
      aria-label={make}
      title={make}
      className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-slate-200 bg-white font-bold uppercase tracking-tight shadow-sm ${color} ${sizeClasses[size]}`}
    >
      {make}
    </span>
  );
}
