import { defineConfig } from "vite"
import { fileURLToPath } from "node:url"
export default defineConfig({
  // Avoid pathological Rollup tree-shaking of the solver/fixture graph.
  // This affects the debugger site; the analyzer browser bundle uses Bun.
  build: { rollupOptions: { treeshake: false } },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      lib: fileURLToPath(new URL("./lib", import.meta.url)),
      tests: fileURLToPath(new URL("./tests", import.meta.url)),
    },
  },
})
