import { ExternalLink } from "lucide-react";

interface LinkPreviewProps {
  title: string | null;
  description: string | null;
  image: string | null;
  url: string;
}

export function LinkPreview({ title, description, image, url }: LinkPreviewProps) {
  const domain = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })();

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mx-4 mb-3 block overflow-hidden rounded-lg border border-border bg-muted/30 transition-colors hover:bg-muted/60"
    >
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={title || "Link preview"}
          className="h-40 w-full object-cover"
        />
      )}
      <div className="p-3">
        {title && (
          <p className="truncate text-sm font-medium">{title}</p>
        )}
        {description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {description}
          </p>
        )}
        <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          <ExternalLink className="h-3 w-3" />
          {domain}
        </p>
      </div>
    </a>
  );
}
