import { describe, expect, it } from "vitest";
import { toDataUrl, uint8ArrayToBase64 } from "./encoding";

describe("encoding.ts", () => {
  describe("uint8ArrayToBase64", () => {
    it("encodes bytes to base64 (even outside ASCII range)", () => {
      const bytes = new Uint8Array([0, 1, 127, 128, 254, 255]);

      expect(uint8ArrayToBase64(bytes)).toBe("AAF/gP7/");
    });

    it("encodes large input without error", () => {
      const bytes = new Uint8Array(500_000).map((_, index) => index % 256);

      expect(uint8ArrayToBase64(bytes)).toBe(
        Buffer.from(bytes).toString("base64"),
      );
    });
  });

  describe("toDataUrl", () => {
    it("builds a data URL for the given MIME type", () => {
      const bytes = new TextEncoder().encode("Hello");

      expect(toDataUrl(bytes, "image/png")).toBe(
        "data:image/png;base64,SGVsbG8=",
      );
    });
  });
});
