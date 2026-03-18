import { findBlockedDomainInText } from "./blocked-domains";

export type ContentCheckResult = {
  allowed: boolean;
  reason: string | null;
  type: "nsfw_image" | "image_check_failed" | "blocked_domain" | null;
};

/**
 * Check both image content (NSFW) and caption text (blocked domains).
 * Called before post creation in server actions.
 */
export async function checkPostContent(
  imageBuffer: Buffer | null,
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
  if (imageBuffer) {
    try {
      const { classifyImage } = await import("./nsfw");
      const result = await classifyImage(imageBuffer);
      if (result.isNsfw) {
        return {
          allowed: false,
          reason: "Unzulässiger Bildinhalt erkannt",
          type: "nsfw_image",
        };
      }
    } catch (error) {
      // Fail-closed: if NSFW check fails, reject the post
      console.error("NSFW classification failed, rejecting as safety fallback", error);
      return {
        allowed: false,
        reason: "Bild konnte nicht überprüft werden",
        type: "image_check_failed",
      };
    }
  }

  return { allowed: true, reason: null, type: null };
}
