import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  base: "./",
  // viteSingleFile inlines the JS + CSS into index.html. This is required for the "double-click
  // index.html" (file://) delivery: browsers block EXTERNAL `<script type="module" src>` over
  // file:// (CORS), but INLINE module scripts are allowed. Images are NOT blocked over file://, so
  // we intentionally do NOT inline them — the plugin's `useRecommendedBuildConfig` would force
  // `assetsInlineLimit = () => true` (base64 everything), bloating index.html by ~400KB with the 171
  // object icons. We disable it and reproduce just the JS/CSS-inlining prerequisites, with
  // `assetsInlineLimit: 0` so the icons emit as external hashed files under dist/assets/ and load
  // by relative path (works over file:// alongside index.html).
  plugins: [react(), viteSingleFile({ useRecommendedBuildConfig: false })],
  build: {
    cssCodeSplit: false,               // one CSS file for the plugin to inline
    chunkSizeWarningLimit: 100000000,
    assetsInlineLimit: 0,              // keep image assets external (do not base64-inline)
    // Emit assets to the dist ROOT (next to index.html), not dist/assets/. Vite references assets as
    // `new URL("<file>.webp", import.meta.url)`; with the JS inlined into index.html, import.meta.url
    // is the HTML's own file:// URL, so the icons must sit beside it to resolve. (This mirrors what
    // the plugin's useRecommendedBuildConfig does.)
    assetsDir: "",
    rollupOptions: { output: { inlineDynamicImports: true } }, // one JS chunk for the plugin to inline
  },
});
