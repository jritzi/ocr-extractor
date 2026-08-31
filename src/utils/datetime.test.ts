import { describe, expect, it } from "vitest";
import { setLanguage } from "../i18n";
import { formatDateTime, formatDuration } from "./datetime";

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

  describe("formatDateTime", () => {
    const timestamp = Date.parse("2026-03-04T15:30:00Z");

    it("formats a timestamp as a date and a time", () => {
      expect(formatDateTime(timestamp)).toBe("Mar 4, 2026, 3:30 PM");
    });

    it("localizes the date and time", async () => {
      await setLanguage("zh");
      expect(formatDateTime(timestamp)).toBe("2026年3月4日 15:30");
    });
  });
});
