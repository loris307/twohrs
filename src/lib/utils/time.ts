import { toZonedTime } from "date-fns-tz";
import {
  OPEN_HOUR,
  OPEN_MINUTE,
  CLOSE_HOUR,
  CLOSE_MINUTE,
  GRACE_MINUTES,
  TIMEZONE,
} from "@/lib/constants";

function getNowInTimezone(): Date {
  return toZonedTime(new Date(), TIMEZONE);
}

export function isAppOpen(now?: Date): boolean {
  const zonedNow = now ?? getNowInTimezone();
  const hours = zonedNow.getHours();
  const minutes = zonedNow.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const openMinutes = OPEN_HOUR * 60 + OPEN_MINUTE;
  const closeMinutes = CLOSE_HOUR * 60 + CLOSE_MINUTE + GRACE_MINUTES;

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

export function isGracePeriod(now?: Date): boolean {
  const zonedNow = now ?? getNowInTimezone();
  const hours = zonedNow.getHours();
  const minutes = zonedNow.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const closeMinutes = CLOSE_HOUR * 60 + CLOSE_MINUTE;
  const graceEndMinutes = closeMinutes + GRACE_MINUTES;

  return currentMinutes >= closeMinutes && currentMinutes < graceEndMinutes;
}

export function getNextOpenTime(): Date {
  const now = getNowInTimezone();
  const today = new Date(now);
  today.setHours(OPEN_HOUR, OPEN_MINUTE, 0, 0);

  if (now < today) {
    return today;
  }

  // Next day
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

export function getTimeRemainingMs(): number {
  if (!isAppOpen()) return 0;

  const now = getNowInTimezone();
  const closeTime = new Date(now);
  closeTime.setHours(CLOSE_HOUR, CLOSE_MINUTE, 0, 0);

  return Math.max(0, closeTime.getTime() - now.getTime());
}

export function getSessionProgressPercent(): number {
  if (!isAppOpen()) return 0;

  const now = getNowInTimezone();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const openMinutes = OPEN_HOUR * 60 + OPEN_MINUTE;
  const closeMinutes = CLOSE_HOUR * 60 + CLOSE_MINUTE;
  const totalMinutes = closeMinutes - openMinutes;
  const elapsed = currentMinutes - openMinutes;

  return Math.min(100, Math.max(0, (elapsed / totalMinutes) * 100));
}

export function getCountdownToOpen(): {
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
} {
  const now = new Date();
  const nextOpen = getNextOpenTime();
  const totalMs = Math.max(0, nextOpen.getTime() - now.getTime());

  const totalSeconds = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds, totalMs };
}
