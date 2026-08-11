import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"

// `--mode single` produces dist/index.html as ONE self-contained file
// (JS, CSS and assets inlined). That file is the shareable preview —
// the React equivalent of marketing/build-preview.py's preview.html.
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    ...(mode === "single" ? [viteSingleFile()] : []),
  ],
  build: {
    assetsInlineLimit: mode === "single" ? 100_000_000 : 4096,
    chunkSizeWarningLimit: 4000,
  },
}))
