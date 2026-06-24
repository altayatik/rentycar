import { Car } from "lucide-react";

type CarMakeBadgeProps = {
  make: string;
  size?: "sm" | "md" | "lg";
};

// Stylized text badges only — no third-party logo assets. Brand names are
// shown as plain text/initials for identification purposes; RentyCar is not
// affiliated with any of these companies. Shapes and colors are generated
// deterministically from the brand name so the same make always renders the
// same way, without reproducing any real manufacturer emblem.
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
  "from-slate-500 to-slate-800",
  "from-orange-500 to-rose-700",
];

type Shape = "circle" | "squircle" | "shield" | "hex";

const shapeClipPaths: Record<Shape, string> = {
  circle: "none",
  squircle: "none",
  shield: "polygon(50% 0%, 100% 18%, 100% 62%, 50% 100%, 0% 62%, 0% 18%)",
  hex: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
};

const shapeRadius: Record<Shape, string> = {
  circle: "rounded-full",
  squircle: "rounded-xl",
  shield: "",
  hex: "",
};

const shapes: Shape[] = ["circle", "squircle", "shield", "hex"];

const sizeClasses: Record<NonNullable<CarMakeBadgeProps["size"]>, string> = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-10 w-10 text-xs",
  lg: "h-14 w-14 text-base",
};

const iconSizeClasses: Record<NonNullable<CarMakeBadgeProps["size"]>, string> = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-6 w-6",
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
  const hash = hashString(make);
  const palette = palettes[hash % palettes.length];
  const shape = shapes[Math.floor(hash / palettes.length) % shapes.length];
  const initials = getInitials(make);

  return (
    <span
      role="img"
      aria-label={make}
      title={make}
      style={{ clipPath: shapeClipPaths[shape] }}
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br ${palette} ${shapeRadius[shape]} ${sizeClasses[size]} font-bold uppercase tracking-tight text-white shadow-sm ring-1 ring-white/40`}
    >
      <Car
        className={`absolute opacity-25 ${iconSizeClasses[size]}`}
        style={{ top: "8%", right: "6%" }}
        aria-hidden="true"
      />
      <span className="relative z-10 drop-shadow-sm">{initials}</span>
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-white/15"
        aria-hidden="true"
      />
    </span>
  );
}
