import { describe, expect, it } from "vitest";
import {
  advanceVisualUploadProgress,
  getVisualUploadWord,
  mapActualUploadProgressToDisplay,
} from "./create-post-progress";

describe("mapActualUploadProgressToDisplay", () => {
  it("reserves headroom for post-upload processing", () => {
    expect(mapActualUploadProgressToDisplay(0)).toBe(0);
    expect(mapActualUploadProgressToDisplay(50)).toBe(39);
    expect(mapActualUploadProgressToDisplay(100)).toBe(78);
  });
});

describe("getVisualUploadWord", () => {
  it("keeps showing 'hochladen' until the transport upload is done", () => {
    expect(getVisualUploadWord(78, false, false)).toBe("hochladen");
  });

  it("switches through the post-upload words in order", () => {
    expect(getVisualUploadWord(78, true, false)).toBe("angucken");
    expect(getVisualUploadWord(90, true, false)).toBe("checken");
    expect(getVisualUploadWord(97, true, true)).toBe("lachen");
  });
});

describe("advanceVisualUploadProgress", () => {
  it("moves through the cosmetic post-upload ranges and caps just below 100", () => {
    expect(advanceVisualUploadProgress(78)).toBe(80);
    expect(advanceVisualUploadProgress(89)).toBe(90);
    expect(advanceVisualUploadProgress(90)).toBe(91);
    expect(advanceVisualUploadProgress(96)).toBe(97);
    expect(advanceVisualUploadProgress(97)).toBe(97);
    expect(advanceVisualUploadProgress(98)).toBe(98);
    expect(advanceVisualUploadProgress(99)).toBe(99);
  });
});
