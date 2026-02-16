import { NextRequest, NextResponse } from "next/server";

const MAX_HTML_BYTES = 100_000; // Only read first 100KB (OG tags are in <head>)

/** Pick a User-Agent that the target site recognises as a known crawler. */
function getUserAgentForDomain(hostname: string): string {
  // X/Twitter blocks most bot UAs (404/403) but accepts WhatsApp
  if (hostname.includes("x.com") || hostname.includes("twitter.com")) {
    return "WhatsApp/2.23.20.0";
  }
  return "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";
}

/** Decode common HTML entities in meta tag content (e.g. &amp; → &). */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#0*(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/** Resolve relative / protocol-relative image URLs against the page URL. */
function resolveImageUrl(src: string, pageUrl: URL): string {
  if (src.startsWith("//")) return `https:${src}`;
  if (src.startsWith("/")) return `${pageUrl.origin}${src}`;
  return src;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL parameter required" }, { status: 400 });
  }

  // Validate URL format
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Only allow http/https
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: "Only HTTP(S) URLs allowed" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": getUserAgentForDomain(parsedUrl.hostname),
        "Accept": "text/html",
        "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
      },
    });

    if (!response.ok) {
      clearTimeout(timeout);
      // Fall back to URL-based preview for sites that block cloud IPs
      const fallback = buildFallbackFromUrl(parsedUrl);
      if (fallback) return NextResponse.json(fallback);
      return NextResponse.json({ error: "Failed to fetch URL" }, { status: 502 });
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      clearTimeout(timeout);
      return NextResponse.json({ error: "URL is not an HTML page" }, { status: 400 });
    }

    // Only read first 100KB — OG tags are always in <head>
    const html = await readPartialBody(response, MAX_HTML_BYTES);
    clearTimeout(timeout);

    // Extract from og:* and twitter:* tags (the "real" OG data)
    const metaTitle =
      extractMetaContent(html, "og:title") ||
      extractMetaContent(html, "twitter:title");
    const metaDescription =
      extractMetaContent(html, "og:description") ||
      extractMetaContent(html, "twitter:description");
    const rawImage =
      extractMetaContent(html, "og:image") ||
      extractMetaContent(html, "twitter:image") ||
      extractMetaContent(html, "twitter:image:src");
    const ogImage = rawImage ? resolveImageUrl(rawImage, parsedUrl) : null;
    const ogUrl = extractMetaContent(html, "og:url") || parsedUrl.toString();
    // Generic <meta name="description"> is only used as a last-resort supplement,
    // not as a signal that the page has real OG data.
    const fallbackDescription = extractMetaContent(html, "description");

    // If no real OG/twitter meta tags found, the page is likely a login
    // redirect or generic shell — use URL-based fallback instead of the
    // bare <title> tag which is usually just the platform name.
    const hasRealOgData = metaTitle || metaDescription || ogImage;
    if (!hasRealOgData) {
      const fallback = buildFallbackFromUrl(parsedUrl);
      if (fallback) return NextResponse.json(fallback);
      // Last resort: use the <title> tag
      const titleTag = extractTag(html, "title");
      if (titleTag) {
        return NextResponse.json({ title: titleTag, description: null, image: null, url: ogUrl });
      }
      return NextResponse.json({ error: "No OG data found" }, { status: 404 });
    }

    return NextResponse.json({
      title: metaTitle || extractTag(html, "title") || null,
      description: metaDescription || fallbackDescription || null,
      image: ogImage || null,
      url: ogUrl,
    });
  } catch {
    // On timeout / network error, still try URL-based fallback
    const fallback = buildFallbackFromUrl(parsedUrl);
    if (fallback) return NextResponse.json(fallback);
    return NextResponse.json({ error: "Request timed out or failed" }, { status: 504 });
  }
}

async function readPartialBody(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";

  const decoder = new TextDecoder();
  let result = "";

  while (result.length < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }

  reader.cancel();
  return result.slice(0, maxBytes);
}

function extractMetaContent(html: string, property: string): string | null {
  // Find the meta tag containing this property/name
  const escaped = escapeRegex(property);
  const tagRegex = new RegExp(
    `<meta[^>]*(?:property|name)=["']${escaped}["'][^>]*>`,
    "i"
  );
  const tagMatch = html.match(tagRegex);
  if (!tagMatch) return null;

  // Extract content value — handle double and single quotes separately
  const tag = tagMatch[0];
  const dblQuote = tag.match(/content="([^"]*)"/i);
  if (dblQuote) return decodeHtmlEntities(dblQuote[1]);
  const sglQuote = tag.match(/content='([^']*)'/i);
  if (sglQuote) return decodeHtmlEntities(sglQuote[1]);
  return null;
}

function extractTag(html: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i");
  const match = html.match(regex);
  return match ? match[1].trim() || null : null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build a minimal preview from the URL itself when the site blocks scraping
 * (e.g. Instagram blocks cloud server IPs).
 */
function buildFallbackFromUrl(parsedUrl: URL): { title: string; description: string | null; image: null; url: string } | null {
  const host = parsedUrl.hostname.replace("www.", "");
  const path = parsedUrl.pathname;

  if (host === "instagram.com") {
    const reelMatch = path.match(/^\/reels?\/([^/]+)/);
    if (reelMatch) return { title: "Instagram Reel", description: null, image: null, url: parsedUrl.toString() };
    const postMatch = path.match(/^\/p\/([^/]+)/);
    if (postMatch) return { title: "Instagram Post", description: null, image: null, url: parsedUrl.toString() };
    const storyMatch = path.match(/^\/stories\/([^/]+)/);
    if (storyMatch) return { title: `Instagram Story – @${storyMatch[1]}`, description: null, image: null, url: parsedUrl.toString() };
    const userMatch = path.match(/^\/([a-zA-Z0-9_.]+)\/?$/);
    if (userMatch) return { title: `@${userMatch[1]} auf Instagram`, description: null, image: null, url: parsedUrl.toString() };
    return { title: "Instagram", description: null, image: null, url: parsedUrl.toString() };
  }

  if (host === "x.com" || host === "twitter.com") {
    const tweetMatch = path.match(/^\/([^/]+)\/status\/(\d+)/);
    if (tweetMatch) return { title: `Post von @${tweetMatch[1]} auf X`, description: null, image: null, url: parsedUrl.toString() };
    const userMatch = path.match(/^\/([a-zA-Z0-9_]+)\/?$/);
    if (userMatch) return { title: `@${userMatch[1]} auf X`, description: null, image: null, url: parsedUrl.toString() };
    return { title: "X (Twitter)", description: null, image: null, url: parsedUrl.toString() };
  }

  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
    const videoMatch = path.match(/\/@([^/]+)\/video\/(\d+)/);
    if (videoMatch) return { title: `TikTok von @${videoMatch[1]}`, description: null, image: null, url: parsedUrl.toString() };
    const userMatch = path.match(/^\/@([^/]+)\/?$/);
    if (userMatch) return { title: `@${userMatch[1]} auf TikTok`, description: null, image: null, url: parsedUrl.toString() };
  }

  return null;
}
