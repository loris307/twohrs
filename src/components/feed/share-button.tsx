"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";

interface ShareButtonProps {
  caption?: string | null;
}

export function ShareButton({ caption }: ShareButtonProps) {
  async function handleShare() {
    const shareText = caption
      ? `"${caption}" — auf 2Hours`
      : "Schau dir dieses Meme auf 2Hours an!";
    const shareUrl = window.location.origin;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "2Hours",
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or share failed — do nothing
        return;
      }
    }

    // Fallback: WhatsApp share
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`;
    window.open(whatsappUrl, "_blank");
    toast.success("Teilen-Link geöffnet");
  }

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <Share2 className="h-4 w-4" />
      Teilen
    </button>
  );
}
