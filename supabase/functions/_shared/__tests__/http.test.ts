import { z } from "zod";
import { HttpError, createHandler } from "../http.ts";
import { PlacesError } from "../types.ts";

const SECRET = "super-secret-places-key";
const schema = z.object({ name: z.string() });

function setup(
  run: (input: { name: string }, user: { id: string }) => Promise<unknown>,
  user: { id: string } | null = { id: "u1" },
) {
  const verifyUser = jest.fn(async () => user);
  const handler = createHandler({ inputSchema: schema, run, verifyUser, logError: () => {} });
  return { handler, verifyUser };
}

const post = (body: unknown, token: string | null = "good-token") =>
  new Request("https://example.test/fn", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("createHandler", () => {
  it("answers a CORS preflight without checking auth", async () => {
    const { handler, verifyUser } = setup(async () => ({}));
    const res = await handler(new Request("https://example.test/fn", { method: "OPTIONS" }));
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("access-control-allow-headers")).toContain("authorization");
    expect(verifyUser).not.toHaveBeenCalled();
  });

  it("rejects a request with no token", async () => {
    const run = jest.fn();
    const { handler } = setup(run);
    const res = await handler(post({ name: "x" }, null));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
    expect(run).not.toHaveBeenCalled();
  });

  it("rejects a token that does not belong to a user", async () => {
    const run = jest.fn();
    const { handler } = setup(run, null);
    const res = await handler(post({ name: "x" }));
    expect(res.status).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });

  it("only accepts POST", async () => {
    const { handler } = setup(async () => ({}));
    const res = await handler(new Request("https://example.test/fn", { method: "GET" }));
    expect(res.status).toBe(405);
  });

  it("runs the handler for a signed-in user and returns its result", async () => {
    const run = jest.fn(async (input: { name: string }) => ({ hello: input.name }));
    const { handler, verifyUser } = setup(run);
    const res = await handler(post({ name: "ada" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ hello: "ada" });
    expect(verifyUser).toHaveBeenCalledWith("good-token");
    expect(run).toHaveBeenCalledWith({ name: "ada" }, { id: "u1" });
  });

  it("answers 400 for invalid JSON and for input that fails validation", async () => {
    const { handler } = setup(async () => ({}));
    expect((await handler(post("{nope"))).status).toBe(400);
    const res = await handler(post({ name: 5 }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_input" });
  });

  it("passes an HttpError through with its status and code", async () => {
    const { handler } = setup(async () => {
      throw new HttpError(404, "cafe_not_found");
    });
    const res = await handler(post({ name: "x" }));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "cafe_not_found" });
  });

  it("turns a Places failure into a generic 502 that leaks nothing", async () => {
    const { handler } = setup(async () => {
      throw new PlacesError(403);
    });
    const res = await handler(post({ name: "x" }));
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: "upstream_error" });
    expect(text).not.toContain("403");
  });

  it("turns an unexpected error into a generic 500", async () => {
    const { handler } = setup(async () => {
      throw new Error(`boom with ${SECRET}`);
    });
    const res = await handler(post({ name: "x" }));
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toContain(SECRET);
    expect(JSON.parse(text)).toEqual({ error: "internal_error" });
  });

  it("adds CORS headers to every response", async () => {
    const { handler } = setup(async () => ({}));
    for (const res of [
      await handler(post({ name: "x" })),
      await handler(post({ name: "x" }, null)),
    ]) {
      expect(res.headers.get("access-control-allow-origin")).toBe("*");
      expect(res.headers.get("content-type")).toContain("application/json");
    }
  });
});
