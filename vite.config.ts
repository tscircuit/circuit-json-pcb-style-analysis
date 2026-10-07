import { defineConfig } from "vite"
import { fileURLToPath } from "node:url"
export default defineConfig({
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      lib: fileURLToPath(new URL("./lib", import.meta.url)),
      tests: fileURLToPath(new URL("./tests", import.meta.url)),
    },
  },
})
