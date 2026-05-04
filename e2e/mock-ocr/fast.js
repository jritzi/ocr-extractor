// Mock OCR command that returns fixed text (controlled by the MOCK_OCR_OUTPUT
// environment variable) immediately
//
// Configure as: node fast.js {input} {output}

require("fs").writeFileSync(process.argv[3], process.env.MOCK_OCR_OUTPUT ?? "");
