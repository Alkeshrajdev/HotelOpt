import { Link } from "react-router-dom";
import { ArrowLeft, Download, ShieldCheck, Info } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import {
  SCOPE1_BREAKDOWN, SCOPE2_METHODS, PORTFOLIO_SCOPE3_CATEGORIES,
} from "@/lib/mock";
import { CARBON, PORTFOLIO } from "@/lib/normalise";

const PERIOD = "FY 2025 (1 Jan – 31 Dec 2025)";
const BASE_YEAR = 2019;

// Emission factors applied — provenance for the inventory (mirrors the EF library).
const EF_APPLIED = [
  { source: "Grid electricity — UAE",  value: "0.418 kgCO₂e/kWh", std: "IEA / national grid", version: "2026-Q2" },
  { source: "Grid electricity — other regions", value: "0.012–0.770 kgCO₂e/kWh", std: "IEA national grids", version: "2026-Q2" },
  { source: "Natural gas",             value: "2.020 kgCO₂e/m³",  std: "IPCC AR6",          version: "2026" },
  { source: "Diesel",                  value: "2.680 kgCO₂e/L",   std: "IPCC AR6",          version: "2026" },
  { source: "R-410A refrigerant",      value: "GWP 2,088",        std: "IPCC AR6 (100-yr)", version: "2026" },
];

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

type Row = { scope: string; source: string; tco2e: number; basis?: string };

function buildRows(): Row[] {
  const rows: Row[] = [];
  SCOPE1_BREAKDOWN.forEach((s) => rows.push({ scope: "Scope 1", source: s.source, tco2e: s.tco2e, basis: s.note }));
  rows.push({ scope: "Scope 2", source: "Purchased electricity — location-based", tco2e: SCOPE2_METHODS.locationBased.tco2e, basis: "Avg. grid EF (mandatory disclosure)" });
  rows.push({ scope: "Scope 2", source: "Purchased electricity — market-based", tco2e: SCOPE2_METHODS.marketBased.tco2e, basis: "After RECs / green tariffs (memo)" });
  PORTFOLIO_SCOPE3_CATEGORIES.forEach((c) => rows.push({ scope: "Scope 3", source: c.category, tco2e: c.tco2e, basis: "Value chain" }));
  return rows;
}

function downloadCsv() {
  const meta = [
    ["GHG Inventory", "Hotel Optimizer portfolio"],
    ["Reporting period", PERIOD],
    ["Organisational boundary", "10 hotels · operational control"],
    ["Base year", String(BASE_YEAR)],
    ["GWP set", "IPCC AR6, 100-year"],
    ["Standard", "GHG Protocol Corporate Standard"],
    [],
    ["Scope", "Source / category", "tCO2e", "Basis"],
  ];
  const body = buildRows().map((r) => [r.scope, r.source, String(r.tco2e), r.basis ?? ""]);
  const totals = [
    [],
    ["", "Scope 1 + 2 (location-based)", String(CARBON.s1s2), ""],
    ["", "Scope 3", String(CARBON.scope3), ""],
    ["", "Total (gross)", String(CARBON.total), ""],
    ["", "Carbon intensity", (CARBON.s1s2 * 1000 / PORTFOLIO.orn).toFixed(1), "kgCO2e/ORN (S1+2)"],
  ];
  const rows = [...meta, ...body, ...totals];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "GHG-Inventory-FY2025.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-ink-100 last:border-0">
      <span className="text-[12px] text-ink-500">{label}</span>
      <span className="text-[12px] font-medium text-ink-900 text-right">{value}</span>
    </div>
  );
}

