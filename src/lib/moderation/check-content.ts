import { classifyImage } from "./nsfw";
import { findBlockedDomainInText } from "./blocked-domains";

export type ContentCheckResult = {
  allowed: boolean;
  reason: string | null;
  type: "nsfw_image" | "blocked_domain" | null;
};

/**
 * Check both image content (NSFW) and caption text (blocked domains).
 * Called before post creation in server actions.
 */
export async function checkPostContent(
  imageUrl: string | null,
  caption: string | null
): Promise<ContentCheckResult> {
  // 1. Check caption for blocked domains
  if (caption) {
    const blockedDomain = findBlockedDomainInText(caption);
    if (blockedDomain) {
      return {
        allowed: false,
        reason: `Unerlaubter Link: ${blockedDomain}`,
        type: "blocked_domain",
      };
    }
  }

  // 2. Check image for NSFW content (only if there's an image)
  if (imageUrl) {
    try {
      const response = await fetch(imageUrl);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const result = await classifyImage(buffer);
        if (result.isNsfw) {
          return {
            allowed: false,
            reason: "Unzulässiger Bildinhalt erkannt",
            type: "nsfw_image",
          };
        }
      }
    } catch {
      // Fail-closed: if NSFW check fails, reject the post
      console.error("NSFW classification failed, rejecting as safety fallback");
      return {
        allowed: false,
        reason: "Bild konnte nicht überprüft werden",
        type: "nsfw_image",
      };
    }
  }

  return { allowed: true, reason: null, type: null };
}
