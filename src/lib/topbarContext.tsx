import { createContext, useContext, useState, type ReactNode } from "react";

/* ─── Data basis ─────────────────────────────────────────────────────────── */
export type DataBasis =
  | "approved"
  | "approved+provisional"
  | "draft"
  | "pending";

export const DATA_BASIS_LABEL: Record<DataBasis, string> = {
  "approved":             "Approved only",
  "approved+provisional": "Approved + provisional",
  "draft":                "Draft only",
  "pending":              "Pending review",
};

/* ─── Period types ───────────────────────────────────────────────────────── */
export type PeriodType =
  | "year"          // single calendar year picker
  | "month-year"    // month + year (data capture / review)
  | "year-compare"  // primary year + comparison year (performance)
  | "ops"           // Day / Week / Month / Year / Custom (smart ops)
  | "none";         // no period control shown

export type OpsGranularity = "day" | "week" | "month" | "year" | "custom";

/* ─── Per-route topbar config ────────────────────────────────────────────── */
export type TopbarConfig = {
  periodType:    PeriodType;
  showProperty:  boolean;
  showRegion:    boolean;
  showDataBasis: boolean;
};

export function getTopbarConfig(pathname: string): TopbarConfig {
  if (pathname.startsWith("/performance"))
    return { periodType: "year-compare", showProperty: true,  showRegion: false, showDataBasis: false };
  if (pathname.startsWith("/portfolio/dashboard") || pathname === "/dashboard")
    return { periodType: "year",         showProperty: false, showRegion: true,  showDataBasis: true  };
  if (pathname.startsWith("/data-capture"))
    return { periodType: "month-year",   showProperty: true,  showRegion: false, showDataBasis: false };
  if (pathname.startsWith("/review-approval"))
    return { periodType: "month-year",   showProperty: true,  showRegion: false, showDataBasis: false };
  if (pathname.startsWith("/smart-ops"))
    return { periodType: "ops",          showProperty: true,  showRegion: false, showDataBasis: false };
  if (pathname.startsWith("/reports"))
    return { periodType: "year",         showProperty: false, showRegion: false, showDataBasis: true  };
  if (pathname.startsWith("/certifications"))
    return { periodType: "year",         showProperty: false, showRegion: false, showDataBasis: false };
  if (pathname.startsWith("/actions"))
    return { periodType: "year",         showProperty: true,  showRegion: false, showDataBasis: false };
  if (pathname.startsWith("/portfolio"))
    return { periodType: "year",         showProperty: false, showRegion: false, showDataBasis: false };
  // properties, billing, admin, marketplace, supplier, ai-assistant, guest-engagement
  return { periodType: "none", showProperty: false, showRegion: false, showDataBasis: false };
}

/* ─── Static option lists ────────────────────────────────────────────────── */
export const YEAR_OPTIONS = [2022, 2023, 2024, 2025, 2026];

export const MONTH_OPTIONS = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December",
];

/* ─── Context type ───────────────────────────────────────────────────────── */
type TopbarCtx = {
  // Year / month state
  year:              number;
  setYear:           (v: number) => void;
  month:             number;
  setMonth:          (v: number) => void;
  // Compare year (year-compare period type)
  compareYear:       number | null;
  setCompareYear:    (v: number | null) => void;
  // Smart-ops granularity
  opsGranularity:    OpsGranularity;
  setOpsGranularity: (v: OpsGranularity) => void;
  opsCustomStart:    string;
  setOpsCustomStart: (v: string) => void;
  opsCustomEnd:      string;
  setOpsCustomEnd:   (v: string) => void;
  // Context filters
  property:          string;
  setProperty:       (v: string) => void;
  region:            string;
  setRegion:         (v: string) => void;
  dataBasis:         DataBasis;
  setDataBasis:      (v: DataBasis) => void;
  // Computed helpers (backward compat)
  period:            string;
  lastRefreshed:     Date;
  contextLine:       string;
};

const Ctx = createContext<TopbarCtx | null>(null);

/* ─── Provider ───────────────────────────────────────────────────────────── */
export function TopbarProvider({ children }: { children: ReactNode }) {
  const now = new Date();

  const [year,           setYear]           = useState(2025);
  const [month,          setMonth]          = useState(now.getMonth() + 1);
  const [compareYear,    setCompareYear]    = useState<number | null>(2024);
  const [opsGranularity, setOpsGranularity] = useState<OpsGranularity>("month");
  const [opsCustomStart, setOpsCustomStart] = useState("2026-01-01");
  const [opsCustomEnd,   setOpsCustomEnd]   = useState("2026-05-31");
  const [property,       setProperty]       = useState("All Properties (72)");
  const [region,         setRegion]         = useState("All Regions");
  const [dataBasis,      setDataBasis]      = useState<DataBasis>("approved");
  const [lastRefreshed]                     = useState(new Date());

  const hhmm = lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // Computed period string for legacy consumers
  const period = `${MONTH_OPTIONS[month - 1]} ${year}`;

  const contextLine = [
    "Acme Hotels",
    region !== "All Regions" ? region : null,
    property !== "All Properties (72)" ? property : "All Properties",
    String(year),
    DATA_BASIS_LABEL[dataBasis],
    `Last refreshed ${hhmm}`,
  ].filter(Boolean).join("  ·  ");

  return (
    <Ctx.Provider value={{
      year,           setYear,
      month,          setMonth,
      compareYear,    setCompareYear,
      opsGranularity, setOpsGranularity,
      opsCustomStart, setOpsCustomStart,
      opsCustomEnd,   setOpsCustomEnd,
      property,       setProperty,
      region,         setRegion,
      dataBasis,      setDataBasis,
      period,
      lastRefreshed,
      contextLine,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTopbar(): TopbarCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTopbar must be used within TopbarProvider");
  return ctx;
}
