/**
 * Live or demo. Live = real Supabase session; demo = the built-in dataset, no writes.
 * Every page that can work on real data asks this once and branches nowhere else.
 */
import { useAuth } from "@/lib/auth";
import { SUPABASE_CONFIGURED } from "@/lib/supabase";

export type DataMode = "live" | "demo";

export function useDataMode(): DataMode {
  const { session } = useAuth();
  return SUPABASE_CONFIGURED && session && session.user.id !== "demo" ? "live" : "demo";
}
