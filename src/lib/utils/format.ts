import { formatDistanceToNowStrict } from "date-fns";
import { de } from "date-fns/locale";

export function formatRelativeTime(dateString: string): string {
  return formatDistanceToNowStrict(new Date(dateString), {
    addSuffix: true,
    locale: de,
  });
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}

export function formatCountdown(hours: number, minutes: number, seconds: number): string {
  const h = hours.toString().padStart(2, "0");
  const m = minutes.toString().padStart(2, "0");
  const s = seconds.toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}
