import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Több sorra törő if/else törzs mindig kapcsos zárójelbe kerül (a formázás után is egyértelmű legyen).
      curly: ["error", "multi-line", "consistent"],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // A Convex CLI generálja.
    "convex/_generated/**",
  ]),
]);

export default eslintConfig;
