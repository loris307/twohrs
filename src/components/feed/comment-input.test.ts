import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("CommentInput", () => {
  it("defines accessible labels for icon-only controls", () => {
    const source = readFileSync(
      new URL("./comment-input.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain('aria-label="antwort abbrechen"');
    expect(source).toContain('aria-label="bild auswählen"');
    expect(source).toContain('aria-label="bild entfernen"');
  });
});
