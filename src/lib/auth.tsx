import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Tables } from "./database.types";

export type Profile = Tables<"user_profiles">;

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const initialised = useRef(false);

  const loadProfile = useCallback(async (uid: string | undefined) => {
    if (!uid) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();
    setProfile(data ?? null);
  }, []);

  useEffect(() => {
    // Subscribing to onAuthStateChange — Supabase fires INITIAL_SESSION
    // synchronously on subscribe with the persisted session (or null).
    // This avoids the getSession() lock contention under StrictMode.
    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s);
        await loadProfile(s?.user.id);
        if (!initialised.current) {
          initialised.current = true;
          setLoading(false);
        }
      }
    );

    // Safety net: if for any reason no event fires within 1.5s, end loading
    // so the route can decide (likely → /login).
    const t = setTimeout(() => {
      if (!initialised.current) {
        initialised.current = true;
        setLoading(false);
      }
    }, 1500);

    return () => {
      clearTimeout(t);
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        return { error: error?.message ?? null };
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
      refreshProfile: () => loadProfile(session?.user.id),
    }),
    [session, profile, loading, loadProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
