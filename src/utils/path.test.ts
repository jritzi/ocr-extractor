import { describe, expect, it } from "vitest";
import { basename, noteName, parentFolder, withoutNoteExtension } from "./path";

describe("path.ts", () => {
  describe("basename", () => {
    it("returns the last segment of a path (with extension)", () => {
      expect(basename("Attachments/Scans/receipt.pdf")).toBe("receipt.pdf");
    });

    it("returns the filename for a file at the vault root", () => {
      expect(basename("receipt.pdf")).toBe("receipt.pdf");
    });
  });

  describe("withoutNoteExtension", () => {
    it("removes the extension from a note path", () => {
      expect(withoutNoteExtension("Projects/v1.2/Meeting notes.md")).toBe(
        "Projects/v1.2/Meeting notes",
      );
    });

    it("throws for a path that isn't a note", () => {
      expect(() => withoutNoteExtension("Attachments/receipt.pdf")).toThrow();
    });
  });

  describe("noteName", () => {
    it("returns the last segment of a path without an .md extension", () => {
      expect(noteName("Projects/Meeting notes.md")).toBe("Meeting notes");
    });
  });

  describe("parentFolder", () => {
    it("returns the containing folder", () => {
      expect(parentFolder("Attachments/Scans/receipt.pdf")).toBe(
        "Attachments/Scans",
      );
    });

    it("returns an empty string at the vault root", () => {
      expect(parentFolder("receipt.pdf")).toBe("");
    });
  });
});
