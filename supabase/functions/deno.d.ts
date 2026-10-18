// Just enough of the Deno runtime for the app's TypeScript check to understand the Edge Functions.
// The functions themselves run on Supabase's Deno-based Edge Runtime, which provides the real thing.
declare const Deno: {
  serve(handler: (req: Request) => Response | Promise<Response>): unknown;
  env: { get(name: string): string | undefined };
};
