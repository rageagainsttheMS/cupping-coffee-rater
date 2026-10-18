import { placeDetails } from "../_shared/details.ts";
import { createHandler } from "../_shared/http.ts";
import { lazyRuntime } from "../_shared/runtime.ts";
import { detailsInputSchema } from "../_shared/schemas.ts";

const runtime = lazyRuntime();

Deno.serve(
  createHandler({
    inputSchema: detailsInputSchema,
    verifyUser: (jwt) => runtime().verifyUser(jwt),
    run: (input) => placeDetails(input, runtime()),
  }),
);
