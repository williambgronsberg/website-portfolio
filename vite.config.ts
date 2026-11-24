import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "src"),
    },
  },
  // Custom domain (williambgronsberg.no) is served from the root.
  base: "/",
  build: {
    outDir: "dist",
    // Firebase is most of the bundle; it is cached after the first visit.
    chunkSizeWarningLimit: 800,
  },
});
