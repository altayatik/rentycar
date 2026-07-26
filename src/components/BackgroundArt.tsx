/**
 * Backdrop: a warm wash scattered with faded passport cancellations, as
 * though the page itself were a page of the stamp book.
 *
 * Replaces an earlier literal apron drawing (skyline, taxiway, compass
 * rose) that read as clip-art. Stamps tie the background to the product's
 * own iconography instead.
 *
 * TWO THINGS THAT MUST NOT CHANGE:
 *   1. `body` stays transparent. This is a fixed layer at z-index -10, and
 *      per CSS painting order an opaque body background paints over it —
 *      that bug hid this entire component. Base colour lives on :root.
 *   2. No SVG filters, no blend modes, no scroll listeners. All three
 *      previously froze Chrome's renderer outright.
 */

interface ScatteredStamp {
  code: string;
  x: number;
  y: number;
  size: number;
  rotate: number;
  tone: string;
}

// Hand-placed rather than random so the composition stays balanced and
// stamps never collide with each other.
const STAMPS: ScatteredStamp[] = [
  { code: "LAX", x: 120, y: 150, size: 84, rotate: -9, tone: "var(--safety)" },
  { code: "JFK", x: 420, y: 92, size: 62, rotate: 7, tone: "var(--runway)" },
  { code: "SEA", x: 760, y: 178, size: 72, rotate: -4, tone: "var(--go)" },
  { code: "ORD", x: 1105, y: 96, size: 58, rotate: 11, tone: "var(--sodium)" },
  { code: "DEN", x: 1330, y: 210, size: 78, rotate: -6, tone: "var(--runway)" },
  { code: "YYZ", x: 250, y: 430, size: 68, rotate: 5, tone: "var(--sodium)" },
  { code: "MIA", x: 620, y: 380, size: 56, rotate: -12, tone: "var(--safety)" },
  { code: "SFO", x: 960, y: 452, size: 80, rotate: 3, tone: "var(--go)" },
  { code: "BOS", x: 1290, y: 520, size: 60, rotate: -8, tone: "var(--safety)" },
  { code: "HNL", x: 90, y: 660, size: 74, rotate: 6, tone: "var(--go)" },
  { code: "AUS", x: 470, y: 700, size: 58, rotate: -5, tone: "var(--runway)" },
  { code: "PHX", x: 830, y: 640, size: 66, rotate: 9, tone: "var(--sodium)" },
  { code: "YVR", x: 1180, y: 738, size: 70, rotate: -7, tone: "var(--runway)" },
  { code: "LAS", x: 300, y: 890, size: 62, rotate: 4, tone: "var(--sodium)" },
  { code: "ATL", x: 700, y: 940, size: 76, rotate: -10, tone: "var(--safety)" },
  { code: "BZN", x: 1080, y: 980, size: 54, rotate: 8, tone: "var(--go)" },
];

export function BackgroundArt() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Warm base wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(176deg, #f2ede3 0%, #ece7dd 42%, #e5dfd3 76%, #ded7c9 100%)",
        }}
      />

      {/* Colour fields — warm high right, cool low left */}
      <div
        className="absolute"
        style={{
          top: "-22rem",
          right: "-14rem",
          width: "54rem",
          height: "54rem",
          background:
            "radial-gradient(circle, rgba(240,169,43,0.30) 0%, rgba(240,169,43,0.10) 38%, transparent 70%)",
        }}
      />
      <div
        className="absolute"
        style={{
          bottom: "-18rem",
          left: "-20rem",
          width: "48rem",
          height: "48rem",
          background:
            "radial-gradient(circle, rgba(58,110,165,0.16) 0%, rgba(58,110,165,0.05) 44%, transparent 74%)",
        }}
      />

      {/* Scattered cancellations */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 1050"
        preserveAspectRatio="xMidYMid slice"
      >
        {STAMPS.map((stamp) => (
          <Stamp key={stamp.code} stamp={stamp} />
        ))}
      </svg>

      {/* Vignette to settle the edges */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(125% 90% at 50% 30%, transparent 48%, rgba(60,52,38,0.09) 100%)",
        }}
      />
    </div>
  );
}

function Stamp({ stamp }: { stamp: ScatteredStamp }) {
  const { code, x, y, size, rotate, tone } = stamp;
  const outer = size / 2;

  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`} opacity="0.13" style={{ color: tone }}>
      <circle r={outer} fill="none" stroke="currentColor" strokeWidth={size * 0.045} />
      <circle
        r={outer * 0.82}
        fill="none"
        stroke="currentColor"
        strokeWidth={size * 0.018}
        strokeDasharray={`${size * 0.05} ${size * 0.05}`}
      />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
        style={{
          fontFamily: '"Barlow Condensed", Barlow, sans-serif',
          fontWeight: 800,
          fontSize: size * 0.34,
          letterSpacing: "0.02em",
        }}
      >
        {code}
      </text>
      {/* tick marks at the cardinal points, as on a real canceller */}
      {[0, 90, 180, 270].map((angle) => (
        <line
          key={angle}
          x1={0}
          y1={-outer * 0.9}
          x2={0}
          y2={-outer * 0.72}
          stroke="currentColor"
          strokeWidth={size * 0.03}
          strokeLinecap="round"
          transform={`rotate(${angle})`}
        />
      ))}
    </g>
  );
}
