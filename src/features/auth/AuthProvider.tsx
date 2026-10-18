import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { signOutOfGoogle } from "./googleAuth";

export type Profile = {
  display_name: string;
  accepted_terms_at: string | null;
};

type AuthContextValue = {
  /** The saved session has been read. Until then the app shows the splash screen. */
  sessionLoaded: boolean;
  session: Session | null;
  profile: Profile | null;
  profileLoaded: boolean;
  profileError: boolean;
  retryProfile: () => void;
  /** True after a password reset link has signed the person in, until they choose a new password. */
  passwordRecovery: boolean;
  startPasswordRecovery: () => void;
  finishPasswordRecovery: () => void;
  /** An error from a deep link (expired or used), shown once on the sign-in screen. */
  linkError: string | null;
  setLinkError: (message: string | null) => void;
  signOut: () => Promise<void>;
  /** Records that the signed-in person agreed to the terms (social sign-in). */
  acceptTerms: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });
    // Only set state in here. Calling Supabase from this callback can deadlock.
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setSessionLoaded(true);
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
      if (event === "SIGNED_OUT") setPasswordRecovery(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  const profileQuery = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    staleTime: Infinity,
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, accepted_terms_at")
        .eq("id", userId as string)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    await signOutOfGoogle();
    // Nothing from the last person should be visible to the next.
    queryClient.clear();
  }, [queryClient]);

  const acceptTerms = useCallback(async () => {
    if (!userId) return;
    const acceptedAt = new Date().toISOString();
    const { error } = await supabase
      .from("profiles")
      .update({ accepted_terms_at: acceptedAt })
      .eq("id", userId);
    if (error) throw error;
    queryClient.setQueryData<Profile>(["profile", userId], (old) =>
      old ? { ...old, accepted_terms_at: acceptedAt } : old,
    );
  }, [queryClient, userId]);

  const value = useMemo<AuthContextValue>(
    () => ({
      sessionLoaded,
      session,
      profile: profileQuery.data ?? null,
      profileLoaded: !!session && profileQuery.isSuccess,
      profileError: !!session && profileQuery.isError,
      retryProfile: () => void profileQuery.refetch(),
      passwordRecovery,
      startPasswordRecovery: () => setPasswordRecovery(true),
      finishPasswordRecovery: () => setPasswordRecovery(false),
      linkError,
      setLinkError,
      signOut,
      acceptTerms,
    }),
    [sessionLoaded, session, profileQuery, passwordRecovery, linkError, signOut, acceptTerms],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
