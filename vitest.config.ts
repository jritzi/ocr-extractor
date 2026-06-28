import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "ocr-extractor-api/src/**/*.test.ts"],
  },
});
