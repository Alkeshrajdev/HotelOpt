import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadOverviewModel, type OverviewModel } from "@/services/overview";
import { supabaseOverviewPorts } from "@/services/overview/ports.supabase";

/**
 * One hotel's overview, from v2's overview service — the same assembly the platform's own
 * screens use, run in the browser under the reader's session. Every figure in the result
 * was computed by the engine and rounded through its registry before it arrived here;
 * this hook computes nothing.
 */
export type OverviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; model: OverviewModel }
  | { status: "error"; message: string };

export function useHotelOverview(hotelId: string | null, trend: "energy" | "water" | "waste" = "energy"): OverviewState {
  const [state, setState] = useState<OverviewState>({ status: "idle" });

  useEffect(() => {
    if (!hotelId) {
      setState({ status: "idle" });
      return;
    }
    let cancelled = false;
    setState({ status: "loading" });
    loadOverviewModel(hotelId, "en", supabaseOverviewPorts(supabase, "en"), undefined, trend).then(
      (model) => {
        if (!cancelled) setState({ status: "ready", model });
      },
      (e: unknown) => {
        if (!cancelled) setState({ status: "error", message: e instanceof Error ? e.message : "the platform could not be read" });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [hotelId, trend]);

  return state;
}
