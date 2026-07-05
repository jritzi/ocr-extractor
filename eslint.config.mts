import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import obsidianmd from "eslint-plugin-obsidianmd";
import { includeIgnoreFile } from "@eslint/config-helpers";
import path from "path";
import { fileURLToPath } from "url";

export default defineConfig([
  includeIgnoreFile(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".gitignore"),
  ),
  globalIgnores([
    "**/*.json",
    "esbuild.config.mjs",
    "version-bump.mjs",
    "e2e-tests/mock-ocr/*.js",
  ]),

  {
    files: ["**/*.{ts,mts,cts}"],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
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
    },
  },

  // Obsidian-specific rules
  {
    files: ["src/**/*.ts"],
    ignores: ["src/**/*.test.ts"],
    extends: obsidianmd.configs.recommendedWithLocalesEn,
    rules: {
      // Obsidian plugins run as CommonJS and must load Node builtins via
      // require() at runtime, so this rule does not apply. Remove this once
      // restored upstream.
      "@typescript-eslint/no-require-imports": "off",

      // Disable until settings migrated to declarative API
      "obsidianmd/settings-tab/prefer-setting-definitions": "off",

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

  eslintConfigPrettier,
]);
