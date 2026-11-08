import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    environment: "edge-runtime",
    include: [
      "convex/**/*.test.ts",
      "components/profile/**/*.test.tsx",
      "components/map-editor/**/*.test.tsx",
      "components/workbench/**/*.test.tsx",
      "components/home/**/*.test.tsx",
      "components/map-page/**/*.test.tsx",
    ],
  },
});
