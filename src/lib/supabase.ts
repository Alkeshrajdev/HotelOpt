import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True when real Supabase credentials are available. False → demo mode. */
export const SUPABASE_CONFIGURED = Boolean(url && key);

/**
 * "Continue as Demo" sets this flag (see auth.tsx). While it is set the client must not
 * recover, persist or refresh a stored session — otherwise it retries token refreshes
 * against a backend the demo never talks to (hundreds of failed requests per session).
 * The client is created once per page load, and the auth flow already relies on a reload
 * between demo and a real sign-in, so reading the flag here is consistent with that model.
 */
const demoActive =
  typeof localStorage !== "undefined" && localStorage.getItem("ho_demo") === "1";

export const supabase = SUPABASE_CONFIGURED
  ? createClient<Database>(url, key, {
      auth: {
        persistSession: !demoActive,
        autoRefreshToken: !demoActive,
        detectSessionInUrl: !demoActive,
      },
    })
  : null;
