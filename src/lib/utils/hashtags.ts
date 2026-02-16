const HASHTAG_REGEX = /#([a-zA-Z0-9_\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df]+)/g;

export function extractHashtags(text: string): string[] {
  const tags = new Set<string>();
  for (const match of text.matchAll(HASHTAG_REGEX)) {
    tags.add(match[1].toLowerCase());
  }
  return Array.from(tags);
}
