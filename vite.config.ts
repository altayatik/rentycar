import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative asset URLs let the same Pages build work at both
  // rentycar.cloud/ and altayatik.com/rentycar/.
  base: "./",
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        app: "index.html",
        zero: "0.rentycar/index.html",
      },
    },
  },
});
