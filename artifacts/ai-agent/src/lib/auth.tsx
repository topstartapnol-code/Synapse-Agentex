import { createContext, useContext, useEffect, useState } from "react";
import { supabase, ensureSupabaseClient } from "./supabase";
import type { User, Session } from "@supabase/supabase-js";
import { setAuthTokenGetter } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function initAuth() {
      const client = await ensureSupabaseClient();

      // Register token getter for the API client
      setAuthTokenGetter(async () => {
        const { data } = await client.auth.getSession();
        return data.session?.access_token ?? null;
      });

      // Get initial session
      const { data: { session: initSession } } = await client.auth.getSession();
      setSession(initSession);
      setUser(initSession?.user ?? null);
      setLoading(false);

      // Listen for auth state changes (e.g. OAuth callback redirect)
      const { data: { subscription } } = client.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      });

      unsubscribe = () => subscription.unsubscribe();
    }

    initAuth().catch(() => setLoading(false));

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const client = await ensureSupabaseClient();
    await client.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
