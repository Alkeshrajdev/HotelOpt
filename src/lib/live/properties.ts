import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PROPERTIES, type RichProperty } from "@/lib/propertiesData";
import { loadContextModel } from "@/services/context";
import { supabaseContextPorts } from "@/services/context/ports.supabase";
import { useDataMode } from "./mode";

/**
 * The properties this reader may reach, from the platform — `core.hotels` and the current
 * `core.hotel_profiles` row, under the reader's own session so row-level security answers
 * which hotels exist for them.
 *
 * The registry screen was drawn around a rich property record (brand, star rating, meters,
 * certifications, readiness). The platform holds the identity, the location and the
 * physical profile; the rest is either configured elsewhere in v2 or not held at all. What
 * the platform does not hold is left EMPTY — an empty string, zero, an empty list — never
 * borrowed from the sample dataset, so a live row never carries a sample hotel's
 * certificate or score.
 */
type HotelRow = {
  id: string;
  name: string;
  country: string;
  city: string | null;
  timezone: string;
  latitude: number | null;
  longitude: number | null;
  classification: string | null;
  hotel_type: string | null;
  control_type: string;
  boundary_from: string;
  boundary_to: string | null;
  created_at: string;
};

type ProfileRow = {
  hotel_id: string;
  rooms: number | null;
  gross_floor_area_m2: number | null;
  conditioned_area_m2: number | null;
  laundry_arrangement: string | null;
  outlets: number | null;
  pools: number | null;
  has_spa: boolean | null;
  opening_date: string | null;
  effective_from: string;
  effective_to: string | null;
};

const REGION_BY_COUNTRY: Record<string, RichProperty["region"]> = {
  AE: "MENA", SA: "MENA", QA: "MENA", OM: "MENA", BH: "MENA", KW: "MENA", EG: "MENA",
  GB: "EMEA", FR: "EMEA", DE: "EMEA", ES: "EMEA", IT: "EMEA", PT: "EMEA", CH: "EMEA", NL: "EMEA", DK: "EMEA",
  SG: "APAC", TH: "APAC", ID: "APAC", MY: "APAC", JP: "APAC", AU: "APAC", PH: "APAC", IN: "APAC",
  US: "Americas", CA: "Americas", MX: "Americas", BR: "Americas",
  ZA: "Africa", KE: "Africa", MA: "Africa",
};

function starsFrom(classification: string | null): number {
  const m = /(\d)/.exec(classification ?? "");
  return m ? Number(m[1]) : 0;
}

function toRichProperty(
  h: HotelRow,
  p: ProfileRow | undefined,
  tenantName: string,
  ctx: { latestMonth: string | null; latestStatus: string | null; openMonths: number } | undefined
): RichProperty {
  const laundry: RichProperty["laundryType"] =
    p?.laundry_arrangement === "outsourced" ? "outsourced" : p?.laundry_arrangement === "hybrid" ? "hybrid" : "on-site";
  return {
    id: h.id,
    name: h.name,
    brand: "",
    client: tenantName,
    region: REGION_BY_COUNTRY[h.country] ?? "EMEA",
    country: h.country,
    city: h.city ?? "",
    address: "",
    latitude: h.latitude ?? 0,
    longitude: h.longitude ?? 0,
    timezone: h.timezone,
    currency: "",
    starRating: starsFrom(h.classification),
    rooms: p?.rooms ?? 0,
    gfa: p?.gross_floor_area_m2 ?? 0,
    buildingYear: p?.opening_date ? Number(p.opening_date.slice(0, 4)) : 0,
    fbOutlets: p?.outlets ?? 0,
    fbCoversAnnual: 0,
    laundryType: laundry,
    poolCount: p?.pools ?? 0,
    spaCount: p?.has_spa ? 1 : 0,
    floors: 0,
    buildings: 0,
    conditionedArea: p?.conditioned_area_m2 ?? 0,
    kitchens: 0,
    meetingSpaceM2: 0,
    parkingSpaces: 0,
    evChargers: 0,
    operatingSchedule: "",
    onSitePvKwp: 0,
    climateZone: "",
    weatherStation: "",
    legalEntity: "",
    registrationNo: "",
    meters: [],
    operationType: h.hotel_type === "resort" ? "resort" : "full-service",
    ownership: h.control_type === "financial" ? "owned" : "managed",
    baselineYear: Number(h.boundary_from.slice(0, 4)),
    reportingYear: new Date().getFullYear(),
    enabledPillars: ["energy", "water", "waste", "carbon"],
    certifications: [],
    poolEligible: false,
    poolReason: "Comparator pools are assigned on the platform",
    status: h.boundary_to && new Date(h.boundary_to).getTime() < Date.now() ? "inactive" : ctx?.latestMonth ? "active" : "onboarding",
    score: 0,
    dataCompleteness: ctx?.latestMonth ? (ctx.openMonths === 0 ? 100 : Math.max(0, 100 - ctx.openMonths * 8)) : 0,
    gpReady: false,
    certStatus: "pending",
    createdAt: h.created_at.slice(0, 10),
  };
}

