import { describe, expect, it } from "vitest";
import { isOcrError, ocrError } from "./errors.js";

describe("errors.ts", () => {
  describe("isOcrError", () => {
    it("returns true for an error built by ocrError", () => {
      expect(isOcrError(ocrError("unsupported-file"))).toBe(true);
    });

    it("returns true for a duck-typed error from another bundle", () => {
      const fromOtherBundle = Object.assign(new Error(), {
        name: "OcrError",
        code: "extraction-failed",
      });
      expect(isOcrError(fromOtherBundle)).toBe(true);
    });

    it("returns false for anything other than a real OcrError", () => {
      expect(isOcrError(new Error("error"))).toBe(false);
      expect(isOcrError(Object.assign(new Error(), { name: "OcrError" }))).toBe(
        false,
      );
      expect(isOcrError({ name: "OcrError", code: "extraction-failed" })).toBe(
        false,
      );
    });
  });

  describe("ocrError", () => {
    it("returns an error with the OcrError name and a code", () => {
      const error = ocrError("unsupported-file");
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("OcrError");
      expect(error.code).toBe("unsupported-file");
    });

    it("includes a provided message and cause", () => {
      const cause = new Error();
      const error = ocrError("extraction-failed", "request failed", { cause });
      expect(error.message).toBe("request failed");
      expect(error.cause).toBe(cause);
    });
  });
});
