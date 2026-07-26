/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  // These classes are assembled at runtime (`badge-${tone}`, `btn-${variant}`),
  // so the content scanner never sees the literal name and would strip the
  // rules out of @layer components. Keep in sync with the BadgeTone and
  // ButtonVariant unions in src/components/ui/index.tsx.
  safelist: [
    "badge-sky",
    "badge-runway",
    "badge-mint",
    "badge-gold",
    "badge-terra",
    "badge-lavender",
    "badge-danger",
    "badge-neutral",
    "btn-primary",
    "btn-accent",
    "btn-secondary",
    "btn-ghost",
    "btn-danger",
  ],
  theme: {
    extend: {
      colors: {
        board: {
          DEFAULT: "var(--board)",
          2: "var(--board-2)",
          3: "var(--board-3)",
          ink: "var(--board-ink)",
        },
        concrete: {
          DEFAULT: "var(--concrete)",
          2: "var(--concrete-2)",
          3: "var(--concrete-3)",
        },
        paper: "var(--paper)",
        ink: {
          DEFAULT: "var(--ink)",
          2: "var(--ink-2)",
          3: "var(--ink-3)",
          4: "var(--ink-4)",
        },
        sodium: {
          DEFAULT: "var(--sodium)",
          2: "var(--sodium-2)",
          tint: "var(--sodium-tint)",
        },
        safety: {
          DEFAULT: "var(--safety)",
          tint: "var(--safety-tint)",
        },
        runway: {
          DEFAULT: "var(--runway)",
          tint: "var(--runway-tint)",
        },
        go: {
          DEFAULT: "var(--go)",
          tint: "var(--go-tint)",
        },
        stop: {
          DEFAULT: "var(--stop)",
          tint: "var(--stop-tint)",
        },
        asphalt: "var(--asphalt)",
        line: {
          DEFAULT: "var(--line)",
          2: "var(--line-2)",
          3: "var(--line-3)",
        },
      },
      fontFamily: {
        sans: ["Barlow", "ui-sans-serif", "system-ui", "sans-serif"],
        sign: ["Barlow Condensed", "Barlow", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xs: "var(--r-xs)",
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
      },
      boxShadow: {
        1: "var(--sh-1)",
        2: "var(--sh-2)",
        3: "var(--sh-3)",
        board: "var(--sh-board)",
      },
    },
  },
  plugins: [],
};
