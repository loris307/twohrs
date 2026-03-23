import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

describe("public/sw.js", () => {
  it("registers install and activate handlers without a no-op fetch handler", async () => {
    const script = await readFile(path.resolve(process.cwd(), "public/sw.js"), "utf8");
    const eventTypes: string[] = [];

    vm.runInNewContext(script, {
      caches: {
        keys: () => Promise.resolve([]),
      },
      self: {
        addEventListener(type: string) {
          eventTypes.push(type);
        },
      },
    });

    expect(eventTypes).toContain("install");
    expect(eventTypes).toContain("activate");
    expect(eventTypes).not.toContain("fetch");
  });
});
