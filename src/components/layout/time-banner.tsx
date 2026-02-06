"use client";

import { useTimeGate } from "@/lib/hooks/use-time-gate";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function TimeBanner() {
  const { isOpen, minutesRemaining, progressPercent } = useTimeGate();
  const [warned5min, setWarned5min] = useState(false);

  useEffect(() => {
    if (minutesRemaining <= 5 && minutesRemaining > 0 && !warned5min) {
      setWarned5min(true);
      toast.warning("Noch 5 Minuten!", {
        description: "Die Session endet bald.",
      });
    }
  }, [minutesRemaining, warned5min]);

  if (!isOpen) return null;

  return (
    <div className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="mx-auto flex h-8 max-w-4xl items-center justify-between px-4 text-xs">
        <span className="text-muted-foreground">Session aktiv</span>
        <span className="font-medium tabular-nums">
          Noch {minutesRemaining} Min
        </span>
      </div>
      <div className="h-0.5 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-1000"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
