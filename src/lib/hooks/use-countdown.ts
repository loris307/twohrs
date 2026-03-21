"use client";

import { useState, useEffect } from "react";
import { getCountdownToOpen } from "@/lib/utils/time";

export const INITIAL_COUNTDOWN = {
  hours: 0,
  minutes: 0,
  seconds: 0,
  totalMs: 0,
};

export function useCountdown() {
  const [countdown, setCountdown] = useState(INITIAL_COUNTDOWN);

  useEffect(() => {
    setCountdown(getCountdownToOpen());

    const timer = setInterval(() => {
      setCountdown(getCountdownToOpen());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return countdown;
}
