import { useState } from "react";
import { ChevronDown, Cloud, Database, Info } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import KpiTile from "@/components/ui/KpiTile";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import HBar from "@/components/charts/HBar";
import Pareto from "@/components/charts/Pareto";
import Sankey, { type SankeyLink, type SankeyNode } from "@/components/charts/Sankey";
import { LegendRow } from "@/components/charts/ChartBits";
import { HeroValue, ScopeDrilldown } from "@/components/dashboard/Drilldowns";
import { CHART } from "@/lib/chartPalette";
import { cn } from "@/lib/utils";
import { useDataMode } from "@/lib/data/mode";
import { useProperties } from "@/lib/data/properties";
import { useTopbar } from "@/lib/topbarContext";
import { CATEGORY_SHORT } from "@/lib/data/factors";
import {
  deltaPct, factorLabel, fmtT, reportingYearMonths, usePropertyInventory,
  type CategoryBlock, type Inventory, type InventoryLine,
} from "@/lib/data/carbon";

const SCOPE_COLOR = { 1: CHART.moss, 2: CHART.mauve, 3: CHART.blush } as const;
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function CarbonInventory() {
  const mode = useDataMode();
  const { propertyId, propertyName, year } = useTopbar();
  const { properties } = useProperties();
  const countryCode = properties.find((p) => p.id === propertyId)?.countryCode ?? null;
  const inv = usePropertyInventory(propertyId, year, countryCode, mode === "live");

  if (mode === "demo") return <DemoInventory />;
  if (inv.loading) return <PageSkeleton />;
  if (inv.error) return <EmptyState icon={<Database size={20} />} title="Could not load the inventory" description={inv.error} />;
  if (!inv.data || inv.data.totals.gross === 0) {
    return (
      <EmptyState
        icon={<Cloud size={20} />}
        title={`No approved emission data for ${propertyName} in ${year}/${String(year + 1).slice(2)}`}
        description="The inventory is built from approved consumption records and approved Scope 1 and 3 activity. Capture and approve a month and it fills in."
      />
    );
  }
  return <LiveInventory inv={inv.data} />;
}

/* =================================================================== */
/* Live                                                                 */
/* =================================================================== */

