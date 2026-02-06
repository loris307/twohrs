"use client";

import { useState, useEffect } from "react";
import {
  isAppOpen,
  isGracePeriod,
  getTimeRemainingMs,
  getSessionProgressPercent,
} from "@/lib/utils/time";

export function useTimeGate() {
  const [state, setState] = useState({
    isOpen: false,
    isGrace: false,
    timeRemainingMs: 0,
    progressPercent: 0,
  });

  useEffect(() => {
    function update() {
      setState({
        isOpen: isAppOpen(),
        isGrace: isGracePeriod(),
        timeRemainingMs: getTimeRemainingMs(),
        progressPercent: getSessionProgressPercent(),
      });
    }

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const minutesRemaining = Math.ceil(state.timeRemainingMs / 60000);

  return {
    ...state,
    minutesRemaining,
  };
}
