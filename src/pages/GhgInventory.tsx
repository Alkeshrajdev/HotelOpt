import { Link } from "react-router-dom";
import { ArrowLeft, Download, ShieldCheck, Info, Database, Cloud } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import {
  SCOPE1_BREAKDOWN, SCOPE2_METHODS, PORTFOLIO_SCOPE3_CATEGORIES,
} from "@/lib/mock";
import { CARBON, PORTFOLIO } from "@/lib/normalise";
import { useDataMode } from "@/lib/data/mode";
import { useProperties } from "@/lib/data/properties";
import { useTopbar } from "@/lib/topbarContext";
import { factorLabel, factorName, fmtT, usePropertyInventory, type Inventory, type InventoryLine } from "@/lib/data/carbon";

const PERIOD = "FY 2025 (1 Jan – 31 Dec 2025)";
const BASE_YEAR = 2019;

// Emission factors applied — provenance for the inventory (mirrors the EF library).
const EF_APPLIED = [
  { source: "Grid electricity — UAE",  value: "0.418 kgCO₂e/kWh", std: "IEA / national grid", version: "2026-Q2" },
  { source: "Grid electricity — other regions", value: "0.012–0.930 kgCO₂e/kWh", std: "IEA national grids", version: "2026-Q2" },
  { source: "Natural gas",             value: "2.020 kgCO₂e/m³",  std: "IPCC AR6",          version: "2026" },
  { source: "Diesel",                  value: "2.680 kgCO₂e/L",   std: "IPCC AR6",          version: "2026" },
  { source: "R-410A refrigerant",      value: "GWP 2,256",        std: "IPCC AR6 (100-yr)", version: "2026" },
];

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-ink-100 last:border-0">
      <span className="text-[12px] text-ink-500">{label}</span>
      <span className="text-[12px] font-medium text-ink-900 text-right">{value}</span>
    </div>
  );
}

