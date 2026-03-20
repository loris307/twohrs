import type { CommentListItem } from "@/lib/types";

export function getVisualCommentDepth(depth: number, maxVisualDepth: number) {
  return Math.min(depth, maxVisualDepth);
}

export function sortCommentsByBest<T extends Pick<CommentListItem, "id" | "created_at" | "upvote_count">>(items: T[]) {
  return [...items].sort((a, b) => {
    if (b.upvote_count !== a.upvote_count) return b.upvote_count - a.upvote_count;
    if (a.created_at !== b.created_at) return a.created_at.localeCompare(b.created_at);
    return a.id.localeCompare(b.id);
  });
}

export function mergeUniqueCommentsById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const seen = new Set(existing.map((item) => item.id));
  const merged = [...existing];
  for (const item of incoming) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }
  return merged;
}
