// Mock OCR command that waits until the release file named by the
// MOCK_OCR_RELEASE_FILE environment variable exists, then returns fixed text
//
// Configure as: node gated.mjs {input} {output}

import { existsSync, writeFileSync } from "fs";
import { isSupportedAttachment } from "./supported-attachments.mjs";

const releaseFile = process.env.MOCK_OCR_RELEASE_FILE;
if (!releaseFile) {
  console.error("MOCK_OCR_RELEASE_FILE is not set");
  process.exit(1);
}

const [inputPath, outputPath] = process.argv.slice(2);

if (!isSupportedAttachment(inputPath)) process.exit(0);

const interval = setInterval(() => {
  if (existsSync(releaseFile)) {
    clearInterval(interval);
    writeFileSync(outputPath, process.env.MOCK_OCR_OUTPUT ?? "");
    process.exit(0);
  }
}, 50);
