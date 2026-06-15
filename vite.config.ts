import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  base: "./",
  // viteSingleFile inlines JS + CSS into a single self-contained index.html. This is
  // required for the "double-click index.html" (file://) delivery: browsers block
  // EXTERNAL `<script type="module" src>` over file:// (CORS), but INLINE module scripts
  // are allowed, so a single inlined HTML opens correctly with no server.
  plugins: [react(), viteSingleFile()],
  build: { outDir: "dist", assetsInlineLimit: 100000000 },
});
