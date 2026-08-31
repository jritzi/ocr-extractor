import { describe, expect, it } from "vitest";
import { describeReason } from "./result-reason";

describe("result-reason.ts", () => {
  describe("describeReason", () => {
    it("returns the translated reason text", () => {
      expect(describeReason("passwordProtectedPdf")).toBe(
        "password-protected PDF",
      );
      expect(describeReason("noTextFound")).toBe("no text found");
    });
  });
});
