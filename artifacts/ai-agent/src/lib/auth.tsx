import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";
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
  const [user, setUser] = useState<User | null>({
    id: "mock_user_id",
    email: "mock@example.com",
    created_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    role: "authenticated",
  } as User);
  const [session, setSession] = useState<Session | null>({
    access_token: "mock_token",
    token_type: "bearer",
    expires_in: 3600,
    refresh_token: "mock_refresh",
    user: {
      id: "mock_user_id",
      email: "mock@example.com",
      created_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      role: "authenticated",
    } as User,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Register token getter for the API client
    setAuthTokenGetter(async () => {
      return "mock_token";
    });
  }, []);

  const signOut = async () => {
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
