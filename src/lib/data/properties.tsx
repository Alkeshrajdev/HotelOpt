/**
 * The property directory every page reads: live rows from Supabase, or the demo
 * portfolio. One shape (`RichProperty`) so the Properties pages, the top bar and
 * the capture forms don't care where a hotel came from.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { listProperties, type Property } from "@/lib/api";
import { PROPERTIES, type RichProperty } from "@/lib/propertiesData";
import { useDataMode, type DataMode } from "./mode";

export type PropertyLite = {
  id: string; name: string; shortName: string; region: string; country: string; countryCode: string | null; city: string;
  type: string; brand: string; rooms: number; gfa: number; currency: string; timezone: string; status: string;
  /** Sub-national grid or utility this site buys electricity from; resolved before the country factor. */
  gridCode: string | null; gridLabel: string | null;
};

const COUNTRY_NAME: Record<string, string> = {
  AE: "United Arab Emirates", SG: "Singapore", GB: "United Kingdom", PT: "Portugal", ES: "Spain", ZA: "South Africa", FR: "France", CH: "Switzerland", TH: "Thailand",
  ID: "Indonesia", CA: "Canada", US: "United States", IN: "India", AU: "Australia", DE: "Germany", IT: "Italy",
};

/** A live row rendered through the rich shape the configuration pages expect; unknowns get honest defaults. */
export function toRich(row: Property): RichProperty {
  const country = row.country ?? "";
  const gfa = Number(row.gfa_m2 ?? 0);
  return {
    id: row.id,
    name: row.name,
    brand: row.brand ?? "",
    client: "",
    region: row.region ?? "",
    country: COUNTRY_NAME[country] ?? country,
    city: row.city ?? "",
    address: row.city ?? "",
    latitude: row.latitude ?? 0,
    longitude: row.longitude ?? 0,
    timezone: row.timezone ?? "UTC",
    currency: row.currency ?? "USD",
    starRating: 4,
    rooms: row.rooms ?? 0,
    gfa,
    buildingYear: 0,
    fbOutlets: 0,
    fbCoversAnnual: 0,
    laundryType: "on-site",
    poolCount: 0,
    spaCount: 0,
    floors: 0,
    buildings: 1,
    conditionedArea: Math.round(gfa * 0.85),
    kitchens: 0,
    meetingSpaceM2: 0,
    parkingSpaces: 0,
    evChargers: 0,
    operatingSchedule: "Year-round · 24/7",
    onSitePvKwp: 0,
    climateZone: "",
    weatherStation: "",
    legalEntity: row.name,
    registrationNo: "",
    meters: [],
    operationType: row.type === "Resort" || row.type === "Ski Resort" ? "resort" : "full-service",
    ownership: "managed",
    baselineYear: 2024,
    reportingYear: 2025,
    enabledPillars: ["energy", "water", "waste", "carbon"],
    certifications: [],
    poolEligible: true,
    status: row.status === "active" ? "active" : row.status === "inactive" ? "inactive" : "onboarding",
    score: 0,
    dataCompleteness: 0,
    gpReady: false,
    certStatus: "pending",
    createdAt: row.created_at.slice(0, 10),
  };
}

const lite = (
  p: RichProperty,
  shortName?: string | null,
  type?: string | null,
  countryCode: string | null = null,
  grid: { code?: string | null; label?: string | null } = {},
): PropertyLite => ({
  id: p.id, name: p.name, shortName: shortName ?? p.name, region: p.region, country: p.country, countryCode, city: p.city,
  type: type ?? p.operationType, brand: p.brand, rooms: p.rooms, gfa: p.gfa, currency: p.currency, timezone: p.timezone, status: p.status,
  gridCode: grid.code ?? null, gridLabel: grid.label ?? null,
});

type Ctx = {
  mode: DataMode;
  loading: boolean;
  error: string | null;
  properties: PropertyLite[];
  rich: RichProperty[];
  byId: (id: string) => RichProperty | undefined;
  byName: (name: string) => PropertyLite | undefined;
  refresh: () => Promise<void>;
};

const PropertiesContext = createContext<Ctx | null>(null);

export function PropertiesProvider({ children }: { children: ReactNode }) {
  const mode = useDataMode();
  const [rows, setRows] = useState<Property[] | null>(null);
  const [loading, setLoading] = useState(mode === "live");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (mode !== "live") return;
    setLoading(true);
    try {
      setRows(await listProperties());
      setError(null);
    } catch (e) {
      setError((e as Error).message ?? "Could not load properties");
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => { void refresh(); }, [refresh]);

  const value = useMemo<Ctx>(() => {
    const rich: RichProperty[] = mode === "live" ? (rows ?? []).map(toRich) : PROPERTIES;
    const properties: PropertyLite[] = mode === "live"
      ? (rows ?? []).map((r) => lite(toRich(r), r.short_name, r.type, r.country, { code: r.grid_code, label: r.grid_label }))
      : PROPERTIES.map((p) => lite(p));
    return {
      mode, loading: mode === "live" && loading, error, properties, rich,
      byId: (id) => rich.find((p) => p.id === id),
      byName: (name) => properties.find((p) => p.name === name),
      refresh,
    };
  }, [mode, rows, loading, error, refresh]);

  return <PropertiesContext.Provider value={value}>{children}</PropertiesContext.Provider>;
}

export function useProperties(): Ctx {
  const ctx = useContext(PropertiesContext);
  if (!ctx) throw new Error("useProperties must be used within PropertiesProvider");
  return ctx;
}
