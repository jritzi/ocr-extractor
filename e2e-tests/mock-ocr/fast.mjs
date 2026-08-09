// Mock OCR command that returns fixed text (controlled by the MOCK_OCR_OUTPUT
// environment variable) immediately
//
// Configure as: node fast.mjs {input} {output}

import { writeFileSync } from "fs";
import { isSupportedAttachment } from "./supported-attachments.mjs";

const [inputPath, outputPath] = process.argv.slice(2);

if (isSupportedAttachment(inputPath)) {
  writeFileSync(outputPath, process.env.MOCK_OCR_OUTPUT ?? "");
}
