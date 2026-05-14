import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import obsidianmd from "eslint-plugin-obsidianmd";
import { includeIgnoreFile } from "@eslint/compat";
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
    "e2e/mock-ocr/*.js",
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
      // Remove once https://github.com/obsidianmd/eslint-plugin/pull/147 is in a release
      "import/no-nodejs-modules": "off",
      "obsidianmd/no-nodejs-modules": "error",

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
