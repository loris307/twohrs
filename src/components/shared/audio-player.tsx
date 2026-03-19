"use client";

interface AudioPlayerProps {
  src: string;
  durationMs?: number | null;
  variant?: "default" | "compact";
}

export function AudioPlayer({ src, durationMs, variant = "default" }: AudioPlayerProps) {
  const durationLabel = durationMs != null
    ? `${Math.floor(durationMs / 1000)}.${Math.floor((durationMs % 1000) / 100)}s`
    : null;

  return (
    <div
      className={`flex items-center gap-3 ${variant === "compact" ? "px-3 py-2" : "px-4 py-3"}`}
      data-post-card-interactive
    >
      <div className="min-w-0 flex-1">
        <audio
          controls
          preload="metadata"
          src={src}
          className="w-full max-w-full"
          style={{ height: variant === "compact" ? 32 : 40 }}
        />
      </div>
      {durationLabel && (
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {durationLabel}
        </span>
      )}
    </div>
  );
}
