"use client";

import { ArrowUp } from "lucide-react";

interface NewPostsBannerProps {
  count: number;
  onClick: () => void;
}

export function NewPostsBanner({ count, onClick }: NewPostsBannerProps) {
  const label = count === 1 ? "1 neuer Post" : `${count} neue Posts`;

  return (
    <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2 animate-in slide-in-from-top-2 fade-in duration-300">
      <button
        onClick={onClick}
        className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl active:scale-95"
      >
        <ArrowUp className="h-4 w-4" />
        {label}
      </button>
    </div>
  );
}
