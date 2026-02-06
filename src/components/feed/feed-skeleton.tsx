export function FeedSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-lg border border-border bg-card"
        >
          {/* Header skeleton */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            <div className="space-y-1">
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              <div className="h-2 w-16 animate-pulse rounded bg-muted" />
            </div>
          </div>
          {/* Image skeleton */}
          <div className="aspect-[4/3] w-full animate-pulse bg-muted" />
          {/* Actions skeleton */}
          <div className="px-4 py-3">
            <div className="h-8 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
