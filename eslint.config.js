import eslint from "@eslint/js";
import vitest from "@vitest/eslint-plugin";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import testingLibrary from "eslint-plugin-testing-library";
import globals from "globals";
import tseslint from "typescript-eslint";

const testFiles = ["**/*.{test,spec}.{ts,tsx}", "**/tests/**/*.{ts,tsx}"];

export default tseslint.config(
  {
    ignores: [
      "coverage/",
      "dist/",
      "node_modules/",
      "playwright-report/",
      "test-results/",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ["api/**/*.ts", "drizzle/**/*.ts", "drizzle.config.ts"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  reactHooks.configs.flat["recommended-latest"],
  reactRefresh.configs.vite,
  {
    ...testingLibrary.configs["flat/react"],
    files: testFiles,
  },
  {
    ...vitest.configs.recommended,
    files: testFiles,
  },
  prettier,
);
