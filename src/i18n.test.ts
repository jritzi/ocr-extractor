import { describe, expect, it } from "vitest";
import { t } from "./i18n";

describe("i18n.ts", () => {
  it("localizes interpolated numbers", () => {
    expect(t("counts.extracted", { count: 1234 })).toBe("1,234 extracted");
  });
});
