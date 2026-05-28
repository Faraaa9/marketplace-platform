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
      // React Compiler advisory rules (new in eslint-config-next 16). Kept as
      // warnings — same stance as exhaustive-deps above — because they fire
      // false positives that aren't worth risky refactors here:
      //  - `purity`: flags `Date.now()` in Server Components, which render once
      //    per request, so the call is effectively pure for that render.
      //  - `set-state-in-effect`: flags legitimate "initialize from
      //    sessionStorage / session" effects in the request-creation funnel.
      // Surfaced as warnings so they stay visible without blocking.
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
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
