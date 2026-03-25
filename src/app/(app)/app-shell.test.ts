import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("AppShell", () => {
  it("only shows the moderation warning for non-admin users", () => {
    const source = readFileSync(
      new URL("./app-shell.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("isAdmin?: boolean");
    expect(source).toContain("!isAdmin && moderationStrikes >= 2");
  });
});
