type CarMakeBadgeProps = {
  make: string;
  size?: "sm" | "md" | "lg";
};

// Plain text badges only — no third-party logo assets. Brand names are
// shown as plain text for identification purposes; RentyCar is not
// affiliated with any of these companies. The colour is derived
// deterministically from the brand name so the same make always renders
// the same way, without reproducing any real manufacturer emblem.
const palette = [
  { fg: "#1f5f8a", bg: "var(--sky-tint)" },
  { fg: "var(--forest)", bg: "var(--mint-tint)" },
  { fg: "#8a6511", bg: "var(--gold-tint)" },
  { fg: "#9a5333", bg: "var(--terracotta-tint)" },
  { fg: "#5a4da3", bg: "var(--lavender-tint)" },
  { fg: "#8f3d35", bg: "var(--danger-tint)" },
];

const sizeClasses: Record<NonNullable<CarMakeBadgeProps["size"]>, string> = {
  sm: "px-2.5 py-1 text-[11px]",
  md: "px-3 py-1.5 text-xs",
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
  const tone = palette[hashString(make) % palette.length];

  return (
    <span
      role="img"
      aria-label={make}
      title={make}
      className={`inline-flex max-w-full shrink-0 items-center justify-center truncate whitespace-nowrap rounded-full font-bold uppercase tracking-tight ${sizeClasses[size]}`}
      style={{ color: tone.fg, background: tone.bg }}
    >
      {make}
    </span>
  );
}
