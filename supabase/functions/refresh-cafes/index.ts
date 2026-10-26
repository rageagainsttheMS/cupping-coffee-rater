import { corsHeaders } from "../_shared/http.ts";
import { refreshCafes } from "../_shared/refresh.ts";
import { lazyRuntime } from "../_shared/runtime.ts";

const runtime = lazyRuntime();

function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Called by the daily pg_cron job, not by the app, so it checks a shared secret instead of a user JWT.
Deno.serve(async (req) => {
  if (req.method !== "POST") return reply(405, { error: "method_not_allowed" });

  const expected = Deno.env.get("CRON_SECRET");
  if (!expected || req.headers.get("x-cron-secret") !== expected) {
    return reply(401, { error: "unauthorized" });
  }

  try {
    const { store, places } = runtime();
    const summary = await refreshCafes({ store, places });
    console.log(`refresh-cafes ${JSON.stringify(summary)}`);
    return reply(200, summary);
  } catch (error) {
    console.error(error instanceof Error ? `${error.name}: ${error.message}` : "unknown error");
    return reply(500, { error: "internal_error" });
  }
});
