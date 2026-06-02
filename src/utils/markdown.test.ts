import { describe, expect, it } from "vitest";
import { stripCodeFence } from "./markdown";

describe("markdown.ts", () => {
  describe("stripCodeFence", () => {
    it("strips a fence with a markdown tag wrapping the whole response", () => {
      const input = "```markdown\n# Title\n\nBody text\n```";
      expect(stripCodeFence(input)).toBe("# Title\n\nBody text");
    });

    it("strips a fence with a text tag wrapping the whole response", () => {
      const input = "```text\nHello\nWorld\n```";
      expect(stripCodeFence(input)).toBe("Hello\nWorld");
    });

    it("strips a fence regardless of the tag casing", () => {
      const input = "```Markdown\n# Title\n```";
      expect(stripCodeFence(input)).toBe("# Title");
    });

    it("strips a bare fence wrapping the whole response", () => {
      const input = "```\n# Title\n\nBody text\n```";
      expect(stripCodeFence(input)).toBe("# Title\n\nBody text");
    });

    it("ignores surrounding whitespace around the fence", () => {
      const input = "\n\n```md\nHello\n```\n\n";
      expect(stripCodeFence(input)).toBe("Hello");
    });

    it("leaves a non-markdown/text fence intact even when it wraps the whole response", () => {
      const input = "```python\ndef foo():\n    return 1\n```";
      expect(stripCodeFence(input)).toBe(input);
    });

    it("leaves an inner code block intact when text follows it", () => {
      const input = "```js\nconst x = 1;\n```\n\n# Heading";
      expect(stripCodeFence(input)).toBe(input);
    });

    it("does not strip when a code block is embedded in the document", () => {
      const input = "# Title\n\n```js\ncode\n```\n\nMore text";
      expect(stripCodeFence(input)).toBe(input);
    });

    it("returns non-fenced text unchanged", () => {
      const input = "# Title\n\nJust some markdown.";
      expect(stripCodeFence(input)).toBe(input);
    });
  });
});
