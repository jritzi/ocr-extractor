// Mock OCR command that waits until the release file named by the
// MOCK_OCR_RELEASE_FILE environment variable exists, then returns fixed text
//
// Configure as: node gated.js {input} {output}

const fs = require("fs");

const releaseFile = process.env.MOCK_OCR_RELEASE_FILE;
if (!releaseFile) {
  console.error("MOCK_OCR_RELEASE_FILE is not set");
  process.exit(1);
}

const interval = setInterval(() => {
  if (fs.existsSync(releaseFile)) {
    clearInterval(interval);
    fs.writeFileSync(process.argv[3], process.env.MOCK_OCR_OUTPUT ?? "");
    process.exit(0);
  }
}, 50);
