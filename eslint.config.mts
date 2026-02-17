import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import obsidianmd from "eslint-plugin-obsidianmd";
// @ts-expect-error — plugin lacks type declarations
import noUnsanitized from "eslint-plugin-no-unsanitized";

export default defineConfig([
  globalIgnores(["main.js", "version-bump.mjs", "**/*.json"]),

  {
    files: ["**/*.{ts,mts,cts}"],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.mts"],
        },
      },
    },
    rules: {
      "@typescript-eslint/member-ordering": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- plugin lacks types
  noUnsanitized.configs.recommended,
  eslintConfigPrettier,

  // @ts-expect-error — eslint-plugin-obsidianmd has incorrect typing
  ...obsidianmd.configs.recommendedWithLocalesEn,
  {
    plugins: { obsidianmd },
    rules: {
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
]);
