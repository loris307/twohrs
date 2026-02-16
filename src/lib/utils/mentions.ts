const MENTION_REGEX = /@([a-z0-9_]{3,20})\b/g;

export function extractMentions(text: string): string[] {
  const usernames = new Set<string>();
  for (const match of text.matchAll(MENTION_REGEX)) {
    usernames.add(match[1]);
  }
  return Array.from(usernames);
}