function LiveInventory({ inv }: { inv: Inventory }) {
  const [open, setOpen] = useState<string | null>(null);
  const t = inv.totals;
  const computed = inv.scope3.filter((c) => c.tco2e > 0);

  const nodes: SankeyNode[] = [
    ...inv.scope1.filter((l) => l.tco2e > 0).map((l) => ({ id: l.key, label: shortLabel(l.label), column: 0, color: SCOPE_COLOR[1] })),
    ...inv.scope2.filter((l) => l.tco2e > 0).map((l) => ({ id: l.key, label: shortLabel(l.label), column: 0, color: SCOPE_COLOR[2] })),
    ...computed.map((c) => ({ id: c.category, label: CATEGORY_SHORT[c.category] ?? c.label, column: 0, color: SCOPE_COLOR[3] })),
    { id: "scope1", label: "Scope 1", column: 1, color: SCOPE_COLOR[1], sub: "direct" },
    { id: "scope2", label: "Scope 2", column: 1, color: SCOPE_COLOR[2], sub: "location-based" },
    { id: "scope3", label: "Scope 3", column: 1, color: SCOPE_COLOR[3], sub: "value chain" },
    { id: "gross", label: "Gross emissions", column: 2, color: CHART.olive },
  ].filter((n) => n.column !== 1 || scopeTotal(t, n.id) > 0);

  const links: SankeyLink[] = [
    ...inv.scope1.filter((l) => l.tco2e > 0).map((l) => ({ source: l.key, target: "scope1", value: l.tco2e, color: SCOPE_COLOR[1] })),
    ...inv.scope2.filter((l) => l.tco2e > 0).map((l) => ({ source: l.key, target: "scope2", value: l.tco2e, color: SCOPE_COLOR[2] })),
    ...computed.map((c) => ({ source: c.category, target: "scope3", value: c.tco2e, color: SCOPE_COLOR[3] })),
    { source: "scope1", target: "gross", value: t.scope1, color: SCOPE_COLOR[1] },
    { source: "scope2", target: "gross", value: t.scope2Location, color: SCOPE_COLOR[2] },
    { source: "scope3", target: "gross", value: t.scope3, color: SCOPE_COLOR[3] },
  ].filter((l) => l.value > 0);

  return (
    <div className="space-y-5">
      {inv.pending.count > 0 && (
        <div className="rounded-xl bg-warn/10 border border-warn/30 p-3 flex items-start gap-2.5">
          <Info size={16} className="text-warn-700 mt-0.5 shrink-0" />
          <div className="text-[13px] text-warn-700">
            <strong>{inv.pending.count} captured {inv.pending.count === 1 ? "row" : "rows"} worth {fmtT(inv.pending.tco2e)} tCO₂e</strong>
            {inv.pending.count === 1 ? " is" : " are"} awaiting approval and {inv.pending.count === 1 ? "is" : "are"} excluded from every
            figure below. The inventory counts approved data only.
          </div>
        </div>
      )}

      {/* KpiTile's hint line shows the delta, falling back to the caption in a property's
          first reporting year, when there is no prior year to compare against. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiTile
          icon={<Cloud size={18} />} iconBg="bg-pillar-carbon/10 text-pillar-carbon"
          label="Scope 1 — direct" value={fmtT(t.scope1)} unit="tCO₂e"
          delta={inv.prior ? deltaPct(t.scope1, inv.prior.scope1) : undefined}
          caption="Combustion on site + refrigerant"
        />
        <KpiTile
          icon={<Cloud size={18} />} iconBg="bg-info/10 text-info-700"
          label="Scope 2 — location" value={fmtT(t.scope2Location)} unit="tCO₂e"
          delta={inv.prior ? deltaPct(t.scope2Location, inv.prior.scope2Location) : undefined}
          caption="Purchased electricity & cooling"
        />
        <KpiTile
          icon={<Cloud size={18} />} iconBg="bg-brand-50 text-brand-700"
          label="Scope 3 — value chain" value={fmtT(t.scope3)} unit="tCO₂e"
          delta={inv.prior ? deltaPct(t.scope3, inv.prior.scope3) : undefined}
          caption={`${computed.length} of 15 categories calculated`}
        />
        <KpiTile
          prominent
          icon={<Cloud size={18} />} iconBg="bg-pillar-carbon/10 text-pillar-carbon"
          label="Gross total" value={fmtT(t.gross)} unit="tCO₂e"
          delta={inv.prior ? deltaPct(t.gross, inv.prior.gross) : undefined}
          caption={inv.intensityGross !== null ? `${inv.intensityGross.toFixed(1)} kgCO₂e / ORN` : "No approved ORN — intensity unavailable"}
        />
      </div>

      <div className="grid grid-cols-12 gap-4 items-stretch">
        <Card className="col-span-12 xl:col-span-7 flex flex-col">
          <CardHeader title="How the inventory is built" hint="Source → scope → gross · tCO₂e" />
          <div className="px-3 pt-2 flex-1">
            <Sankey nodes={nodes} links={links} height={360} unit="t" labelWidth={168} format={(v) => fmtT(v)} />
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 flex items-center justify-between gap-3 text-[11px] text-ink-500">
            <LegendRow items={[{ label: "Scope 1", color: SCOPE_COLOR[1] }, { label: "Scope 2", color: SCOPE_COLOR[2] }, { label: "Scope 3", color: SCOPE_COLOR[3] }]} />
            <span>Every band is consumption or activity × a library factor. No band is an estimate of the total.</span>
          </div>
        </Card>

        <Card className="col-span-12 xl:col-span-5 flex flex-col">
          <CardHeader title="Scope 3 — the few that make 80%" hint="Categories ranked · line = cumulative share" />
          <div className="px-3 pt-3 flex-1">
            <Pareto
              height={268} unit="t" format={(v) => fmtT(v)}
              items={computed.map((c) => ({
                id: c.category,
                // Seven ranked bars in a narrow card: the axis carries the number only,
                // and the table below spells every category out in full.
                label: `Cat ${c.category.replace("cat", "")}`,
                value: c.tco2e,
                color: c.category === "cat1" ? CHART.olive : CHART.moss,
              }))}
            />
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 text-[11px] text-ink-500">
            Scope 3 is {t.gross > 0 ? ((t.scope3 / t.gross) * 100).toFixed(0) : "0"}% of the gross inventory.
            {" "}{inv.scope3.filter((c) => c.lines.some((l) => l.factor?.standard?.includes("indicative"))).length > 0
              ? "Spend-based lines use indicative EEIO factors — replace them with supplier data before assurance."
              : "Every line carries a versioned factor."}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-12 gap-4 items-stretch">
        <Card className="col-span-12 xl:col-span-7 flex flex-col">
          <CardHeader title="Scope 1 & 2 by source" hint="Metered consumption × the factor for this property's country" />
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-ink-50 text-left">
                  <th className="table-th">Source</th>
                  <th className="table-th">Scope</th>
                  <th className="table-th text-right">Quantity</th>
                  <th className="table-th text-right">Factor</th>
                  <th className="table-th text-right">tCO₂e</th>
                </tr>
              </thead>
              <tbody>
                {[...inv.scope1, ...inv.scope2].map((l) => (
                  <tr key={l.key} className="border-t border-ink-100">
                    <td className="table-td font-medium">{l.label}</td>
                    <td className="table-td"><Badge tone={l.scope === 1 ? "warn" : "info"}>Scope {l.scope}</Badge></td>
                    <td className="table-td text-right tabular-nums">
                      {l.quantity !== null ? `${l.quantity.toLocaleString("en-US")} ${l.quantityUnit}` : "—"}
                    </td>
                    <td className="table-td text-right tabular-nums text-[12px] text-ink-500">{factorLabel(l.factor)}</td>
                    <td className="table-td text-right tabular-nums font-semibold">{fmtT(l.tco2e)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-ink-200 font-semibold bg-ink-50">
                  <td className="table-td" colSpan={4}>Scope 1 + 2 (location-based)</td>
                  <td className="table-td text-right tabular-nums">{fmtT(t.s1s2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="mt-auto px-6 py-4 border-t border-ink-100 text-[11px] text-ink-500">
            {inv.intensityS1S2 !== null && (
              <>Intensity <strong className="text-ink-700">{inv.intensityS1S2.toFixed(1)} kgCO₂e/ORN</strong> over {inv.orn.toLocaleString("en-US")} occupied room nights. </>
            )}
            Scope 2 market-based is not reported: no contractual instruments (RECs, PPAs, supplier factors) are recorded for this property,
            so there is nothing to state other than the location-based figure.
          </div>
        </Card>

        {/* Paired with a four-row table, so this card stays comparably shallow; the
            twenty-odd factor rows get their own full-width table further down. */}
        <Card className="col-span-12 xl:col-span-5 flex flex-col">
          <CardHeader title="Data behind the inventory" hint="Approved months and rows · nothing else counts" />
          <div className="p-5 flex-1 flex flex-col gap-4">
            <Coverage inv={inv} />
            <div className="mt-auto grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-ink-50 p-3">
                <div className="text-[11px] uppercase tracking-[0.06em] font-semibold text-ink-400">Activity rows</div>
                <div className="text-stat font-bold text-ink-900 tabular-nums leading-none mt-1.5">{inv.coverage.activityRows.toLocaleString("en-US")}</div>
                <div className="text-[11px] text-ink-500 mt-1">approved Scope 1 & 3</div>
              </div>
              <div className="rounded-xl bg-ink-50 p-3">
                <div className="text-[11px] uppercase tracking-[0.06em] font-semibold text-ink-400">Factors applied</div>
                <div className="text-stat font-bold text-ink-900 tabular-nums leading-none mt-1.5">{inv.factorsApplied.length}</div>
                <div className="text-[11px] text-ink-500 mt-1">library rows, versioned</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Scope 3 by category" hint="Click a category for the lines behind it" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ink-50 text-left">
                <th className="table-th">Category</th>
                <th className="table-th">Status</th>
                <th className="table-th">Share of Scope 3</th>
                <th className="table-th text-right">tCO₂e</th>
                <th className="table-th w-10" />
              </tr>
            </thead>
            <tbody>
              {inv.scope3.map((c) => (
                <CategoryRow
                  key={c.category}
                  block={c}
                  scope3Total={t.scope3}
                  open={open === c.category}
                  onToggle={() => setOpen(open === c.category ? null : c.category)}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ink-200 font-semibold bg-ink-50">
                <td className="table-td" colSpan={3}>Scope 3 total (Cat 1–7)</td>
                <td className="table-td text-right tabular-nums">{fmtT(t.scope3)}</td>
                <td className="table-td" />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="Factors applied" hint={`${inv.factorsApplied.length} library rows produced the figures above`} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ink-50 text-left">
                <th className="table-th">Factor</th>
                <th className="table-th">Scope</th>
                <th className="table-th text-right">Value</th>
                <th className="table-th">Standard</th>
                <th className="table-th">Region</th>
                <th className="table-th">Version</th>
              </tr>
            </thead>
            <tbody>
              {inv.factorsApplied.map((f) => (
                <tr key={f.id} className="border-t border-ink-100">
                  <td className="table-td font-medium">{f.factor_key ?? f.source_type}</td>
                  <td className="table-td">
                    <Badge tone={f.scope === 1 ? "warn" : f.scope === 2 ? "info" : "neutral"}>
                      {f.scope === 3 && f.category ? `S3 ${f.category.replace("cat", "Cat ")}` : `Scope ${f.scope}`}
                    </Badge>
                  </td>
                  <td className="table-td text-right tabular-nums">{factorLabel(f)}</td>
                  <td className="table-td text-[12px] text-ink-600">{f.standard ?? "—"}</td>
                  <td className="table-td text-[12px]">{f.region ?? "GLOBAL"}</td>
                  <td className="table-td font-mono text-[11px]">{f.version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="Categories reported as not applicable" hint="Cat 8–15 · the reason is itself a disclosure" />
        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3">
          {inv.notApplicable.map((c) => (
            <div key={c.category} className="flex items-start gap-2.5 py-1.5 border-b border-ink-100 last:border-0 lg:[&:nth-last-child(2)]:border-0">
              <Badge tone="neutral" className="mt-0.5 shrink-0">N/A</Badge>
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-ink-900">{c.label}</div>
                <div className="text-[12px] text-ink-500 leading-snug">{c.reason}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 flex items-start gap-2.5">
        <Info size={16} className="text-brand-700 mt-0.5 shrink-0" />
        <div className="text-[13px] text-brand-900">
          Utility lines are recalculated from the factor library on every load; activity lines keep the factor applied when they were
          captured, so a restatement can show both. GWP set is IPCC AR6 (100-year).
        </div>
      </div>
    </div>
  );
}

/** Month cells per pillar — a filled cell is an approved month, and the gap sits where it really is. */
function Coverage({ inv }: { inv: Inventory }) {
  const months = reportingYearMonths(inv.year);
  const rows = [
    { label: "Energy", have: inv.coverage.energy },
    { label: "Water", have: inv.coverage.water },
    { label: "Waste", have: inv.coverage.waste },
  ];
  return (
    <div className="space-y-2">
      <div className="text-[11px] uppercase tracking-[0.06em] font-semibold text-ink-400">Approved months in {inv.year}/{String(inv.year + 1).slice(2)}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2.5">
          <span className="w-12 shrink-0 text-[12px] text-ink-600">{r.label}</span>
          <div className="flex-1 flex gap-[3px]">
            {months.map(({ ym, month }) => {
              const approved = r.have.includes(ym);
              return (
                <span
                  key={ym}
                  title={`${MONTH_SHORT[month - 1]} — ${approved ? "approved" : "not approved"}`}
                  className={cn("h-3 flex-1 rounded-[2px]", approved ? "bg-chart-olive" : "bg-ink-100")}
                />
              );
            })}
          </div>
          <span className="w-9 text-right text-[12px] tabular-nums text-ink-600">{r.have.length}/12</span>
        </div>
      ))}
    </div>
  );
}

function CategoryRow({ block, scope3Total, open, onToggle }: { block: CategoryBlock; scope3Total: number; open: boolean; onToggle: () => void }) {
  const share = scope3Total > 0 ? (block.tco2e / scope3Total) * 100 : 0;
  const hasLines = block.lines.length > 0;
  return (
    <>
      <tr
        className={cn("border-t border-ink-100", hasLines && "hover:bg-ink-50/60 cursor-pointer")}
        onClick={hasLines ? onToggle : undefined}
      >
        <td className="table-td font-medium">{block.label}</td>
        <td className="table-td">
          {block.status === "computed"
            ? <Badge tone="good">{block.lines.length} {block.lines.length === 1 ? "line" : "lines"}</Badge>
            : <Badge tone="neutral">No data</Badge>}
        </td>
        <td className="table-td">
          <div className="flex items-center gap-2.5">
            <div className="w-28 h-2 bg-ink-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-chart-blush" style={{ width: `${Math.min(100, share)}%` }} />
            </div>
            <span className="text-[12px] tabular-nums text-ink-500 w-10">{share.toFixed(1)}%</span>
          </div>
        </td>
        <td className="table-td text-right tabular-nums font-semibold">{block.tco2e > 0 ? fmtT(block.tco2e) : "—"}</td>
        <td className="table-td text-right">
          {hasLines && <ChevronDown size={14} className={cn("text-ink-400 transition-transform duration-150", open && "rotate-180")} />}
        </td>
      </tr>
      {open && block.lines.map((l) => <LineRow key={l.key} line={l} />)}
      {!hasLines && (
        <tr className="border-t border-ink-100 bg-ink-50/40">
          <td className="table-td text-[12px] text-ink-500" colSpan={5}>{block.reason}</td>
        </tr>
      )}
    </>
  );
}

function LineRow({ line }: { line: InventoryLine }) {
  return (
    <tr className="border-t border-ink-100 bg-ink-50/40">
      <td className="table-td pl-10 text-[12px] text-ink-700">{line.label}</td>
      <td className="table-td text-[12px] text-ink-500" colSpan={2}>
        {line.basis}
        {line.quantity !== null && <span className="tabular-nums"> · {line.quantity.toLocaleString("en-US")} {line.quantityUnit} × {factorLabel(line.factor)}</span>}
        {line.gap && <span className="text-warn-700"> · {line.gap}</span>}
      </td>
      <td className="table-td text-right tabular-nums text-[12px]">{fmtT(line.tco2e)}</td>
      <td className="table-td" />
    </tr>
  );
}

const shortLabel = (s: string) => s.replace(/ — .*$/, "");
const scopeTotal = (t: Inventory["totals"], id: string) =>
  id === "scope1" ? t.scope1 : id === "scope2" ? t.scope2Location : id === "scope3" ? t.scope3 : 1;

/* =================================================================== */
/* Demo — the illustrative view the mock dataset renders                */
/* =================================================================== */

type ScopeKey = null | 1 | 2 | 3;

function DemoInventory() {
  const [drill, setDrill] = useState<ScopeKey>(null);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiTile
          icon={<Cloud size={18} />} iconBg="bg-pillar-carbon/10 text-pillar-carbon"
          label="Scope 1" value="3,428" unit="tCO₂e" delta={-3.1}
          onClick={() => setDrill(1)}
        />
        <KpiTile
          icon={<Cloud size={18} />} iconBg="bg-info/10 text-info"
          label="Scope 2 — location" value="14,569" unit="tCO₂e" delta={-7.4}
          onClick={() => setDrill(2)}
        />
        <KpiTile
          icon={<Cloud size={18} />} iconBg="bg-info/10 text-info-700"
          label="Scope 2 — market" value="12,400" unit="tCO₂e" delta={-12.1}
          onClick={() => setDrill(2)}
        />
        <KpiTile
          icon={<Cloud size={18} />} iconBg="bg-pillar-carbon/10 text-pillar-carbon"
          label="Scope 3 (Cat 1–7)" value="24,853" unit="tCO₂e" delta={-2.2}
          onClick={() => setDrill(3)}
        />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-5">
          <CardHeader title="Scope 3 by category" hint="% of Scope 3 inventory" />
          <div className="p-6">
            <HBar
              data={[
                { name: "Cat 1 — Purchased goods", value: 38 },
                { name: "Cat 2 — Capital goods", value: 9 },
                { name: "Cat 4 — Upstream transport", value: 12 },
                { name: "Cat 5 — Waste", value: 8 },
                { name: "Cat 6 — Business travel", value: 14 },
                { name: "Cat 7 — Employee commute", value: 11 },
                { name: "Cat 3 — Fuel & energy related", value: 8 },
              ]}
            />
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-7">
          <CardHeader title="Emission factor library" hint="Versioned · audit-logged" />
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-ink-50">
                  <th className="table-th">Source</th>
                  <th className="table-th">Region</th>
                  <th className="table-th">Year</th>
                  <th className="table-th">EF</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="table-td">Grid electricity</td><td className="table-td">UAE</td><td className="table-td">2026 Q2</td><td className="table-td tabular-nums">0.418 kgCO₂e/kWh</td></tr>
                <tr><td className="table-td">Grid electricity</td><td className="table-td">SG</td><td className="table-td">2026 Q2</td><td className="table-td tabular-nums">0.412 kgCO₂e/kWh</td></tr>
                <tr><td className="table-td">Natural gas</td><td className="table-td">Global</td><td className="table-td">IPCC AR6</td><td className="table-td tabular-nums">2.02 kgCO₂e/m³</td></tr>
                <tr><td className="table-td">R-410A</td><td className="table-td">Global</td><td className="table-td">IPCC AR6</td><td className="table-td tabular-nums">GWP 2,256</td></tr>
                <tr><td className="table-td">Linen laundry — supplier</td><td className="table-td">IT</td><td className="table-td">Supplier 2026</td><td className="table-td tabular-nums">0.92 kgCO₂e/kg</td></tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 flex items-start gap-2.5">
        <Info size={16} className="text-brand-700 mt-0.5" />
        <div className="text-[13px] text-brand-900">
          EFs are versioned. Re-stating a prior period uses the EF active at submission, with the option to re-state under a current EF — both versions preserved for assurance.
        </div>
      </div>

      <Modal
        open={drill === 1}
        onClose={() => setDrill(null)}
        title="Scope 1 — direct emissions"
        subtitle="Natural gas, diesel, refrigerant leaks (GHG Protocol)"
        size="xl"
        hero={<HeroValue value="3,428" unit="tCO₂e" delta={-3.1} context="Last 12 months · vs prior year" />}
      >
        <ScopeDrilldown scope={1} />
      </Modal>

      <Modal
        open={drill === 2}
        onClose={() => setDrill(null)}
        title="Scope 2 — purchased energy"
        subtitle="Electricity, district cooling, steam (location & market)"
        size="xl"
        hero={<HeroValue value="13,485" unit="tCO₂e" delta={-9.4} context="Average of location & market views" />}
      >
        <ScopeDrilldown scope={2} />
      </Modal>

      <Modal
        open={drill === 3}
        onClose={() => setDrill(null)}
        title="Scope 3 — value chain emissions"
        subtitle="Categories 1–7 · spend-based and supplier-specific emission factors"
        size="xl"
        hero={<HeroValue value="24,853" unit="tCO₂e" delta={-2.2} context="Last 12 months" />}
      >
        <ScopeDrilldown scope={3} />
      </Modal>
    </div>
  );
}