function csvDownload(rows: (string | number)[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* =================================================================== */

export default function GhgInventory() {
  const mode = useDataMode();
  const { propertyId, propertyName, year } = useTopbar();
  const { properties } = useProperties();
  const property = properties.find((p) => p.id === propertyId) ?? null;
  const inv = usePropertyInventory(
    propertyId, year,
    { gridCode: property?.gridCode ?? null, country: property?.countryCode ?? null },
    mode === "live",
  );

  if (mode === "demo") return <DemoGhgInventory />;

  return (
    <div className="space-y-5">
      <Breadcrumb />
      <PageHeader
        title="GHG Inventory"
        actions={
          inv.data && inv.data.totals.gross > 0 ? (
            <button className="btn-primary" onClick={() => exportCsv(inv.data!, propertyName)}>
              <Download size={14} /> Export CSV
            </button>
          ) : undefined
        }
      />
      {inv.loading && <PageSkeleton />}
      {!inv.loading && inv.error && (
        <EmptyState icon={<Database size={20} />} title="Could not load the inventory" description={inv.error} />
      )}
      {!inv.loading && !inv.error && (!inv.data || inv.data.totals.gross === 0) && (
        <EmptyState
          icon={<Cloud size={20} />}
          title={`No approved emission data for ${propertyName} in ${year}/${String(year + 1).slice(2)}`}
          description="The inventory is built from approved consumption records and approved Scope 1 and 3 activity."
        />
      )}
      {!inv.loading && !inv.error && inv.data && inv.data.totals.gross > 0 && (
        <LiveGhgInventory inv={inv.data} propertyName={propertyName} rooms={property?.rooms ?? null} />
      )}
    </div>
  );
}

function Breadcrumb() {
  return (
    <div className="flex items-center text-[12px] text-ink-500 gap-1.5">
      <Link to="/reports" className="hover:text-brand-700 inline-flex items-center gap-1">
        <ArrowLeft size={12} /> Reports
      </Link>
      <span>/</span><span>GHG Inventory</span>
    </div>
  );
}

/* =================================================================== */
/* Live — one property, computed from approved records                  */
/* =================================================================== */

type Row = { scope: string; source: string; basis: string; tco2e: number; indent?: boolean; gap?: string; note?: string };

/** Basis in words: what was multiplied by what, and why a line is empty if it is. */
function basisOf(l: InventoryLine): string {
  const qty = l.quantity !== null ? ` · ${l.quantity.toLocaleString("en-US")} ${l.quantityUnit} × ${factorLabel(l.factor)}` : "";
  return `${l.basis}${qty}`;
}

function inventoryRows(inv: Inventory): Row[] {
  const rows: Row[] = [];
  const push = (scope: string) => (l: InventoryLine) =>
    rows.push({ scope, source: l.label, basis: basisOf(l), tco2e: l.tco2e, gap: l.gap, note: l.note });
  inv.scope1.forEach(push("Scope 1"));
  inv.scope2.forEach(push("Scope 2"));
  inv.scope3.filter((c) => c.tco2e > 0).forEach((c) => {
    rows.push({ scope: "Scope 3", source: c.label, basis: `${c.lines.length} ${c.lines.length === 1 ? "line" : "lines"} of approved activity data`, tco2e: c.tco2e });
    c.lines.forEach((l) => rows.push({
      scope: "Scope 3", source: l.label, indent: true, basis: basisOf(l), tco2e: l.tco2e, gap: l.gap, note: l.note,
    }));
  });
  return rows;
}

function periodLabel(year: number) {
  return `RY ${year}/${String(year + 1).slice(2)} (1 May ${year} – 30 Apr ${year + 1})`;
}

function exportCsv(inv: Inventory, propertyName: string) {
  const meta: (string | number)[][] = [
    ["GHG Inventory", propertyName],
    ["Reporting period", periodLabel(inv.year)],
    ["Organisational boundary", `${propertyName} · operational control`],
    ["Base year", "Not configured"],
    ["GWP set", "IPCC AR5, 100-year"],
    ["Standard", "GHG Protocol Corporate Standard"],
    ["Scope 2 method", "Location-based (market-based not modelled — no contractual instruments recorded)"],
    ["Basis", "Approved records only"],
    [],
    ["Scope", "Source / category", "Basis", "tCO2e", "% of gross"],
  ];
  const body = inventoryRows(inv).map((r) => [
    r.scope,
    (r.indent ? "    " : "") + r.source,
    [r.basis, r.note, r.gap].filter(Boolean).join(" — "),
    r.tco2e.toFixed(3),
    inv.totals.gross > 0 ? ((r.tco2e / inv.totals.gross) * 100).toFixed(1) : "0",
  ]);
  const totals: (string | number)[][] = [
    [],
    ["", "Scope 1", "", inv.totals.scope1.toFixed(3), ""],
    ["", "Scope 2 (location-based)", "", inv.totals.scope2Location.toFixed(3), ""],
    ["", "Scope 3 (Cat 1-7)", "", inv.totals.scope3.toFixed(3), ""],
    ["", "Total gross", "", inv.totals.gross.toFixed(3), "100"],
    ["", "Carbon intensity (Scope 1+2)", "kgCO2e/ORN", inv.intensityS1S2 !== null ? inv.intensityS1S2.toFixed(1) : "n/a", ""],
    ["", "Occupied room nights", "", inv.orn, ""],
    [],
    ["Categories reported as not applicable", "", "", "", ""],
    ...inv.notApplicable.map((c) => [c.label, c.reason ?? "", "", "", ""]),
    [],
    ["Factors applied", "Source", "Vintage", "Value", "Geography", "Grade"],
    ...inv.factorsApplied.map((f) => [
      factorName(f), f.source_name ?? "", f.factor_year_label ?? String(f.factor_year ?? ""),
      `${f.value} ${f.unit_numerator}/${f.unit_denominator}`, f.geo_code, f.reliability ?? "",
    ]),
  ];
  csvDownload([...meta, ...body, ...totals], `GHG-Inventory-${propertyName.replace(/\s+/g, "-")}-${inv.year}.csv`);
}

function LiveGhgInventory({ inv, propertyName, rooms }: { inv: Inventory; propertyName: string; rooms: number | null }) {
  const rows = inventoryRows(inv);
  const indicative = inv.provisionalFactors;
  const fullMonths = inv.coverage.energy.length === 12 && inv.coverage.water.length === 12 && inv.coverage.waste.length === 12;

  return (
    <>
      <div className="grid grid-cols-12 gap-4 items-stretch">
        <Card className="col-span-12 lg:col-span-7 flex flex-col">
          <CardHeader title="Reporting boundary & methodology" hint="GHG Protocol Corporate Standard" />
          <div className="px-5 pb-4 flex-1">
            <MetaRow label="Reporting entity" value={propertyName} />
            <MetaRow label="Reporting period" value={periodLabel(inv.year)} />
            <MetaRow label="Organisational boundary" value={rooms ? `${rooms.toLocaleString("en-US")} rooms · operational control` : "Operational control"} />
            <MetaRow label="Base year" value={<span className="text-ink-500">Not configured</span>} />
            <MetaRow label="GWP set" value="IPCC AR5 · 100-year" />
            <MetaRow label="Scope 2 method" value="Location-based only" />
            <MetaRow label="Offsets" value="None recorded — never netted into gross" />
          </div>
          <div className="mt-auto px-5 py-3 border-t border-ink-100 text-[11px] text-ink-500">
            Every figure is computed from approved records at load time. Submitted-but-unapproved data is excluded
            {inv.pending.count > 0
              ? ` (${inv.pending.count} ${inv.pending.count === 1 ? "row" : "rows"}, ${fmtT(inv.pending.tco2e)} tCO₂e held back)`
              : ""}.
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-5 flex flex-col">
          <CardHeader title="Assurance readiness" hint="What an auditor would ask for" />
          <div className="p-5 space-y-3 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <ShieldCheck size={16} className={fullMonths ? "text-good" : "text-warn"} />
              <span className="text-[13px] font-medium text-ink-900">
                {fullMonths ? "Twelve approved months on every pillar" : "Incomplete year"}
              </span>
              <Badge tone={fullMonths ? "good" : "warn"}>
                {inv.coverage.energy.length}/12 energy · {inv.coverage.water.length}/12 water · {inv.coverage.waste.length}/12 waste
              </Badge>
            </div>
            <div className="text-[12px] text-ink-500 leading-snug">
              {inv.coverage.activityRows.toLocaleString("en-US")} approved Scope 1 and 3 activity rows.
              Each line traces to an approved record, a library factor with a version, and the audit-log entry for its approval.
            </div>
            {indicative.length > 0 && (
              <div className="rounded-xl bg-warn/10 border border-warn/30 p-3 text-[11px] text-warn-700 leading-snug">
                {indicative.length} of the {inv.factorsApplied.length} factors applied are provisional or
                low-grade: {indicative.map((f) => factorName(f)).slice(0, 3).join(", ")}
                {indicative.length > 3 ? ` and ${indicative.length - 3} more` : ""}. Resolve these before
                seeking limited assurance.
              </div>
            )}
          </div>
          <div className="mt-auto px-5 py-3 border-t border-ink-100">
            <Link to="/admin/ef-library" className="text-[12px] font-semibold text-brand-700 hover:underline">
              View emission-factor library →
            </Link>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Emissions inventory" hint="Scope 1, 2 & 3 by source · tCO₂e · gross" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
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
                <tr key={i} className={r.indent ? "border-t border-ink-100 bg-ink-50/40" : "border-t border-ink-100"}>
                  <td className="table-td">
                    {!r.indent && (
                      <Badge tone={r.scope === "Scope 1" ? "warn" : r.scope === "Scope 2" ? "info" : "neutral"}>{r.scope}</Badge>
                    )}
                  </td>
                  <td className={r.indent ? "table-td pl-10 text-[12px] text-ink-700" : "table-td font-medium"}>{r.source}</td>
                  <td className="table-td text-ink-500 text-[12px]">
                    {r.basis}
                    {r.note && <div className="text-ink-400">{r.note}</div>}
                    {r.gap && <div className="text-warn-700">{r.gap}</div>}
                  </td>
                  <td className="table-td text-right tabular-nums">{fmtT(r.tco2e)}</td>
                  <td className="table-td text-right tabular-nums text-ink-500">
                    {((r.tco2e / inv.totals.gross) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ink-200 font-semibold">
                <td className="table-td" colSpan={3}>Scope 1 + 2 (location-based)</td>
                <td className="table-td text-right tabular-nums">{fmtT(inv.totals.s1s2)}</td>
                <td className="table-td text-right tabular-nums text-ink-500">{((inv.totals.s1s2 / inv.totals.gross) * 100).toFixed(1)}%</td>
              </tr>
              <tr className="font-semibold">
                <td className="table-td" colSpan={3}>Scope 3 (value chain, Cat 1–7)</td>
                <td className="table-td text-right tabular-nums">{fmtT(inv.totals.scope3)}</td>
                <td className="table-td text-right tabular-nums text-ink-500">{((inv.totals.scope3 / inv.totals.gross) * 100).toFixed(1)}%</td>
              </tr>
              <tr className="font-bold text-ink-900 bg-ink-50">
                <td className="table-td" colSpan={3}>Total gross emissions</td>
                <td className="table-td text-right tabular-nums">{fmtT(inv.totals.gross)}</td>
                <td className="table-td text-right tabular-nums">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="px-5 py-2.5 text-[11px] text-ink-400 border-t border-ink-100">
          {inv.intensityS1S2 !== null
            ? <>Carbon intensity (Scope 1+2): <strong className="text-ink-600">{inv.intensityS1S2.toFixed(1)} kgCO₂e/ORN</strong> over {inv.orn.toLocaleString("en-US")} occupied room nights.</>
            : <>No approved occupancy for the year, so intensity per ORN cannot be stated.</>}
          {" "}Scope 2 market-based is not reported — no RECs, PPAs or supplier-specific factors are recorded.
        </div>
      </Card>

      <div className="grid grid-cols-12 gap-4 items-stretch">
        <Card className="col-span-12 lg:col-span-7 flex flex-col">
          <CardHeader title="Emission factors applied" hint="Factor · standard · version · region" />
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-ink-50 text-left">
                  <th className="table-th">Factor</th>
                  <th className="table-th text-right">Value</th>
                  <th className="table-th">Source</th>
                  <th className="table-th">Geography</th>
                  <th className="table-th">Vintage</th>
                  <th className="table-th">Grade</th>
                </tr>
              </thead>
              <tbody>
                {inv.factorsApplied.map((f) => (
                  <tr key={f.id} className="border-t border-ink-100">
                    <td className="table-td font-medium">{factorName(f)}</td>
                    <td className="table-td text-right tabular-nums">{factorLabel(f)}</td>
                    <td className="table-td text-ink-600 text-[12px]">{f.source_name ?? "—"}</td>
                    <td className="table-td text-[12px]">{f.geo_code}</td>
                    <td className="table-td text-[11px]">{f.factor_year_label ?? f.factor_year ?? "—"}</td>
                    <td className="table-td text-[12px]">{f.reliability ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-5 flex flex-col">
          <CardHeader title="Not applicable" hint="Cat 8–15 · with the reason, as required" />
          <div className="p-5 space-y-2.5 flex-1">
            {inv.notApplicable.map((c) => (
              <div key={c.category} className="text-[12px] leading-snug pb-2 border-b border-ink-100 last:border-0">
                <span className="font-medium text-ink-900">{c.label}</span>
                <span className="text-ink-500"> — {c.reason}</span>
              </div>
            ))}
          </div>
          <div className="mt-auto px-5 py-3 border-t border-ink-100 flex items-start gap-2 text-[11px] text-ink-500">
            <Info size={13} className="mt-0.5 shrink-0 text-ink-400" />
            Stating why a category is excluded is part of the disclosure, not a gap in it.
          </div>
        </Card>
      </div>
    </>
  );
}

/* =================================================================== */
/* Demo — the illustrative portfolio report on the mock dataset         */
/* =================================================================== */

type DemoRow = { scope: string; source: string; tco2e: number; basis?: string };

function buildDemoRows(): DemoRow[] {
  const rows: DemoRow[] = [];
  SCOPE1_BREAKDOWN.forEach((s) => rows.push({ scope: "Scope 1", source: s.source, tco2e: s.tco2e, basis: s.note }));
  rows.push({ scope: "Scope 2", source: "Purchased electricity — location-based", tco2e: SCOPE2_METHODS.locationBased.tco2e, basis: "Avg. grid EF (mandatory disclosure)" });
  rows.push({ scope: "Scope 2", source: "Purchased electricity — market-based", tco2e: SCOPE2_METHODS.marketBased.tco2e, basis: "After RECs / green tariffs (memo)" });
  PORTFOLIO_SCOPE3_CATEGORIES.forEach((c) => rows.push({ scope: "Scope 3", source: c.category, tco2e: c.tco2e, basis: "Value chain" }));
  return rows;
}

function downloadDemoCsv() {
  const meta: (string | number)[][] = [
    ["GHG Inventory", "Hotel Optimizer portfolio"],
    ["Reporting period", PERIOD],
    ["Organisational boundary", "10 hotels · operational control"],
    ["Base year", BASE_YEAR],
    ["GWP set", "IPCC AR6, 100-year"],
    ["Standard", "GHG Protocol Corporate Standard"],
    [],
    ["Scope", "Source / category", "tCO2e", "Basis"],
  ];
  const body = buildDemoRows().map((r) => [r.scope, r.source, String(r.tco2e), r.basis ?? ""]);
  const totals: (string | number)[][] = [
    [],
    ["", "Scope 1 + 2 (location-based)", String(CARBON.s1s2), ""],
    ["", "Scope 3", String(CARBON.scope3), ""],
    ["", "Total (gross)", String(CARBON.total), ""],
    ["", "Carbon intensity", (CARBON.s1s2 * 1000 / PORTFOLIO.orn).toFixed(1), "kgCO2e/ORN (S1+2)"],
  ];
  csvDownload([...meta, ...body, ...totals], "GHG-Inventory-FY2025.csv");
}

function DemoGhgInventory() {
  const rows = buildDemoRows();
  const intensity = (CARBON.s1s2 * 1000) / PORTFOLIO.orn;

  return (
    <div className="space-y-5">
      <Breadcrumb />

      <PageHeader
        title="GHG Inventory"
        actions={
          <button className="btn-primary" onClick={downloadDemoCsv}>
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
          <table className="w-full text-sm">
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
            <table className="w-full text-sm">
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
