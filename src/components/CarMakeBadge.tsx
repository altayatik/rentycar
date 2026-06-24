type CarMakeBadgeProps = {
  make: string;
  size?: "sm" | "md" | "lg";
};

// Stylized text badges only — no third-party logo assets. Brand names are
// shown as plain text/initials for identification purposes; RentyCar is not
// affiliated with any of these companies.
const palettes = [
  "from-teal-500 to-teal-700",
  "from-sky-500 to-blue-700",
  "from-rose-500 to-red-700",
  "from-amber-500 to-orange-600",
  "from-violet-500 to-purple-700",
  "from-emerald-500 to-green-700",
  "from-cyan-500 to-teal-700",
  "from-fuchsia-500 to-pink-700",
  "from-indigo-500 to-blue-800",
  "from-lime-500 to-emerald-700",
];

const sizeClasses: Record<NonNullable<CarMakeBadgeProps["size"]>, string> = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-10 w-10 text-xs",
  lg: "h-14 w-14 text-base",
};

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getInitials(make: string) {
  const cleaned = make.replace(/[^a-zA-Z0-9 ]/g, " ").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function CarMakeBadge({ make, size = "md" }: CarMakeBadgeProps) {
  const palette = palettes[hashString(make) % palettes.length];
  const initials = getInitials(make);

  return (
    <span
      role="img"
      aria-label={make}
      title={make}
      className={`inline-flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${palette} ${sizeClasses[size]} font-bold uppercase tracking-tight text-white shadow-sm ring-1 ring-white/40`}
    >
      {initials}
    </span>
  );
}
