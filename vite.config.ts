import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import fs from "node:fs";
import path from "node:path";

function syncMaplibreWorkerFiles() {
  const maplibreDist = path.resolve(import.meta.dirname, "node_modules/maplibre-gl/dist");
  const publicDir = path.resolve(import.meta.dirname, "public");
  const publicAssetsDir = path.resolve(import.meta.dirname, "public/assets");

  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  if (!fs.existsSync(publicAssetsDir)) fs.mkdirSync(publicAssetsDir, { recursive: true });

  const files = [
    "maplibre-gl-shared.mjs",
    "maplibre-gl-worker.mjs",
    "maplibre-gl-shared-dev.mjs",
    "maplibre-gl-worker-dev.mjs",
  ];

  for (const file of files) {
    const srcPath = path.join(maplibreDist, file);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, path.join(publicDir, file));
      fs.copyFileSync(srcPath, path.join(publicAssetsDir, file));
    }
  }
}

// Sync files immediately on config load
syncMaplibreWorkerFiles();

function maplibreWorkerPlugin(): Plugin {
  return {
    name: "maplibre-worker-copy",
    buildStart() {
      syncMaplibreWorkerFiles();
    },
    generateBundle() {
      const maplibreDist = path.resolve(import.meta.dirname, "node_modules/maplibre-gl/dist");
      const files = [
        "maplibre-gl-shared.mjs",
        "maplibre-gl-worker.mjs",
        "maplibre-gl-shared-dev.mjs",
        "maplibre-gl-worker-dev.mjs",
      ];
      for (const file of files) {
        const filePath = path.join(maplibreDist, file);
        if (fs.existsSync(filePath)) {
          this.emitFile({
            type: "asset",
            fileName: `assets/${file}`,
            source: fs.readFileSync(filePath),
          });
          this.emitFile({
            type: "asset",
            fileName: file,
            source: fs.readFileSync(filePath),
          });
        }
      }
    },
  };
}

export default defineConfig(({ command }) => ({
  base: command === "build" ? "./" : "/",
  plugins: [react(), maplibreWorkerPlugin()],
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
