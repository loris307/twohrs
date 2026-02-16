import blockedDomainsList from "@/lib/data/blocked-domains.json";

let domainSet: Set<string> | null = null;

function getBlockedDomains(): Set<string> {
  if (!domainSet) {
    domainSet = new Set(blockedDomainsList as string[]);
  }
  return domainSet;
}

/**
 * Check if a domain (or any of its parent domains) is blocked.
 * e.g. "videos.pornsite.com" checks "videos.pornsite.com", "pornsite.com"
 */
export function isDomainBlocked(hostname: string): boolean {
  const domains = getBlockedDomains();
  const parts = hostname.toLowerCase().split(".");

  for (let i = 0; i < parts.length - 1; i++) {
    const domain = parts.slice(i).join(".");
    if (domains.has(domain)) {
      return true;
    }
  }
  return false;
}

const URL_REGEX = /https?:\/\/[^\s<>)"]+/g;

/**
 * Extract all URLs from text and check if any link to a blocked domain.
 * Returns the first blocked domain found, or null if all clean.
 */
export function findBlockedDomainInText(text: string): string | null {
  for (const match of text.matchAll(URL_REGEX)) {
    try {
      const url = new URL(match[0]);
      if (isDomainBlocked(url.hostname)) {
        return url.hostname;
      }
    } catch {
      // Invalid URL, skip
    }
  }
  return null;
}
