import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    // Lógica em node; componentes React com "// @vitest-environment jsdom" no topo do ficheiro.
    include: ["lib/**/*.test.ts", "app/**/*.test.jsx"],
  },
});
