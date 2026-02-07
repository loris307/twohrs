import { NextRequest, NextResponse } from "next/server";

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
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "bot",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch URL" }, { status: 502 });
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return NextResponse.json({ error: "URL is not an HTML page" }, { status: 400 });
    }

    const html = await response.text();

    const ogTitle = extractMetaContent(html, "og:title") || extractTag(html, "title");
    const ogDescription = extractMetaContent(html, "og:description") || extractMetaContent(html, "description");
    const ogImage = extractMetaContent(html, "og:image");
    const ogUrl = extractMetaContent(html, "og:url") || parsedUrl.toString();

    if (!ogTitle && !ogDescription && !ogImage) {
      return NextResponse.json({ error: "No OG data found" }, { status: 404 });
    }

    return NextResponse.json({
      title: ogTitle || null,
      description: ogDescription || null,
      image: ogImage || null,
      url: ogUrl,
    });
  } catch {
    return NextResponse.json({ error: "Request timed out or failed" }, { status: 504 });
  }
}

function extractMetaContent(html: string, property: string): string | null {
  // Match both property="og:..." and name="description" patterns
  const regex = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escapeRegex(property)}["'][^>]+content=["']([^"']*)["']` +
    `|<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escapeRegex(property)}["']`,
    "i"
  );
  const match = html.match(regex);
  return match ? (match[1] || match[2] || null) : null;
}

function extractTag(html: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i");
  const match = html.match(regex);
  return match ? match[1].trim() || null : null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
