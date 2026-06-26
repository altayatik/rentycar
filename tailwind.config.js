/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#15202b",
        runway: "#4338ca",
        asphalt: "#334155",
        night: {
          900: "#070a12",
          800: "#0a0f1a",
          700: "#0e1422",
          600: "#121a2b",
        },
      },
      fontFamily: {
        display: ["Outfit", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        panel: "0 8px 30px rgba(15, 23, 42, 0.08)",
        glass: "0 14px 40px rgba(0, 0, 0, 0.35)",
      },
      backgroundImage: {
        "night-gradient":
          "radial-gradient(circle at 15% 0%, rgba(20,184,166,0.10), transparent 40%), linear-gradient(160deg, #0a0f1a 0%, #0e1622 45%, #070a12 100%)",
      },
    },
  },
  plugins: [],
};
