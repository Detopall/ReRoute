import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	base: "/reroute/",
	plugins: [react()],
	optimizeDeps: {
		exclude: ["maplibre-gl"],
	},
	resolve: {
		alias: {
			"@": `${import.meta.dirname}/src`,
		},
	},
});
