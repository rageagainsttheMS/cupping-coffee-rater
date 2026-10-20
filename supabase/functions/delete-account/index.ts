import { lazyAccountRuntime } from "../_shared/accountRuntime.ts";
import { deleteAccount, deleteAccountInputSchema } from "../_shared/deleteAccount.ts";
import { createHandler } from "../_shared/http.ts";

const runtime = lazyAccountRuntime();

// The person to delete is always the one the JWT belongs to, never an id from the request body.
Deno.serve(
  createHandler({
    inputSchema: deleteAccountInputSchema,
    verifyUser: (jwt) => runtime().verifyUser(jwt),
    run: (_input, user) => deleteAccount(user.id, runtime().store),
  }),
);
