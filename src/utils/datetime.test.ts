import { describe, expect, it } from "vitest";
import { setLanguage } from "../i18n";
import { formatDuration } from "./datetime";

describe("datetime.ts", () => {
  describe("formatDuration", () => {
    it("formats durations less than an hour", () => {
      expect(formatDuration(400)).toBe("<1s");
      expect(formatDuration(8000)).toBe("8s");
      expect(formatDuration(120000)).toBe("2m");
      expect(formatDuration(123000)).toBe("2m 3s");
    });

    it("formats durations over an hour (dropping seconds)", () => {
      expect(formatDuration(3600000)).toBe("1h");
      expect(formatDuration(3840000)).toBe("1h 4m");
      expect(formatDuration(3849000)).toBe("1h 4m");
      expect(formatDuration(7200000)).toBe("2h");
    });

    it("localizes units", async () => {
      await setLanguage("zh");
      expect(formatDuration(123000)).toBe("2分钟 3秒");
    });
  });
});
