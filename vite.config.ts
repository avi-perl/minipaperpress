import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// MiniPaperPress is a fully client-side SPA (state lives in localStorage),
// so a plain Vite + React setup is all we need.
export default defineConfig({
  plugins: [react()],
});
