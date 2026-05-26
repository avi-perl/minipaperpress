import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// MiniPaperPress is a fully client-side SPA (state lives in localStorage),
// so a plain Vite + React setup is all we need.
export default defineConfig({
  // Served from https://<user>.github.io/minipaperpress/ on GitHub Pages.
  // The router reads import.meta.env.BASE_URL so dev (/) and Pages (/minipaperpress/)
  // both resolve correctly without further config.
  base: "/minipaperpress/",
  plugins: [react()],
});
