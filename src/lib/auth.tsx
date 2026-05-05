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
import { supabase, SUPABASE_CONFIGURED } from "./supabase";
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

// Minimal demo session used when Supabase is not configured.
const DEMO_SESSION = {
  user: { id: "demo", email: "maker@demo.test" },
} as unknown as Session;

const DEMO_PROFILE = {
  id: "demo",
  client_id: "demo",
  full_name: "Demo User",
  email: "demo@demo.test",
  role: "super_admin",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
} as unknown as Profile;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const initialised = useRef(false);

  const loadProfile = useCallback(async (uid: string | undefined) => {
    if (!uid || !supabase) {
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
    // Demo mode: no Supabase credentials — skip auth entirely.
    if (!SUPABASE_CONFIGURED || !supabase) {
      setSession(DEMO_SESSION);
      setProfile(DEMO_PROFILE);
      setLoading(false);
      return;
    }

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
        if (!supabase) return { error: null };
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      signOut: async () => {
        if (!supabase) return;
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
