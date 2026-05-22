import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Flat config (ESLint 9). Replaces the legacy .eslintrc.json — `next lint`
// was removed in Next.js 16, so linting runs through the ESLint CLI directly.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Ported from the previous .eslintrc.json: keep dependency-array
      // problems as warnings rather than errors.
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Not app source — `next lint` never covered these. scripts/* are Node
    // CommonJS utilities; public/* are static assets.
    "scripts/**",
    "public/**",
  ]),
]);

export default eslintConfig;