export type PropertiesState = {
  properties: RichProperty[];
  loading: boolean;
  /** Set when the platform could not be read; the screen says so and shows nothing invented. */
  error: string | null;
  mode: "live" | "sample";
};

async function loadLiveProperties(tenantName: string): Promise<RichProperty[]> {
  const [hotels, profiles, context] = await Promise.all([
    supabase.schema("core").from("hotels").select(
      "id,name,country,city,timezone,latitude,longitude,classification,hotel_type,control_type,boundary_from,boundary_to,created_at"
    ).order("name"),
    supabase.schema("core").from("hotel_profiles").select(
      "hotel_id,rooms,gross_floor_area_m2,conditioned_area_m2,laundry_arrangement,outlets,pools,has_spa,opening_date,effective_from,effective_to"
    ).is("effective_to", null),
    loadContextModel(supabaseContextPorts(supabase)),
  ]);
  if (hotels.error) throw hotels.error;
  if (profiles.error) throw profiles.error;
  const profileByHotel = new Map<string, ProfileRow>();
  for (const p of (profiles.data ?? []) as ProfileRow[]) profileByHotel.set(p.hotel_id, p);
  const ctxByHotel = new Map<string, { latestMonth: string | null; latestStatus: string | null; openMonths: number }>();
  for (const g of context.groups) for (const h of g.hotels) ctxByHotel.set(h.id, h);
  return ((hotels.data ?? []) as HotelRow[]).map((h) =>
    toRichProperty(h, profileByHotel.get(h.id), tenantName, ctxByHotel.get(h.id))
  );
}

let cache: { key: string; value: RichProperty[] } | null = null;

/** The registry: the platform's hotels when signed in, the sample dataset in the demo. */
export function useProperties(): PropertiesState {
  const mode = useDataMode();
  const [state, setState] = useState<{ value: RichProperty[] | null; error: string | null }>({
    value: cache?.value ?? null,
    error: null,
  });

  useEffect(() => {
    if (mode !== "live") return;
    let cancelled = false;
    const key = "live";
    if (cache?.key === key) {
      setState({ value: cache.value, error: null });
      return;
    }
    loadLiveProperties("").then(
      (value) => {
        if (cancelled) return;
        cache = { key, value };
        setState({ value, error: null });
      },
      (e: unknown) => {
        if (cancelled) return;
        setState({ value: [], error: e instanceof Error ? e.message : "the platform could not be read" });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [mode]);

  return useMemo(() => {
    if (mode === "sample") return { properties: PROPERTIES, loading: false, error: null, mode };
    return {
      properties: state.value ?? [],
      loading: state.value === null && state.error === null,
      error: state.error,
      mode,
    };
  }, [mode, state]);
}

/** Forget the cached registry — after a sign-out, or when a property was added. */
export function forgetProperties(): void {
  cache = null;
}
