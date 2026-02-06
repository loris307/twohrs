"use client";

import { useState, useEffect } from "react";
import { getCountdownToOpen } from "@/lib/utils/time";

export function useCountdown() {
  const [countdown, setCountdown] = useState(getCountdownToOpen());

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getCountdownToOpen());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return countdown;
}
