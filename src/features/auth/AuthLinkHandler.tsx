import * as Linking from "expo-linking";
import { useEffect } from "react";
import { copy } from "@/lib/copy/en";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";
import { parseAuthLink } from "./authLinks";

/**
 * Listens for the links in confirmation and password reset emails (`coffeerater://auth-callback`,
 * `coffeerater://reset-password`) and turns them into a session. Renders nothing.
 */
export function AuthLinkHandler() {
  const { startPasswordRecovery, setLinkError } = useAuth();

  useEffect(() => {
    async function handle(url: string) {
      const link = parseAuthLink(url);
      if (link.kind === "unknown") return;

      if (link.error) {
        setLinkError(copy.auth.errors.linkInvalid);
        return;
      }

      let failed = false;
      if (link.code) {
        failed = !!(await supabase.auth.exchangeCodeForSession(link.code)).error;
      } else if (link.accessToken && link.refreshToken) {
        failed = !!(
          await supabase.auth.setSession({
            access_token: link.accessToken,
            refresh_token: link.refreshToken,
          })
        ).error;
      } else {
        return;
      }

      if (failed) setLinkError(copy.auth.errors.linkInvalid);
      else if (link.kind === "recovery") startPasswordRecovery();
    }

    Linking.getInitialURL().then((url) => {
      if (url) void handle(url);
    });
    const subscription = Linking.addEventListener("url", ({ url }) => void handle(url));
    return () => subscription.remove();
  }, [startPasswordRecovery, setLinkError]);

  return null;
}
