import { createClient } from "@supabase/supabase-js";
import { createModerationStore } from "./moderateUser.ts";
import type { ModerationStore } from "./moderateUser.ts";

export type ModerationRuntime = {
  store: ModerationStore;
  verifyUser: (jwt: string) => Promise<{ id: string } | null>;
};

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/**
 * Wires the real database and auth admin API for banning. Built on the first request, so a missing
 * secret becomes a generic 500 (logged on the server).
 */
export function createModerationRuntime(): ModerationRuntime {
  const db = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    store: createModerationStore(db),
    // The gateway does not check the JWT (verify_jwt = false in config.toml), so this is the check.
    async verifyUser(jwt) {
      const { data, error } = await db.auth.getUser(jwt);
      return error || !data.user ? null : { id: data.user.id };
    },
  };
}

/** Builds the runtime once and reuses it. */
export function lazyModerationRuntime(): () => ModerationRuntime {
  let runtime: ModerationRuntime | undefined;
  return () => (runtime ??= createModerationRuntime());
}
