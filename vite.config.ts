import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/rentycar/",
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
