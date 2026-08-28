import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "./" : "/",
  plugins: [react()],
  optimizeDeps: {
    exclude: ["maplibre-gl"],
  },
  server: {
    allowedHosts: [
      'lively-reassured-salamander.loca.lt'
    ],
  },
  resolve: {
    alias: {
      "@": `${import.meta.dirname}/src`,
    },
  },
}));
