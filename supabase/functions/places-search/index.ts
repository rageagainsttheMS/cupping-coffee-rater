import { createHandler } from "../_shared/http.ts";
import { lazyRuntime } from "../_shared/runtime.ts";
import { searchInputSchema } from "../_shared/schemas.ts";
import { searchPlaces } from "../_shared/search.ts";

const runtime = lazyRuntime();

Deno.serve(
  createHandler({
    inputSchema: searchInputSchema,
    verifyUser: (jwt) => runtime().verifyUser(jwt),
    run: (input) => searchPlaces(input, runtime()),
  }),
);
