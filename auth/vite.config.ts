import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Builds into ../login so GitHub Pages serves it at /kepler-finance/login/
export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  build: { outDir: "../login", emptyOutDir: true },
});
