import { useEffect, useMemo, useState } from "react";
import { History, Plus, Search, Upload } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import StatTile from "@/components/ui/StatTile";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import AdminShell from "./AdminShell";
import { useDataMode } from "@/lib/data/mode";
import { listEFs, type EmissionFactor } from "@/lib/api";

type EfRow = {
  id: string;
  source: string;
  region: string;
  year: number;
  version: string;
  value: number;
  unit: string;
  scope: string;
  origin: string;
  active: boolean;
  versions: number;
};

// Demo rows — shown only when there is no live session.
const DEMO_EFS: EfRow[] = [
  { id: "ef-001", source: "Grid electricity",       region: "AE",     year: 2026, version: "2026-Q2",  value: 0.418, unit: "kgCO₂e/kWh", scope: "Scope 2", origin: "DEFRA", active: true,  versions: 4 },
  { id: "ef-002", source: "Grid electricity",       region: "ID",     year: 2026, version: "2026-Q2",  value: 0.770, unit: "kgCO₂e/kWh", scope: "Scope 2", origin: "ESDM",  active: true,  versions: 3 },
  { id: "ef-003", source: "Grid electricity",       region: "CA-BC", year: 2026, version: "2026-Q2",  value: 0.012, unit: "kgCO₂e/kWh", scope: "Scope 2", origin: "ECCC",  active: true,  versions: 5 },
  { id: "ef-004", source: "Natural gas",             region: "Global",year: 2026, version: "IPCC AR6", value: 2.020, unit: "kgCO₂e/m³",   scope: "Scope 1", origin: "IPCC",  active: true,  versions: 2 },
  { id: "ef-005", source: "Diesel",                  region: "Global",year: 2026, version: "IPCC AR6", value: 2.680, unit: "kgCO₂e/L",    scope: "Scope 1", origin: "IPCC",  active: true,  versions: 2 },
  { id: "ef-006", source: "R-410A refrigerant",     region: "Global",year: 2026, version: "IPCC AR6", value: 2088,  unit: "GWP",         scope: "Scope 1", origin: "IPCC",  active: true,  versions: 1 },
  { id: "ef-007", source: "Linen laundry — supplier",region: "IT",    year: 2026, version: "Supplier 2026", value: 0.92, unit: "kgCO₂e/kg", scope: "Scope 3 Cat 1", origin: "Aurora Linens Co.", active: true, versions: 2 },
  { id: "ef-008", source: "Grid electricity",       region: "AE",     year: 2025, version: "2025-Q4",  value: 0.432, unit: "kgCO₂e/kWh", scope: "Scope 2", origin: "DEFRA", active: false, versions: 4 },
];

const SOURCE_LABEL: Record<string, string> = {
  electricity_grid: "Grid electricity", natural_gas: "Natural gas", district_cooling: "District cooling", diesel: "Diesel", solar_pv: "Solar PV (on-site)",
};
/** Scope 3 rows show the category too, so "Scope 3 Cat 5" filters as its own bucket. */
function scopeLabel(r: EmissionFactor): string {
  if (r.scope === 3) return r.category ? `Scope 3 ${r.category.replace(/^cat/, "Cat ")}` : "Scope 3";
  return `Scope ${r.scope}`;
}

/** Library rows → table rows. "Versions" counts every row for the same source × region. */
function fromDb(rows: EmissionFactor[]): EfRow[] {
  const perKey = new Map<string, number>();
  const keyOf = (r: EmissionFactor) => `${r.factor_key ?? r.source_type}|${r.region ?? "GLOBAL"}`;
  rows.forEach((r) => perKey.set(keyOf(r), (perKey.get(keyOf(r)) ?? 0) + 1));
  return rows.map((r) => ({
    id: r.id,
    source: r.factor_key ?? SOURCE_LABEL[r.source_type ?? ""] ?? String(r.source_type),
    region: r.region ?? "GLOBAL",
    year: r.year,
    version: r.version,
    value: Number(r.ef_value),
    unit: r.ef_unit.replace("CO2e", "CO₂e"),
    scope: scopeLabel(r),
    origin: r.standard ?? (r.version.toUpperCase().startsWith("IPCC") ? "IPCC" : "Hotel Optimizer library"),
    active: r.is_active,
    versions: perKey.get(keyOf(r)) ?? 1,
  }));
}

