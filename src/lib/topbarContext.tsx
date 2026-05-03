import { createContext, useContext, useState, type ReactNode } from "react";

export type DataBasis =
  | "approved"
  | "approved+provisional"
  | "draft"
  | "pending";

export const DATA_BASIS_LABEL: Record<DataBasis, string> = {
  "approved":              "Approved only",
  "approved+provisional":  "Approved + provisional",
  "draft":                 "Draft only",
  "pending":               "Pending review",
};

export type TopbarState = {
  client:     string;
  property:   string;
  region:     string;
  period:     string;
  dataBasis:  DataBasis;
  lastRefreshed: Date;
};

type TopbarCtx = TopbarState & {
  setProperty:  (v: string) => void;
  setRegion:    (v: string) => void;
  setPeriod:    (v: string) => void;
  setDataBasis: (v: DataBasis) => void;
  /** Human-readable applied-context string for the page sub-line. */
  contextLine:  string;
};

const Ctx = createContext<TopbarCtx | null>(null);

export function TopbarProvider({ children }: { children: ReactNode }) {
  const [property,      setProperty]  = useState("All Properties (72)");
  const [region,        setRegion]    = useState("All Regions");
  const [period,        setPeriod]    = useState("May 2025 – Apr 2026");
  const [dataBasis,     setDataBasis] = useState<DataBasis>("approved");
  const [lastRefreshed]               = useState(new Date());

  const hhmm = lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const contextLine = [
    "Acme Hotels",
    region,
    property,
    period,
    DATA_BASIS_LABEL[dataBasis],
    `Last refreshed ${hhmm}`,
  ].join("  ·  ");

  return (
    <Ctx.Provider
      value={{
        client: "Acme Hotels",
        property,   setProperty,
        region,     setRegion,
        period,     setPeriod,
        dataBasis,  setDataBasis,
        lastRefreshed,
        contextLine,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useTopbar(): TopbarCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTopbar must be used within TopbarProvider");
  return ctx;
}
