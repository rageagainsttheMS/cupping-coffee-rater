import { createClient } from "@supabase/supabase-js";
import { createAccountStore } from "./deleteAccount.ts";
import type { AccountStore } from "./deleteAccount.ts";

export type AccountRuntime = {
  store: AccountStore;
  verifyUser: (jwt: string) => Promise<{ id: string } | null>;
};

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/**
 * Wires the real database for account deletion. Separate from the Places runtime because this
 * function has no use for the Google key. Built on the first request, so a missing secret becomes a
 * generic 500 (logged on the server).
 */
export function createAccountRuntime(): AccountRuntime {
  const db = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    store: createAccountStore(db),
    // The gateway does not check the JWT (verify_jwt = false in config.toml), so this is the check.
    async verifyUser(jwt) {
      const { data, error } = await db.auth.getUser(jwt);
      return error || !data.user ? null : { id: data.user.id };
    },
  };
}

/** Builds the runtime once and reuses it. */
export function lazyAccountRuntime(): () => AccountRuntime {
  let runtime: AccountRuntime | undefined;
  return () => (runtime ??= createAccountRuntime());
}
