import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import obsidianmd from "eslint-plugin-obsidianmd";
import { includeIgnoreFile } from "@eslint/compat";
import path from "path";

// @ts-expect-error — plugin lacks type declarations
import noUnsanitized from "eslint-plugin-no-unsanitized";

export default defineConfig([
  includeIgnoreFile(path.resolve(import.meta.dirname, ".gitignore")),
  globalIgnores([
    "**/*.json",
    "esbuild.config.mjs",
    "version-bump.mjs",
    "e2e/mock-ocr/*.js",
  ]),

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- plugin lacks types
  noUnsanitized.configs.recommended,
  eslintConfigPrettier,

  ...obsidianmd.configs.recommendedWithLocalesEn,

  {
    files: ["**/*.{ts,mts,cts}"],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    plugins: { obsidianmd },
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      "@typescript-eslint/member-ordering": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      "obsidianmd/ui/sentence-case": [
        "error",
        {
          acronyms: ["OCR", "API", "PDF", "PNG"],
          brands: ["OCR Extractor"],
          ignoreWords: ["PDFs"],
        },
      ],
    },
  },

  // Disable Obsidian-specific rules outside src/
  {
    files: ["**/*.{ts,mts,cts}"],
    ignores: ["src/**"],
    rules: {
      "import/no-nodejs-modules": "off",
      "no-console": "off",
      "no-restricted-globals": "off",
      "obsidianmd/hardcoded-config-path": "off",
      "obsidianmd/prefer-active-doc": "off",
      "obsidianmd/prefer-active-window-timers": "off",
      "obsidianmd/rule-custom-message": "off",
      "obsidianmd/ui/sentence-case": "off",
    },
  },
]);
