import { createHandler } from "../_shared/http.ts";
import { moderateUser, moderateUserInputSchema } from "../_shared/moderateUser.ts";
import { lazyModerationRuntime } from "../_shared/moderationRuntime.ts";

const runtime = lazyModerationRuntime();

// The moderator is always the one the JWT belongs to; moderateUser checks they have the role.
Deno.serve(
  createHandler({
    inputSchema: moderateUserInputSchema,
    verifyUser: (jwt) => runtime().verifyUser(jwt),
    run: (input, user) => moderateUser(input, user.id, runtime().store),
  }),
);
