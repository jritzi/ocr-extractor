import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import obsidianmd from "eslint-plugin-obsidianmd";
import reactHooks from "eslint-plugin-react-hooks";
import { includeIgnoreFile } from "@eslint/config-helpers";
import path from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";

const configDir = path.dirname(fileURLToPath(import.meta.url));

// Confirm file wasn't renamed
const WRITE_FILE = "src/editing/write.ts";
if (!existsSync(path.resolve(configDir, WRITE_FILE))) {
  throw new Error(`${WRITE_FILE} no longer exists`);
}

export default defineConfig([
  includeIgnoreFile(path.resolve(configDir, ".gitignore")),
  globalIgnores([
    "**/*.json",
    "esbuild.config.mjs",
    "version-bump.mjs",
    "e2e-tests/mock-ocr/*.js",
  ]),

  // Base rules
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
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
    files: ["src/**/*.{ts,tsx}"],
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

  // React rules
  {
    files: ["src/**/*.tsx"],
    extends: [reactHooks.configs["recommended-latest"]],
    rules: {
      "react-hooks/exhaustive-deps": "error",
    },
  },

  // applyViaEditor async protection
  {
    files: [WRITE_FILE],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "FunctionDeclaration[id.name='applyViaEditor'][async=true]",
          message:
            "applyViaEditor must stay synchronous to ensure atomic edits",
        },
      ],
    },
  },

  // Prettier overrides, must be last
  eslintConfigPrettier,
]);
