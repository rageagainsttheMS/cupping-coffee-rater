import { createHandler } from "../http.ts";
import { isActiveModerator, moderateUser, moderateUserInputSchema } from "../moderateUser.ts";
import type { ModerationStore } from "../moderateUser.ts";

const MOD = "00000000-0000-4000-8000-000000000001";
const OTHER_MOD = "00000000-0000-4000-8000-000000000002";
const USER = "00000000-0000-4000-8000-000000000003";

function fakeStore(moderators: string[] = [MOD]) {
  const calls: string[] = [];
  const store: ModerationStore = {
    isModerator: jest.fn(async (id: string) => moderators.includes(id)),
    setBanned: jest.fn(async (_id: string, banned: boolean) => {
      calls.push(banned ? "ban" : "unban");
    }),
    applyBan: jest.fn(async () => {
      calls.push("hide");
      return 4;
    }),
    liftBan: jest.fn(async () => {
      calls.push("restore");
      return 4;
    }),
  };
  return { store, calls };
}

describe("isActiveModerator", () => {
  const now = new Date("2026-10-31T00:00:00Z");

  it("needs the moderator role", () => {
    expect(isActiveModerator({ app_metadata: { role: "moderator" } }, now)).toBe(true);
    expect(isActiveModerator({ app_metadata: { role: "admin" } }, now)).toBe(false);
    expect(isActiveModerator({}, now)).toBe(false);
  });

  it("is not a moderator while banned", () => {
    const role = { role: "moderator" };
    expect(
      isActiveModerator({ app_metadata: role, banned_until: "2126-01-01T00:00:00Z" }, now),
    ).toBe(false);
    expect(
      isActiveModerator({ app_metadata: role, banned_until: "2026-01-01T00:00:00Z" }, now),
    ).toBe(true);
  });
});

describe("moderateUser", () => {
  it("bans: sets the auth ban first, then hides the reviews", async () => {
    const { store, calls } = fakeStore();
    const result = await moderateUser(
      { userId: USER, action: "ban", note: "  Spam. " },
      MOD,
      store,
    );
    expect(calls).toEqual(["ban", "hide"]);
    expect(store.applyBan).toHaveBeenCalledWith(USER, MOD, "Spam.");
    expect(result).toEqual({ banned: true, reviews: 4 });
  });

  it("unbans: lifts the auth ban, then restores the reviews", async () => {
    const { store, calls } = fakeStore();
    const result = await moderateUser({ userId: USER, action: "unban" }, MOD, store);
    expect(calls).toEqual(["unban", "restore"]);
    expect(store.liftBan).toHaveBeenCalledWith(USER, MOD, null);
    expect(result).toEqual({ banned: false, reviews: 4 });
  });

  it("refuses a caller who is not a moderator", async () => {
    const { store } = fakeStore([]);
    await expect(moderateUser({ userId: USER, action: "ban" }, MOD, store)).rejects.toMatchObject({
      status: 403,
      code: "forbidden",
    });
    expect(store.setBanned).not.toHaveBeenCalled();
  });

  it("refuses to ban yourself", async () => {
    const { store } = fakeStore();
    await expect(moderateUser({ userId: MOD, action: "ban" }, MOD, store)).rejects.toMatchObject({
      code: "cannot_ban_self",
    });
    expect(store.setBanned).not.toHaveBeenCalled();
  });

  it("refuses to ban another moderator", async () => {
    const { store } = fakeStore([MOD, OTHER_MOD]);
    await expect(
      moderateUser({ userId: OTHER_MOD, action: "ban" }, MOD, store),
    ).rejects.toMatchObject({ code: "target_is_moderator" });
    expect(store.setBanned).not.toHaveBeenCalled();
  });

  it("does not hide reviews if the auth ban failed", async () => {
    const { store } = fakeStore();
    (store.setBanned as jest.Mock).mockRejectedValueOnce(new Error("auth down"));
    await expect(moderateUser({ userId: USER, action: "ban" }, MOD, store)).rejects.toThrow(
      "auth down",
    );
    expect(store.applyBan).not.toHaveBeenCalled();
  });
});

describe("moderate-user request", () => {
  function handlerFor(userId: string | null, store: ModerationStore) {
    return createHandler({
      inputSchema: moderateUserInputSchema,
      verifyUser: async () => (userId ? { id: userId } : null),
      run: (input, user) => moderateUser(input, user.id, store),
      logError: () => {},
    });
  }
  const post = (body: unknown, token: string | null = "good") =>
    new Request("https://example.test/moderate-user", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

  it("bans as the moderator the token belongs to", async () => {
    const { store } = fakeStore();
    const res = await handlerFor(MOD, store)(post({ userId: USER, action: "ban" }));
    expect(res.status).toBe(200);
    expect(store.applyBan).toHaveBeenCalledWith(USER, MOD, null);
  });

  it("answers 403 to someone who is not a moderator", async () => {
    const { store } = fakeStore([]);
    const res = await handlerFor(USER, store)(post({ userId: MOD, action: "ban" }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden" });
  });

  it("refuses bad input", async () => {
    const { store } = fakeStore();
    const handler = handlerFor(MOD, store);
    expect((await handler(post({ userId: "not-a-uuid", action: "ban" }))).status).toBe(400);
    expect((await handler(post({ userId: USER, action: "delete" }))).status).toBe(400);
    expect(
      (await handler(post({ userId: USER, action: "ban", note: "x".repeat(501) }))).status,
    ).toBe(400);
    expect(store.setBanned).not.toHaveBeenCalled();
  });

  it("refuses a request that is not signed in", async () => {
    const { store } = fakeStore();
    const res = await handlerFor(null, store)(post({ userId: USER, action: "ban" }, null));
    expect(res.status).toBe(401);
  });
});
