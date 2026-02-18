/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "edge";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fallbackImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: "#141414",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ color: "#fafafa", fontSize: 64, fontWeight: 800 }}>
          two
        </span>
        <span style={{ color: "#f97316", fontSize: 64, fontWeight: 800 }}>
          hrs
        </span>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // M10: Validate UUID format
  if (!UUID_RE.test(id)) {
    return new Response("Invalid post ID", { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: post } = await supabase
      .from("posts")
      .select(
        "id, caption, image_url, upvote_count, comment_count, og_title, og_url, profiles!posts_user_id_fkey (username, display_name, avatar_url)"
      )
      .eq("id", id)
      .single();

    // C4: If the post doesn't exist (e.g. after daily cleanup), return fallback
    if (!post) {
      const fb = fallbackImage();
      const buf = await fb.arrayBuffer();
      return new Response(buf, {
        headers: {
          "Content-Type": "image/png",
          "Content-Length": String(buf.byteLength),
          "Cache-Control": "public, max-age=60, s-maxage=3600",
        },
      });
    }

    const profile = post.profiles as unknown as { username: string; display_name: string | null; avatar_url: string | null } | null;
    const caption = post.caption || "";
    const displayName = profile?.display_name || profile?.username || "twohrs";
    const truncated = caption.length > 120 ? caption.slice(0, 117) + "..." : caption;
    const hasImage = !!post?.image_url;

    // Fetch post image if available
    let imageDataUrl: string | null = null;
    if (post?.image_url) {
      try {
        const imgRes = await fetch(post.image_url);
        if (imgRes.ok) {
          const buf = await imgRes.arrayBuffer();
          if (buf.byteLength < 2 * 1024 * 1024) {
            const bytes = new Uint8Array(buf);
            let binary = "";
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const ct = imgRes.headers.get("content-type") || "image/jpeg";
            imageDataUrl = `data:${ct};base64,${btoa(binary)}`;
          }
        }
      } catch {
        // skip image
      }
    }

    const imageResponse = new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            backgroundColor: "#141414",
            padding: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              height: "100%",
              backgroundColor: "#1f1f1f",
              borderRadius: 20,
              border: "1px solid #2e2e2e",
              padding: 32,
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: "#2e2e2e",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <span style={{ color: "#fafafa", fontSize: 20, fontWeight: 600 }}>
                    {displayName[0]?.toUpperCase() || "?"}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ color: "#fafafa", fontSize: 22, fontWeight: 600 }}>
                    {displayName}
                  </span>
                  <span style={{ color: "#a3a3a3", fontSize: 16 }}>
                    @{profile?.username || "unknown"}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ color: "#fafafa", fontSize: 28, fontWeight: 800 }}>
                  two
                </span>
                <span style={{ color: "#f97316", fontSize: 28, fontWeight: 800 }}>
                  hrs
                </span>
              </div>
            </div>

            {/* Caption */}
            <div style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
              <span
                style={{
                  color: "#fafafa",
                  fontSize: hasImage ? 20 : 28,
                  lineHeight: 1.4,
                }}
              >
                {truncated}
              </span>

              {imageDataUrl ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    flexGrow: 1,
                    marginTop: 16,
                    borderRadius: 12,
                    overflow: "hidden",
                    backgroundColor: "#141414",
                  }}
                >
                  <img
                    src={imageDataUrl}
                    style={{ maxWidth: "100%", maxHeight: 300, objectFit: "contain" }}
                  />
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid #2e2e2e",
              }}
            >
              <span style={{ color: "#a3a3a3", fontSize: 18, marginRight: 24 }}>
                {post?.upvote_count ?? 0} Upvotes
              </span>
              <span style={{ color: "#a3a3a3", fontSize: 18 }}>
                {post?.comment_count ?? 0} Kommentare
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );

    // Buffer the streamed ImageResponse so we can set Content-Length
    // (WhatsApp/Facebook crawlers need this header)
    const imageBuffer = await imageResponse.arrayBuffer();
    return new Response(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(imageBuffer.byteLength),
        "Cache-Control": "public, max-age=60, s-maxage=3600",
      },
    });
  } catch (e) {
    // H3: Log details server-side, return generic error to client
    console.error("OG image generation failed:", e);
    return new Response("Internal Server Error", { status: 500 });
  }
}
