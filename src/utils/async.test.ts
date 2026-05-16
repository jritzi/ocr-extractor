import { describe, expect, it } from "vitest";
import { raceAbort } from "./async";

describe("async utils", () => {
  describe("raceAbort", () => {
    it("resolves with the value when the promise settles first", async () => {
      const controller = new AbortController();
      expect(await raceAbort(Promise.resolve("value"), controller.signal)).toBe(
        "value",
      );
    });

    it("propagates rejection from the promise", async () => {
      const controller = new AbortController();
      const error = new Error("failed");

      await expect(
        raceAbort(Promise.reject(error), controller.signal),
      ).rejects.toThrow(error);
    });

    it("returns null when the signal is aborted while the promise is pending", async () => {
      const controller = new AbortController();
      const result = raceAbort(new Promise(() => {}), controller.signal);
      controller.abort();
      expect(await result).toBeNull();
    });

    it("returns null when the signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();
      expect(
        await raceAbort(new Promise(() => {}), controller.signal),
      ).toBeNull();
    });
  });
});
