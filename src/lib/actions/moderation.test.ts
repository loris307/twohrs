import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  revalidatePathMock,
  createClientMock,
  createAdminClientMock,
  authGetUserMock,
  adminFromMock,
  adminProfileSelectMock,
  adminProfileEqMock,
  adminProfileSingleMock,
  postSelectMock,
  postEqMock,
  postSingleMock,
  postDeleteMock,
  postDeleteEqMock,
  storageFromMock,
  storageRemoveMock,
  addModerationStrikeMock,
} = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  createClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  authGetUserMock: vi.fn(),
  adminFromMock: vi.fn(),
  adminProfileSelectMock: vi.fn(),
  adminProfileEqMock: vi.fn(),
  adminProfileSingleMock: vi.fn(),
  postSelectMock: vi.fn(),
  postEqMock: vi.fn(),
  postSingleMock: vi.fn(),
  postDeleteMock: vi.fn(),
  postDeleteEqMock: vi.fn(),
  storageFromMock: vi.fn(),
  storageRemoveMock: vi.fn(),
  addModerationStrikeMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: createAdminClientMock,
}));

vi.mock("@/lib/moderation/strikes", () => ({
  addModerationStrike: addModerationStrikeMock,
}));

describe("adminDeletePost", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    authGetUserMock.mockResolvedValue({
      data: { user: { id: "acting-admin-id" } },
    });
    createClientMock.mockResolvedValue({
      auth: {
        getUser: authGetUserMock,
      },
    });

    adminProfileSelectMock.mockReturnValue({
      eq: adminProfileEqMock,
    });
    adminProfileEqMock.mockReturnValue({
      single: adminProfileSingleMock,
    });
    postSelectMock.mockReturnValue({
      eq: postEqMock,
    });
    postEqMock.mockReturnValue({
      single: postSingleMock,
    });
    postDeleteMock.mockReturnValue({
      eq: postDeleteEqMock,
    });
    postDeleteEqMock.mockResolvedValue({ error: null });

    storageRemoveMock.mockResolvedValue({ data: null });
    storageFromMock.mockReturnValue({
      remove: storageRemoveMock,
    });

    adminFromMock.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: adminProfileSelectMock,
        };
      }
      if (table === "posts") {
        return {
          select: postSelectMock,
          delete: postDeleteMock,
        };
      }
      throw new Error(`unexpected table: ${table}`);
    });

    createAdminClientMock.mockReturnValue({
      from: adminFromMock,
      storage: {
        from: storageFromMock,
      },
    });

    adminProfileSingleMock
      .mockResolvedValueOnce({ data: { is_admin: true } })
      .mockResolvedValueOnce({
        data: {
          username: "regularuser",
          moderation_strikes: 1,
          is_admin: false,
        },
      });
    postSingleMock.mockResolvedValue({
      data: {
        id: "post-id",
        user_id: "target-user-id",
        image_path: null,
        audio_path: null,
      },
    });
    addModerationStrikeMock.mockResolvedValue({
      newStrikes: 2,
      accountDeleted: false,
    });
  });

  it("returns strikeApplied false and skips addModerationStrike for admin targets", async () => {
    authGetUserMock.mockResolvedValue({
      data: { user: { id: "acting-admin-id" } },
    });
    adminProfileSingleMock.mockReset();
    adminProfileSingleMock
      .mockResolvedValueOnce({ data: { is_admin: true } })
      .mockResolvedValueOnce({
        data: {
          username: "targetadmin",
          moderation_strikes: 1,
          is_admin: true,
        },
      });
    postSingleMock.mockReset();
    postSingleMock.mockResolvedValue({
      data: {
        id: "post-id",
        user_id: "target-admin-id",
        image_path: null,
        audio_path: null,
      },
    });

    const { adminDeletePost } = await import("./moderation");
    const result = await adminDeletePost("22222222-2222-4222-8222-222222222222");

    expect(result).toEqual({
      success: true,
      data: {
        strikes: 1,
        accountDeleted: false,
        username: "targetadmin",
        strikeApplied: false,
      },
    });
    expect(addModerationStrikeMock).not.toHaveBeenCalled();
  });

  it("still applies strikes for non-admin targets", async () => {
    addModerationStrikeMock.mockResolvedValue({
      newStrikes: 2,
      accountDeleted: false,
    });

    const { adminDeletePost } = await import("./moderation");
    const result = await adminDeletePost("22222222-2222-4222-8222-222222222222");

    expect(result).toEqual({
      success: true,
      data: {
        strikes: 2,
        accountDeleted: false,
        username: "regularuser",
        strikeApplied: true,
      },
    });
    expect(addModerationStrikeMock).toHaveBeenCalledWith("target-user-id");
  });
});