export default function AdminEFLibrary() {
  const mode = useDataMode();
  const [rows, setRows] = useState<EfRow[]>(mode === "live" ? [] : DEMO_EFS);
  const [loading, setLoading] = useState(mode === "live");
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("all");
  const [region, setRegion] = useState("all");
  const [status, setStatus] = useState<"active" | "all" | "archived">("all");

  useEffect(() => {
    if (mode !== "live") { setRows(DEMO_EFS); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    listEFs()
      .then((r) => { if (!cancelled) setRows(fromDb(r)); })
      .catch((e: Error) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [mode]);

  const scopes = useMemo(() => Array.from(new Set(rows.map((r) => r.scope))).sort(), [rows]);
  const regions = useMemo(() => Array.from(new Set(rows.map((r) => r.region))).sort(), [rows]);

  const q = search.trim().toLowerCase();
  const filtered = rows.filter((e) =>
    (!q || [e.source, e.region, e.version, e.scope, e.origin].some((v) => v.toLowerCase().includes(q))) &&
    (scope === "all" || e.scope === scope) &&
    (region === "all" || e.region === region) &&
    (status === "all" || (status === "active" ? e.active : !e.active))
  );

  const active = rows.filter((r) => r.active).length;
  const sources = new Set(rows.map((r) => r.source)).size;

  return (
    <AdminShell
      eyebrow="Reference data"
      title="Emission factor library"
      subtitle="Versioned factors by region and year. Carbon in the performance views is consumption × the active factor for the property's country, with GLOBAL as the fallback."
      actions={
        <>
          <button className="btn-secondary"><Upload size={14} /> Import bulk</button>
          <button className="btn-primary"><Plus size={14} /> New EF</button>
        </>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Active EFs" value={String(active)} hint={`${rows.length} total`} />
        <StatTile label="Sources" value={String(sources)} hint="fuel and energy types" />
        <StatTile label="Regions covered" value={String(regions.length)} hint="incl. GLOBAL fallback" />
        <StatTile label="Archived" value={String(rows.length - active)} hint="kept for restatement" />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Search by source, region, version…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input max-w-[160px]" value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="all">All scopes</option>
          {scopes.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input max-w-[160px]" value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="all">All regions</option>
          {regions.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="input max-w-[160px]" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="all">Active and archived</option>
          <option value="active">Active only</option>
          <option value="archived">Archived only</option>
        </select>
      </div>

      <Card>
        <CardHeader title="Emission factors" hint={mode === "live" ? "Live library for this client" : "Sample library"} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Source</th>
                <th className="table-th">Scope</th>
                <th className="table-th">Region</th>
                <th className="table-th">Year</th>
                <th className="table-th">Version</th>
                <th className="table-th">Value</th>
                <th className="table-th">Origin</th>
                <th className="table-th">Versions</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={9} className="table-td text-ink-500">Loading emission factors…</td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={9} className="table-td text-bad-700">Could not load the library: {error}</td></tr>
              )}
              {!loading && !error && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-0">
                    <EmptyState inset icon={<Search size={20} />} title="No emission factors match" description="Try a different source, region or version." action={<button className="btn-secondary" onClick={() => { setSearch(""); setScope("all"); setRegion("all"); setStatus("all"); }}>Clear filters</button>} />
                  </td>
                </tr>
              )}
              {!loading && !error && filtered.map((e) => (
                <tr key={e.id} className="hover:bg-ink-50/60">
                  <td className="table-td font-medium">{e.source}</td>
                  <td className="table-td">{e.scope}</td>
                  <td className="table-td">{e.region}</td>
                  <td className="table-td tabular-nums">{e.year}</td>
                  <td className="table-td font-mono text-[11px]">{e.version}</td>
                  <td className="table-td tabular-nums">{e.value} <span className="text-[11px] text-ink-500">{e.unit}</span></td>
                  <td className="table-td">{e.origin}</td>
                  <td className="table-td">
                    <button className="btn-ghost h-7 px-2 text-[12px] text-brand-700">
                      <History size={11} /> {e.versions}
                    </button>
                  </td>
                  <td className="table-td">
                    <Badge tone={e.active ? "good" : "neutral"}>
                      {e.active ? "Active" : "Archived"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminShell>
  );
}
