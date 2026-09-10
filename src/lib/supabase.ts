import { createClient } from "@supabase/supabase-js";

/**
 * The platform's database — the hotel-optimizer-v2 Supabase project.
 *
 * The URL and the publishable (anon) key identify the project; they are browser-safe by
 * design and every deployed bundle carries them. Row-level security is the protection,
 * not secrecy: an anonymous holder of this key reads nothing, and a signed-in person reads
 * exactly what their grants allow (v2's DEPLOYMENT.md says the same). The development
 * project is the default so a fresh clone and a preview deployment both talk to real
 * data; a VITE_ variable points a build at another project.
 *
 * Demo mode — the sample dataset with no database at all — is an explicit choice on the
 * sign-in page, never a fallback that happens because a variable was missing.
 */
const DEV_PROJECT_URL = "https://boskynpcooccraqzehrq.supabase.co";
const DEV_PROJECT_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvc2t5bnBjb29jY3JhcXplaHJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5NDU1MDEsImV4cCI6MjEwMzUyMTUwMX0.x43NisWTplUJkrYh6uuIJkSi2It3zuGTZPIc7qp8UA0";

const url: string = import.meta.env.VITE_SUPABASE_URL || DEV_PROJECT_URL;
const key: string = import.meta.env.VITE_SUPABASE_ANON_KEY || DEV_PROJECT_ANON_KEY;

/** True whenever a project is configured — which, with the defaults above, is always. */
export const SUPABASE_CONFIGURED = Boolean(url && key);

/**
 * Untyped deliberately. v2's schema is twenty-six schemas deep and its services already
 * know every table they touch; a generated type for one schema would be wrong for the
 * rest. The legacy `lib/api.ts` casts what it reads.
 */
export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
