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

  if (openMinutes <= closeMinutes) {
    // Same day (e.g., 20:00–22:00)
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  } else {
    // Crosses midnight (e.g., 23:00–02:00)
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }
}

export function isGracePeriod(now?: Date): boolean {
  const zonedNow = now ?? getNowInTimezone();
  const hours = zonedNow.getHours();
  const minutes = zonedNow.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const closeMinutes = CLOSE_HOUR * 60 + CLOSE_MINUTE;
  const graceEndMinutes = closeMinutes + GRACE_MINUTES;

  if (graceEndMinutes <= 1440) {
    return currentMinutes >= closeMinutes && currentMinutes < graceEndMinutes;
  } else {
    // Grace period wraps past midnight
    return (
      currentMinutes >= closeMinutes ||
      currentMinutes < graceEndMinutes - 1440
    );
  }
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

  // If window crosses midnight and we're before midnight, close is tomorrow
  if (CLOSE_HOUR < OPEN_HOUR && now.getHours() >= OPEN_HOUR) {
    closeTime.setDate(closeTime.getDate() + 1);
  }

  return Math.max(0, closeTime.getTime() - now.getTime());
}

export function getSessionProgressPercent(): number {
  if (!isAppOpen()) return 0;

  const now = getNowInTimezone();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const openMinutes = OPEN_HOUR * 60 + OPEN_MINUTE;
  let closeMinutes = CLOSE_HOUR * 60 + CLOSE_MINUTE;

  // Handle midnight crossing
  if (closeMinutes < openMinutes) {
    closeMinutes += 1440;
  }

  let adjustedCurrent = currentMinutes;
  if (currentMinutes < openMinutes) {
    adjustedCurrent += 1440;
  }

  const totalMinutes = closeMinutes - openMinutes;
  const elapsed = adjustedCurrent - openMinutes;

  return Math.min(100, Math.max(0, (elapsed / totalMinutes) * 100));
}

export function getCountdownToOpen(): {
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
} {
  const now = getNowInTimezone();
  const nextOpen = getNextOpenTime();
  const totalMs = Math.max(0, nextOpen.getTime() - now.getTime());

  const totalSeconds = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds, totalMs };
}
