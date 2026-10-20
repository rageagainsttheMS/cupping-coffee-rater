import { createHandler } from "../http.ts";
import { deleteAccount, deleteAccountInputSchema } from "../deleteAccount.ts";
import type { AccountStore } from "../deleteAccount.ts";

function fakeStore(paths: string[] = [], failAt?: keyof AccountStore) {
  const calls: string[] = [];
  const store: AccountStore = {
    listPhotoPaths: jest.fn(async () => {
      calls.push("list");
      if (failAt === "listPhotoPaths") throw new Error("storage down");
      return paths;
    }),
    removePhotos: jest.fn(async () => {
      calls.push("remove");
      if (failAt === "removePhotos") throw new Error("storage down");
    }),
    deleteUser: jest.fn(async () => {
      calls.push("delete");
      if (failAt === "deleteUser") throw new Error("auth down");
    }),
  };
  return { store, calls };
}

describe("deleteAccount", () => {
  it("removes the photos, then the user", async () => {
    const { store, calls } = fakeStore(["u1/a.jpg", "u1/b.jpg"]);
    const result = await deleteAccount("u1", store);
    expect(calls).toEqual(["list", "remove", "delete"]);
    expect(store.removePhotos).toHaveBeenCalledWith(["u1/a.jpg", "u1/b.jpg"]);
    expect(store.deleteUser).toHaveBeenCalledWith("u1");
    expect(result).toEqual({ deleted: true, photos: 2 });
  });

  it("skips the photo removal when there are none", async () => {
    const { store, calls } = fakeStore([]);
    await deleteAccount("u1", store);
    expect(calls).toEqual(["list", "delete"]);
  });

  it("does not delete the user if the photos could not be removed", async () => {
    const { store } = fakeStore(["u1/a.jpg"], "removePhotos");
    await expect(deleteAccount("u1", store)).rejects.toThrow("storage down");
    expect(store.deleteUser).not.toHaveBeenCalled();
  });

  it("fails if the user could not be deleted, so it can be retried", async () => {
    const { store } = fakeStore(["u1/a.jpg"], "deleteUser");
    await expect(deleteAccount("u1", store)).rejects.toThrow("auth down");
  });
});

describe("delete-account request", () => {
  function handlerFor(userId: string | null, store: AccountStore) {
    return createHandler({
      inputSchema: deleteAccountInputSchema,
      verifyUser: async () => (userId ? { id: userId } : null),
      run: (_input, user) => deleteAccount(user.id, store),
      logError: () => {},
    });
  }
  const post = (body: unknown, token: string | null = "good") =>
    new Request("https://example.test/delete-account", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

  it("deletes the person the token belongs to, not anyone named in the body", async () => {
    const { store } = fakeStore();
    const res = await handlerFor("me", store)(post({ confirm: "DELETE", userId: "someone-else" }));
    expect(res.status).toBe(200);
    expect(store.deleteUser).toHaveBeenCalledWith("me");
  });

  it("refuses without the confirmation word", async () => {
    const { store } = fakeStore();
    const res = await handlerFor("me", store)(post({ confirm: "delete" }));
    expect(res.status).toBe(400);
    expect(store.deleteUser).not.toHaveBeenCalled();
  });

  it("refuses a request that is not signed in", async () => {
    const { store } = fakeStore();
    const res = await handlerFor(null, store)(post({ confirm: "DELETE" }, null));
    expect(res.status).toBe(401);
    expect(store.deleteUser).not.toHaveBeenCalled();
  });

  it("answers a generic 500 when deleting fails, without the reason", async () => {
    const { store } = fakeStore(["u/a.jpg"], "deleteUser");
    const res = await handlerFor("me", store)(post({ confirm: "DELETE" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "internal_error" });
  });
});
