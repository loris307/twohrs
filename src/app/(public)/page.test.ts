import { isValidElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirectMock, getUserMock, getCachedLandingSnapshotMock, isAppOpenMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(() => {
    throw new Error("redirected");
  }),
  getUserMock: vi.fn(),
  getCachedLandingSnapshotMock: vi.fn(),
  isAppOpenMock: vi.fn(() => true),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: getUserMock,
    },
  }),
}));

vi.mock("@/lib/queries/landing", () => ({
  getCachedLandingSnapshot: getCachedLandingSnapshotMock,
}));

vi.mock("@/lib/utils/time", () => ({
  isAppOpen: isAppOpenMock,
}));

vi.mock("./landing-content", () => ({
  LandingContent: vi.fn(() => null),
}));

describe("LandingPage", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    isAppOpenMock.mockReturnValue(true);
  });

  it("redirects logged-in users before loading landing snapshot data", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { default: LandingPage } = await import("./page");

    await expect(LandingPage()).rejects.toThrow("redirected");
    expect(redirectMock).toHaveBeenCalledWith("/feed");
    expect(getCachedLandingSnapshotMock).not.toHaveBeenCalled();
  });

  it("returns a landing content element with cached public props for anonymous visitors", async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
    });
    getCachedLandingSnapshotMock.mockResolvedValue({
      yesterdayTopPost: null,
      userCount: 42,
    });

    const { default: LandingPage } = await import("./page");

    const element = await LandingPage();

    expect(getCachedLandingSnapshotMock).toHaveBeenCalledTimes(1);
    expect(isValidElement(element)).toBe(true);
    expect(element.props).toMatchObject({
      isLoggedIn: false,
      isAdminOnly: false,
      yesterdayTopPost: null,
      userCount: 42,
    });
  });

  it("does not redirect a logged-in user when the app is closed", async () => {
    isAppOpenMock.mockReturnValue(false);
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    getCachedLandingSnapshotMock.mockResolvedValue({
      yesterdayTopPost: null,
      userCount: 42,
    });

    const { default: LandingPage } = await import("./page");

    const element = await LandingPage();

    expect(redirectMock).not.toHaveBeenCalled();
    expect(getCachedLandingSnapshotMock).toHaveBeenCalledTimes(1);
    expect(isValidElement(element)).toBe(true);
    expect(element.props).toMatchObject({
      isLoggedIn: true,
      isAdminOnly: false,
      yesterdayTopPost: null,
      userCount: 42,
    });
  });
});
