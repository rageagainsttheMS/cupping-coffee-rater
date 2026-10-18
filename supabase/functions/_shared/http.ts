import type { z } from "zod";
import { PlacesError } from "./types.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** An error with a status and a short code that is safe to send to the app. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type Options<S extends z.ZodType, R> = {
  inputSchema: S;
  run: (input: z.infer<S>, user: { id: string }) => Promise<R>;
  /** Returns the user a JWT belongs to, or null if it is not a valid session. */
  verifyUser: (jwt: string) => Promise<{ id: string } | null>;
  logError?: (error: unknown) => void;
};

function defaultLog(error: unknown) {
  // Name and message only: never the request, headers or any response body.
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : "unknown error");
}

/**
 * Wraps a function body with CORS, a signed-in-user check, input validation and error mapping.
 * The app only ever sees a short error code, never a Google response or a stack trace.
 */
export function createHandler<S extends z.ZodType, R>({
  inputSchema,
  run,
  verifyUser,
  logError = defaultLog,
}: Options<S, R>): (req: Request) => Promise<Response> {
  return async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

    try {
      const token = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "")?.[1];
      const user = token ? await verifyUser(token) : null;
      if (!user) return json(401, { error: "unauthorized" });

      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return json(400, { error: "invalid_json" });
      }
      const input = inputSchema.safeParse(body);
      if (!input.success) return json(400, { error: "invalid_input" });

      return json(200, await run(input.data, user));
    } catch (error) {
      if (error instanceof HttpError) return json(error.status, { error: error.code });
      logError(error);
      if (error instanceof PlacesError) return json(502, { error: "upstream_error" });
      return json(500, { error: "internal_error" });
    }
  };
}
