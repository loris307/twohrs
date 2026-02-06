"use client";

import { Clock } from "lucide-react";
import { useTimeGate } from "@/lib/hooks/use-time-gate";

export function SessionTimer() {
  const { isOpen, minutesRemaining } = useTimeGate();

  if (!isOpen) return null;

  return (
    <div className="flex items-center gap-1.5 text-sm font-medium">
      <Clock className="h-4 w-4 text-primary" />
      <span className="tabular-nums">
        Noch {minutesRemaining} Min
      </span>
    </div>
  );
}
