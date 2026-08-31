import { beforeEach } from "vitest";
import { setLanguage } from "./src/i18n";

beforeEach(async () => {
  await setLanguage("en");
});
