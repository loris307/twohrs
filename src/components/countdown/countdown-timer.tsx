"use client";

import { useCountdown } from "@/lib/hooks/use-countdown";

export function CountdownTimer() {
  const { hours, minutes, seconds } = useCountdown();

  return (
    <div className="space-y-4 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
        Öffnet in
      </p>
      <div className="flex items-center justify-center gap-2">
        <TimeBlock value={hours} label="Std" />
        <span className="text-4xl font-bold text-muted-foreground">:</span>
        <TimeBlock value={minutes} label="Min" />
        <span className="text-4xl font-bold text-muted-foreground">:</span>
        <TimeBlock value={seconds} label="Sek" />
      </div>
    </div>
  );
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-card text-4xl font-bold tabular-nums">
        {value.toString().padStart(2, "0")}
      </div>
      <span className="mt-1 text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
