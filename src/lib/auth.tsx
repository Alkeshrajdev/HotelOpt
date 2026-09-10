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
import type { Role } from "./nav";

/**
 * Who is signed in, as this front end understands it.
 *
 * The platform's access model (v2, `access.*`) has four assignable roles — Farnek Admin,
 * Portfolio access, Property access, Audit — plus a view-only flag. This front end's
 * screens gate on four of its own: maker, checker, property_sm and super_admin. The map
 * between them is here and nowhere else, so changing it changes every screen at once.
 */
export type Assignment = {
  role: "farnek_admin" | "portfolio_access" | "property_access" | "audit";
  hotelId: string | null;
  viewOnly: boolean;
};

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  /** This front end's role, derived from the platform's grants. */
  role: Role;
  /** The platform's own grants, for anything that needs the real answer. */
  assignments: Assignment[];
  isOperator: boolean;
  /** The client this person works inside, as the tenancy names it. */
  tenantName: string | null;
  /** The properties this person may reach. Empty for a platform operator off a hotel. */
  hotelIds: string[];
};

/**
 * The platform's grants → this front end's role.
 *
 *   Farnek Admin, Portfolio access       → super_admin   (the portfolio and admin areas)
 *   Property access                      → property_sm   (one hotel, in full)
 *   Property access, view only · Audit   → checker       (reads and reviews, enters nothing)
 *   anything else                        → maker
 */
export function roleFromAssignments(assignments: Assignment[]): Role {
  const active = assignments.filter((a) => !a.viewOnly);
  if (active.some((a) => a.role === "farnek_admin" || a.role === "portfolio_access")) return "super_admin";
  if (active.some((a) => a.role === "property_access")) return "property_sm";
  if (assignments.length > 0) return "checker";
  return "maker";
}

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** True when the session is the sample dataset rather than the platform. */
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInDemo: () => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// The sample dataset's session. Chosen on the sign-in page, remembered until sign-out.
const DEMO_SESSION = {
  user: { id: "demo", email: "maker@demo.test" },
} as unknown as Session;

const DEMO_PROFILE: Profile = {
  id: "demo",
  full_name: "Demo User",
  email: "demo@demo.test",
  role: "super_admin",
  assignments: [],
  isOperator: false,
  tenantName: "Acme Hotels",
  hotelIds: [],
};

const DEMO_KEY = "ho_demo";

function demoChosen(): boolean {
  try {
    return localStorage.getItem(DEMO_KEY) === "1";
  } catch {
    return false;
  }
}

async function loadProfile(uid: string): Promise<Profile | null> {
  const [profileResult, grantsResult, tenantsResult] = await Promise.all([
    supabase.schema("access").from("user_profiles").select("id,full_name,email,is_operator").eq("id", uid).maybeSingle(),
    supabase.schema("access").from("user_role_assignments").select("role,hotel_id,view_only,revoked_at,valid_to").eq("user_id", uid),
    supabase.schema("core").from("tenants").select("name").order("name"),
  ]);
  if (profileResult.error) throw profileResult.error;
  const row = profileResult.data as { id: string; full_name: string; email: string; is_operator: boolean } | null;
  if (!row) return null;

  const now = Date.now();
  const assignments: Assignment[] = ((grantsResult.data ?? []) as {
    role: Assignment["role"]; hotel_id: string | null; view_only: boolean;
    revoked_at: string | null; valid_to: string | null;
  }[])
    .filter((g) => g.revoked_at === null && (g.valid_to === null || new Date(g.valid_to).getTime() > now))
    .map((g) => ({ role: g.role, hotelId: g.hotel_id, viewOnly: g.view_only }));

  const tenants = (tenantsResult.data ?? []) as { name: string }[];
  const tenantName = tenants.length === 1 ? tenants[0].name : tenants.length > 1 ? `${tenants.length} clients` : null;

  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    role: row.is_operator ? "super_admin" : roleFromAssignments(assignments),
    assignments,
    isOperator: row.is_operator,
    tenantName,
    hotelIds: Array.from(new Set(assignments.map((a) => a.hotelId).filter((h): h is string => h !== null))),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const initialised = useRef(false);

  const refresh = useCallback(async (uid: string | undefined) => {
    if (!uid) {
      setProfile(null);
      return;
    }
    try {
      setProfile(await loadProfile(uid));
    } catch {
      // A profile that cannot be read is a signed-in person with no grants: the screens
      // treat them as a maker with nothing to reach, and say so, rather than crashing.
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (demoChosen()) {
      setIsDemo(true);
      setSession(DEMO_SESSION);
      setProfile(DEMO_PROFILE);
      setLoading(false);
      return;
    }

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      await refresh(s?.user.id);
      if (!initialised.current) {
        initialised.current = true;
        setLoading(false);
      }
    });

    const t = setTimeout(() => {
      if (!initialised.current) {
        initialised.current = true;
        setLoading(false);
      }
    }, 2500);

    return () => {
      clearTimeout(t);
      sub.subscription.unsubscribe();
    };
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      isDemo,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        // The same words for an unknown address and a wrong password: the form must not be
        // an oracle for which addresses hold accounts.
        return { error: error ? "That email address and password do not match an account." : null };
      },
      signInDemo: () => {
        try { localStorage.setItem(DEMO_KEY, "1"); } catch { /* storage refused: demo lasts the tab */ }
        setIsDemo(true);
        setSession(DEMO_SESSION);
        setProfile(DEMO_PROFILE);
      },
      signOut: async () => {
        try { localStorage.removeItem(DEMO_KEY); } catch { /* ignore */ }
        setIsDemo(false);
        setSession(null);
        setProfile(null);
        await supabase.auth.signOut();
      },
      refreshProfile: () => refresh(session?.user.id),
    }),
    [session, profile, loading, isDemo, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
