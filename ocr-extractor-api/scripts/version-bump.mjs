import process from "node:process";
import { readFileSync, writeFileSync } from "fs";

// Bump version constant in `src/index.ts` when running `pnpm version`

const targetVersion = process.env.npm_package_version;
const file = "src/index.ts";
const source = readFileSync(file, "utf8");
const pattern = /(OCR_EXTRACTOR_API_VERSION = ")[^"]*(")/;

if (!pattern.test(source)) {
  throw new Error(`No OCR_EXTRACTOR_API_VERSION found in ${file}`);
}

writeFileSync(file, source.replace(pattern, `$1${targetVersion}$2`));
