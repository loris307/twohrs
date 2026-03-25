import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createAdminClientMock,
  fromMock,
  profileSelectMock,
  profileEqMock,
  profileSingleMock,
  profileUpdateMock,
  profileUpdateEqMock,
  upsertMock,
  hallOfFameSelectMock,
  hallOfFameEqMock,
  storageFromMock,
  avatarListMock,
  avatarRemoveMock,
  memesListMock,
  memesRemoveMock,
  audioListMock,
  audioRemoveMock,
  getUserByIdMock,
  deleteUserMock,
} = vi.hoisted(() => ({
  createAdminClientMock: vi.fn(),
  fromMock: vi.fn(),
  profileSelectMock: vi.fn(),
  profileEqMock: vi.fn(),
  profileSingleMock: vi.fn(),
  profileUpdateMock: vi.fn(),
  profileUpdateEqMock: vi.fn(),
  upsertMock: vi.fn(),
  hallOfFameSelectMock: vi.fn(),
  hallOfFameEqMock: vi.fn(),
  storageFromMock: vi.fn(),
  avatarListMock: vi.fn(),
  avatarRemoveMock: vi.fn(),
  memesListMock: vi.fn(),
  memesRemoveMock: vi.fn(),
  audioListMock: vi.fn(),
  audioRemoveMock: vi.fn(),
  getUserByIdMock: vi.fn(),
  deleteUserMock: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: createAdminClientMock,
}));

vi.mock("@/lib/utils/auth-email", () => ({
  hashNormalizedAuthEmail: vi.fn(() => "hashed-email"),
}));

describe("addModerationStrike", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    profileSelectMock.mockReturnValue({
      eq: profileEqMock,
    });
    profileEqMock.mockReturnValue({
      single: profileSingleMock,
    });

    profileUpdateMock.mockReturnValue({
      eq: profileUpdateEqMock,
    });
    profileUpdateEqMock.mockResolvedValue({ error: null });

    hallOfFameSelectMock.mockReturnValue({
      eq: hallOfFameEqMock,
    });
    hallOfFameEqMock.mockResolvedValue({ data: [] });

    fromMock.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: profileSelectMock,
          update: profileUpdateMock,
        };
      }
      if (table === "banned_email_hashes") {
        return {
          upsert: upsertMock,
        };
      }
      if (table === "top_posts_all_time") {
        return {
          select: hallOfFameSelectMock,
        };
      }
      throw new Error(`unexpected table: ${table}`);
    });

    avatarListMock.mockResolvedValue({ data: [] });
    avatarRemoveMock.mockResolvedValue({ data: null });
    memesListMock.mockResolvedValue({ data: [] });
    memesRemoveMock.mockResolvedValue({ data: null });
    audioListMock.mockResolvedValue({ data: [] });
    audioRemoveMock.mockResolvedValue({ data: null });

    storageFromMock.mockImplementation((bucket: string) => {
      if (bucket === "avatars") {
        return {
          list: avatarListMock,
          remove: avatarRemoveMock,
        };
      }
      if (bucket === "memes") {
        return {
          list: memesListMock,
          remove: memesRemoveMock,
        };
      }
      if (bucket === "audio-posts") {
        return {
          list: audioListMock,
          remove: audioRemoveMock,
        };
      }
      throw new Error(`unexpected bucket: ${bucket}`);
    });

    getUserByIdMock.mockResolvedValue({ data: { user: null } });
    deleteUserMock.mockResolvedValue({ data: { user: null } });

    createAdminClientMock.mockReturnValue({
      from: fromMock,
      storage: {
        from: storageFromMock,
      },
      auth: {
        admin: {
          getUserById: getUserByIdMock,
          deleteUser: deleteUserMock,
        },
      },
    });
  });

  it("does not increment moderation strikes for admin targets", async () => {
    profileSingleMock.mockResolvedValue({
      data: { is_admin: true, moderation_strikes: 2 },
    });

    const { addModerationStrike } = await import("./strikes");
    const result = await addModerationStrike("admin-user-id");

    expect(result).toEqual({
      newStrikes: 2,
      accountDeleted: false,
    });
    expect(profileUpdateMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it("does not increment nsfw strikes for admin targets", async () => {
    profileSingleMock.mockResolvedValue({
      data: { is_admin: true, nsfw_strikes: 7 },
    });

    const { addModerationStrike } = await import("./strikes");
    const result = await addModerationStrike("admin-user-id", {
      column: "nsfw_strikes",
    });

    expect(result).toEqual({
      newStrikes: 7,
      accountDeleted: false,
    });
    expect(profileUpdateMock).not.toHaveBeenCalled();
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it("still deletes non-admin accounts at the moderation threshold", async () => {
    profileSingleMock.mockResolvedValue({
      data: { is_admin: false, moderation_strikes: 2 },
    });
    getUserByIdMock.mockResolvedValue({
      data: { user: { email: "user@example.com" } },
    });

    const { addModerationStrike } = await import("./strikes");
    const result = await addModerationStrike("normal-user-id");

    expect(result).toEqual({
      newStrikes: 3,
      accountDeleted: true,
    });
    expect(profileUpdateMock).toHaveBeenCalled();
    expect(upsertMock).toHaveBeenCalled();
    expect(deleteUserMock).toHaveBeenCalledWith("normal-user-id");
  });
});
