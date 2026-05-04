import { availableParallelism } from "os";
import { defineConfig } from "@playwright/test";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  globalSetup: "./e2e/global-setup.ts",

  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  outputDir: "./e2e/test-results",

  /* Fail the build on CI if you accidentally committed a test marked test.only */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Each test uses a unique --user-data-dir, so workers run fully independently */
  fullyParallel: true,
  workers: process.env.CI ? availableParallelism() : 5,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  /* 'html' generates a browsable report; 'list' is simpler for local dev */
  reporter: process.env.CI
    ? [["html", { outputFolder: "./e2e/playwright-report" }]]
    : "list",

  /* Shared settings for all tests. See https://playwright.dev/docs/api/class-testoptions */
  use: {
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },
});
