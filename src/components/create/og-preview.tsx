"use client";

import { X, ExternalLink } from "lucide-react";

interface OgPreviewProps {
  title: string | null;
  description: string | null;
  image: string | null;
  url: string;
  onRemove: () => void;
}

export function OgPreview({ title, description, image, url, onRemove }: OgPreviewProps) {
  const domain = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })();

  return (
    <div className="relative overflow-hidden rounded-md border border-border bg-muted/50">
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-2 top-2 z-10 rounded-full bg-background/80 p-1 hover:bg-background"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex gap-3 p-3">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={title || "Preview"}
            className="h-16 w-16 flex-shrink-0 rounded object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          {title && (
            <p className="truncate text-sm font-medium">{title}</p>
          )}
          {description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {description}
            </p>
          )}
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <ExternalLink className="h-3 w-3" />
            {domain}
          </p>
        </div>
      </div>
    </div>
  );
}
