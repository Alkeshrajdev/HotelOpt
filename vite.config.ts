import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    // Pages are route-split in App.tsx; vendors get stable chunks so they cache
    // across deploys instead of re-downloading with every app change.
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react":    ["react", "react-dom", "react-router-dom"],
          "vendor-charts":   ["recharts"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-icons":    ["lucide-react"],
        },
      },
    },
  },
});
