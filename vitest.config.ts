import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: { TZ: "UTC" },
    include: ["src/**/*.test.ts", "ocr-extractor-api/src/**/*.test.ts"],
    restoreMocks: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
