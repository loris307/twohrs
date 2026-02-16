import Link from "next/link";

const MENTION_REGEX = /@([a-z0-9_]{3,20})\b/g;
const URL_REGEX = /https?:\/\/[^\s<>)"]+/g;
const HASHTAG_REGEX = /#([a-zA-Z0-9_\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df]+)/g;

export function renderTextWithMentions(text: string): React.ReactNode[] {
  // Collect all matches (mentions, URLs, hashtags) with their positions
  const tokens: { index: number; length: number; type: "mention" | "url" | "hashtag"; value: string }[] = [];

  for (const match of text.matchAll(MENTION_REGEX)) {
    tokens.push({
      index: match.index!,
      length: match[0].length,
      type: "mention",
      value: match[1],
    });
  }

  for (const match of text.matchAll(URL_REGEX)) {
    tokens.push({
      index: match.index!,
      length: match[0].length,
      type: "url",
      value: match[0],
    });
  }

  for (const match of text.matchAll(HASHTAG_REGEX)) {
    tokens.push({
      index: match.index!,
      length: match[0].length,
      type: "hashtag",
      value: match[1].toLowerCase(),
    });
  }

  // Sort by position and remove overlapping tokens
  tokens.sort((a, b) => a.index - b.index);
  const filtered: typeof tokens = [];
  let lastEnd = 0;
  for (const token of tokens) {
    if (token.index >= lastEnd) {
      filtered.push(token);
      lastEnd = token.index + token.length;
    }
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const token of filtered) {
    if (token.index > lastIndex) {
      parts.push(text.slice(lastIndex, token.index));
    }

    if (token.type === "mention") {
      parts.push(
        <Link
          key={`mention-${token.index}`}
          href={`/profile/${token.value}`}
          className="font-medium text-primary hover:underline"
        >
          @{token.value}
        </Link>
      );
    } else if (token.type === "hashtag") {
      parts.push(
        <Link
          key={`hashtag-${token.index}`}
          href={`/search/hashtag/${token.value}`}
          className="font-medium text-primary hover:underline"
        >
          #{token.value}
        </Link>
      );
    } else {
      // Strip trailing punctuation that's likely not part of the URL
      let url = token.value;
      const trailingMatch = url.match(/[.,;:!?]+$/);
      const trailing = trailingMatch ? trailingMatch[0] : "";
      if (trailing) {
        url = url.slice(0, -trailing.length);
      }

      parts.push(
        <a
          key={`url-${token.index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary hover:underline"
        >
          {url}
        </a>
      );
      if (trailing) {
        parts.push(trailing);
      }
    }

    lastIndex = token.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}