export default function GhgInventory() {
  const rows = buildRows();
  const intensity = (CARBON.s1s2 * 1000) / PORTFOLIO.orn;

  return (
    <div className="space-y-5">
      <div className="flex items-center text-[12px] text-ink-500 gap-1.5">
        <Link to="/reports" className="hover:text-brand-700 inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Reports
        </Link>
        <span>/</span><span>GHG Inventory</span>
      </div>

      <PageHeader
        title="GHG Inventory"
        actions={
          <button className="btn-primary" onClick={downloadCsv}>
            <Download size={14} /> Export CSV
          </button>
        }
      />

      {/* Audit metadata + assurance */}
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-7">
          <CardHeader title="Reporting boundary & methodology" hint="GHG Protocol Corporate Standard" />
          <div className="px-5 pb-4">
            <MetaRow label="Reporting period" value={PERIOD} />
            <MetaRow label="Organisational boundary" value="10 hotels · operational control" />
            <MetaRow label="Consolidation approach" value="Operational control" />
            <MetaRow label="Base year" value={BASE_YEAR} />
            <MetaRow label="GWP set" value="IPCC AR6 · 100-year" />
            <MetaRow label="Scope 2 method" value="Location-based (headline) + market-based (memo)" />
            <MetaRow label="Offsets" value="Reported separately — not netted into gross" />
          </div>
        </Card>
        <Card className="col-span-12 lg:col-span-5">
          <CardHeader title="Assurance" hint="Audit readiness" />
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-good" />
              <span className="text-[13px] font-medium text-ink-900">Limited assurance ready</span>
              <Badge tone="good">86% data confidence</Badge>
            </div>
            <div className="text-[12px] text-ink-500">
              Every line traces to approved source data, a versioned emission factor, and a calculation
              version. Re-stating a prior period uses the EF active in that period.
            </div>
            <Link to="/admin/ef-library" className="text-[12px] font-semibold text-brand-700 hover:underline">
              View emission-factor library →
            </Link>
          </div>
        </Card>
      </div>

      {/* Inventory table */}
      <Card>
        <CardHeader title="Emissions inventory" hint="Scope 1, 2 & 3 by source · tCO₂e · gross" />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-ink-50 text-left">
                <th className="table-th">Scope</th>
                <th className="table-th">Source / category</th>
                <th className="table-th">Basis</th>
                <th className="table-th text-right">tCO₂e</th>
                <th className="table-th text-right">% of gross</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-ink-100">
                  <td className="table-td"><Badge tone={r.scope === "Scope 1" ? "bad" : r.scope === "Scope 2" ? "warn" : "info"}>{r.scope}</Badge></td>
                  <td className="table-td font-medium">{r.source}</td>
                  <td className="table-td text-ink-500 text-[12px]">{r.basis}</td>
                  <td className="table-td text-right tabular-nums">{fmt(r.tco2e)}</td>
                  <td className="table-td text-right tabular-nums text-ink-500">{((r.tco2e / CARBON.total) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ink-200 font-semibold">
                <td className="table-td" colSpan={3}>Scope 1 + 2 (location-based)</td>
                <td className="table-td text-right tabular-nums">{fmt(CARBON.s1s2)}</td>
                <td className="table-td" />
              </tr>
              <tr className="font-semibold">
                <td className="table-td" colSpan={3}>Scope 3 (value chain)</td>
                <td className="table-td text-right tabular-nums">{fmt(CARBON.scope3)}</td>
                <td className="table-td" />
              </tr>
              <tr className="font-bold text-ink-900 bg-ink-50">
                <td className="table-td" colSpan={3}>Total gross emissions</td>
                <td className="table-td text-right tabular-nums">{fmt(CARBON.total)}</td>
                <td className="table-td text-right tabular-nums">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="px-5 py-2.5 text-[11px] text-ink-400 border-t border-ink-100">
          Carbon intensity (Scope 1+2): <strong className="text-ink-600">{intensity.toFixed(1)} kgCO₂e/ORN</strong>.
          Scope 2 market-based ({fmt(SCOPE2_METHODS.marketBased.tco2e)} tCO₂e) is a memo line — the location-based figure is the headline per GHG Protocol.
        </div>
      </Card>

      {/* EF provenance + offsets */}
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-7">
          <CardHeader title="Emission factors applied" hint="Source · standard · version" />
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-ink-50 text-left">
                  <th className="table-th">Source</th>
                  <th className="table-th">Factor</th>
                  <th className="table-th">Standard</th>
                  <th className="table-th">Version</th>
                </tr>
              </thead>
              <tbody>
                {EF_APPLIED.map((e) => (
                  <tr key={e.source} className="border-t border-ink-100">
                    <td className="table-td font-medium">{e.source}</td>
                    <td className="table-td tabular-nums">{e.value}</td>
                    <td className="table-td text-ink-600">{e.std}</td>
                    <td className="table-td font-mono text-[11px]">{e.version}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card className="col-span-12 lg:col-span-5">
          <CardHeader title="Offsets & instruments" hint="Reported separately from gross" />
          <div className="p-5 space-y-3 text-[13px]">
            <div className="flex items-center justify-between">
              <span className="text-ink-600">Scope 2 abatement (RECs / green tariffs)</span>
              <span className="font-semibold text-ink-900">{fmt(SCOPE2_METHODS.saving.tco2e)} tCO₂e</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-600">Renewable electricity coverage</span>
              <span className="font-semibold text-ink-900">{SCOPE2_METHODS.recCoverage.pct}%</span>
            </div>
            <div className="rounded-xl bg-ink-50 border border-ink-200 p-3 flex items-start gap-2 text-[11px] text-ink-500">
              <Info size={13} className="mt-0.5 shrink-0 text-ink-400" />
              Offsets and market instruments are disclosed alongside — never subtracted from — gross emissions, per GHG Protocol.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
