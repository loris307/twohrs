"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackToFeedButton() {
  const router = useRouter();

  function handleClick() {
    if (window.history.length > 1) {
      router.back();
    } else {
      document.dispatchEvent(new Event("navigation-start"));
      router.push("/feed");
    }
  }

  return (
    <button
      onClick={handleClick}
      className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      zurück zum feed
    </button>
  );
}
