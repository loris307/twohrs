import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("AdminDeleteButton", () => {
  it("uses the reviewed lower-case admin moderation toast copy", () => {
    const source = readFileSync(
      new URL("./admin-delete-button.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("account von @${username} gelöscht");
    expect(source).toContain("post von @${username} gelöscht, kein strike für admins");
    expect(source).toContain("strike ${strikes}/3 für @${username}: warnung wird angezeigt");
    expect(source).toContain("strike ${strikes}/3 für @${username}: post gelöscht");
  });
});
