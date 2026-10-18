import { createClient } from "@supabase/supabase-js";
import { createPlacesClient } from "./places.ts";
import { createCafeStore } from "./store.ts";
import type { CafeStore, PlacesClient } from "./types.ts";

export type Runtime = {
  store: CafeStore;
  places: PlacesClient;
  verifyUser: (jwt: string) => Promise<{ id: string } | null>;
};

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/**
 * Wires the real database and Google. Built on the first request, so a missing secret becomes a
 * generic 500 (logged on the server) instead of a function that will not start.
 */
export function createRuntime(): Runtime {
  const db = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    store: createCafeStore(db),
    places: createPlacesClient({
      apiKey: requireEnv("GOOGLE_PLACES_KEY"),
      fetch: (url, init) => fetch(url, init),
      // Lets local tests point at a mock instead of Google. Unset in production.
      baseUrl: Deno.env.get("GOOGLE_PLACES_BASE_URL") || undefined,
    }),
    // The gateway does not check the JWT (verify_jwt = false in config.toml), so this is the check.
    async verifyUser(jwt) {
      const { data, error } = await db.auth.getUser(jwt);
      return error || !data.user ? null : { id: data.user.id };
    },
  };
}

/** Builds the runtime once and reuses it. */
export function lazyRuntime(): () => Runtime {
  let runtime: Runtime | undefined;
  return () => (runtime ??= createRuntime());
}
