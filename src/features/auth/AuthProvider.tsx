import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";

type AuthContextValue = {
  session: Session | null;
};

// Stub until M4: no session handling yet.
const value: AuthContextValue = { session: null };

const AuthContext = createContext<AuthContextValue>(value);

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
