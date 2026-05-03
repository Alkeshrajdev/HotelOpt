import { History, Plus, Search, Upload } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import AdminShell from "./AdminShell";

const EFS = [
  { id: "ef-001", source: "Grid electricity",       region: "AE",     year: 2026, version: "2026-Q2",  value: 0.418, unit: "kgCO₂e/kWh", scope: "Scope 2", origin: "DEFRA", active: true,  versions: 4 },
  { id: "ef-002", source: "Grid electricity",       region: "ID",     year: 2026, version: "2026-Q2",  value: 0.770, unit: "kgCO₂e/kWh", scope: "Scope 2", origin: "ESDM",  active: true,  versions: 3 },
  { id: "ef-003", source: "Grid electricity",       region: "CA-BC", year: 2026, version: "2026-Q2",  value: 0.012, unit: "kgCO₂e/kWh", scope: "Scope 2", origin: "ECCC",  active: true,  versions: 5 },
  { id: "ef-004", source: "Natural gas",             region: "Global",year: 2026, version: "IPCC AR6", value: 2.020, unit: "kgCO₂e/m³",   scope: "Scope 1", origin: "IPCC",  active: true,  versions: 2 },
  { id: "ef-005", source: "Diesel",                  region: "Global",year: 2026, version: "IPCC AR6", value: 2.680, unit: "kgCO₂e/L",    scope: "Scope 1", origin: "IPCC",  active: true,  versions: 2 },
  { id: "ef-006", source: "R-410A refrigerant",     region: "Global",year: 2026, version: "IPCC AR6", value: 2088,  unit: "GWP",         scope: "Scope 1", origin: "IPCC",  active: true,  versions: 1 },
  { id: "ef-007", source: "Linen laundry — supplier",region: "IT",    year: 2026, version: "Supplier 2026", value: 0.92, unit: "kgCO₂e/kg", scope: "Scope 3 Cat 1", origin: "Aurora Linens Co.", active: true, versions: 2 },
  { id: "ef-008", source: "Grid electricity",       region: "AE",     year: 2025, version: "2025-Q4",  value: 0.432, unit: "kgCO₂e/kWh", scope: "Scope 2", origin: "DEFRA", active: false, versions: 4 },
];

export default function AdminEFLibrary() {
  return (
    <AdminShell
      eyebrow="Reference data"
      title="Emission factor library"
      subtitle="Versioned EFs by region and year. Audit-logged updates. Re-stating a prior period uses the EF active at submission, with the option to re-state under a current EF — both versions preserved for assurance."
      actions={
        <>
          <button className="btn-secondary"><Upload size={14} /> Import bulk</button>
          <button className="btn-primary"><Plus size={14} /> New EF</button>
        </>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="Active EFs"    value={String(EFS.filter((e) => e.active).length)} hint={`${EFS.length} total`} />
        <Tile label="Sources"        value="84"  hint="across regions" />
        <Tile label="Supplier-specific" value="36" hint="Cat 1 / 2 / 4" />
        <Tile label="Pending review" value="2"   hint="awaiting Super Admin" />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Search by source, region, version…" />
        </div>
        <select className="input max-w-[160px]"><option>All scopes</option></select>
        <select className="input max-w-[160px]"><option>All regions</option></select>
        <select className="input max-w-[160px]"><option>Active only</option></select>
      </div>

      <Card>
        <CardHeader title="Emission factors" hint="Locking a version freezes it for assurance" />
        <div className="overflow-x-auto">
          <table className="min-w-full">
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
              {EFS.map((e) => (
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

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4">
      <div className="text-[11px] uppercase tracking-wide font-semibold text-ink-500">{label}</div>
      <div className="text-2xl font-bold text-ink-900 mt-0.5">{value}</div>
      {hint && <div className="text-[11px] text-ink-500">{hint}</div>}
    </div>
  );
}
