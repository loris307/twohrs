import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { getCountdownToOpenMock } = vi.hoisted(() => ({
  getCountdownToOpenMock: vi.fn(),
}));

vi.mock("@/lib/utils/time", () => ({
  getCountdownToOpen: getCountdownToOpenMock,
}));

import { INITIAL_COUNTDOWN, useCountdown } from "./use-countdown";

describe("INITIAL_COUNTDOWN", () => {
  it("starts from a deterministic zero state", () => {
    expect(INITIAL_COUNTDOWN).toEqual({
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 0,
    });
  });
});

describe("useCountdown", () => {
  it("uses the current countdown on the first render", () => {
    getCountdownToOpenMock.mockReturnValue({
      hours: 1,
      minutes: 2,
      seconds: 3,
      totalMs: 3723000,
    });

    function Probe() {
      const countdown = useCountdown();
      return React.createElement("output", null, JSON.stringify(countdown));
    }

    const html = renderToStaticMarkup(React.createElement(Probe));

    expect(getCountdownToOpenMock).toHaveBeenCalledTimes(1);
    expect(html).toContain(
      "{&quot;hours&quot;:1,&quot;minutes&quot;:2,&quot;seconds&quot;:3,&quot;totalMs&quot;:3723000}"
    );
  });
});
