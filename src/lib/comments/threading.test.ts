import { describe, expect, it } from "vitest";
import {
  getVisualCommentDepth,
  mergeUniqueCommentsById,
  sortCommentsByBest,
} from "@/lib/comments/threading";

// Minimal-Fixtures fuer sortCommentsByBest
const a = { id: "a", upvote_count: 10, created_at: "2026-03-20T20:00:00Z" };
const b = { id: "b", upvote_count: 5, created_at: "2026-03-20T20:01:00Z" };
const c = { id: "c", upvote_count: 5, created_at: "2026-03-20T20:02:00Z" };

describe("sortCommentsByBest", () => {
  it("sorts by upvotes descending, then created_at ascending, then id ascending", () => {
    expect(sortCommentsByBest([b, c, a]).map((item) => item.id)).toEqual(["a", "b", "c"]);
  });
});

describe("getVisualCommentDepth", () => {
  it("caps indentation at the configured visual maximum", () => {
    expect(getVisualCommentDepth(7, 4)).toBe(4);
  });

  it("returns depth unchanged when below maximum", () => {
    expect(getVisualCommentDepth(2, 4)).toBe(2);
  });
});

describe("mergeUniqueCommentsById", () => {
  it("appends new comments without duplicating existing ids", () => {
    const x = { id: "x" };
    const y = { id: "y" };
    const z = { id: "z" };
    expect(mergeUniqueCommentsById([x, y], [y, z]).map((item) => item.id)).toEqual(["x", "y", "z"]);
  });

  it("keeps comments unique when a branch is reloaded from offset 0", () => {
    const x = { id: "x" };
    const y = { id: "y" };
    const z = { id: "z" };
    expect(mergeUniqueCommentsById([x, y], [x, y, z]).map((item) => item.id)).toEqual(["x", "y", "z"]);
  });
});
