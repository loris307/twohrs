"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ShareButtonProps {
  postId: string;
  caption?: string | null;
}

function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function ShareButton({ postId, caption }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareText = caption
      ? `"${caption}" — auf twohrs`
      : "Schau dir dieses Meme auf twohrs an!";
    const shareUrl = `${window.location.origin}/post/${postId}`;

    // Mobile: use native share sheet
    if (isMobile() && navigator.share) {
      try {
        await navigator.share({
          title: "twohrs",
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User cancelled
      }
      return;
    }

    // Desktop: copy link to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API failed — fallback
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`;
      window.open(whatsappUrl, "_blank");
    }
  }

  return (
    <button
      onClick={handleShare}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
        copied
          ? "text-green-500"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <span className="relative h-4 w-4">
        <Share2
          className={cn(
            "absolute inset-0 h-4 w-4 transition-all duration-200",
            copied ? "scale-0 opacity-0" : "scale-100 opacity-100"
          )}
        />
        <Check
          className={cn(
            "absolute inset-0 h-4 w-4 transition-all duration-200",
            copied ? "scale-100 opacity-100" : "scale-0 opacity-0"
          )}
        />
      </span>
      <span className="transition-all duration-200">
        {copied ? "Kopiert!" : "Teilen"}
      </span>
    </button>
  );
}
