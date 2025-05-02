import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  build: {
    minify: true,
    rollupOptions: {
      external: ["node:crypto"],
      output: {
        manualChunks: (id) => {
          if (id.includes("/node_modules/@azure")) return "azure";
          if (
            id.includes("/node_modules/react") ||
            id.includes("/node_modules/scheduler")
          ) {
            return "react";
          }
        },
      },
    },
  },
  plugins: [react(), tailwindcss()],
});
