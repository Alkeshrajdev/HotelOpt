import type { ReactNode } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import AreaTrend from "@/components/charts/Area";
import Donut from "@/components/charts/Donut";
import HBar from "@/components/charts/HBar";
import IntensityChart from "@/components/charts/IntensityChart";
import Badge from "@/components/ui/Badge";
import { MONTHLY_INTENSITY } from "@/lib/mock";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* -------- Header value pill (re-used by every drilldown) -------- */

export function HeroValue({
  value,
  unit,
  delta,
  goodDirection = "down",
  context,
}: {
  value: string;
  unit?: string;
  delta?: number;
  goodDirection?: "up" | "down";
  context?: ReactNode;
}) {
  const showDelta = typeof delta === "number";
  const isGood =
    showDelta && (goodDirection === "down" ? delta! < 0 : delta! > 0);
  return (
    <div className="flex items-end gap-3 flex-wrap">
      <div className="text-[34px] leading-none font-extrabold text-ink-900 tabular-nums">
        {value}
        {unit && (
          <span className="text-[14px] font-medium text-ink-500 ml-1">
            {unit}
          </span>
        )}
      </div>
      {showDelta && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-[13px] font-semibold rounded-md px-2 py-1",
            isGood ? "text-good bg-good/10" : "text-bad bg-bad/10"
          )}
        >
          {delta! < 0 ? (
            <ArrowDownRight size={13} />
          ) : (
            <ArrowUpRight size={13} />
          )}
          {Math.abs(delta!).toFixed(1)}% YoY
        </span>
      )}
      {context && (
        <span className="text-[12px] text-ink-500 ml-auto">{context}</span>
      )}
    </div>
  );
}

/* -------- 1. Energy Score (compliance/data quality) -------- */

export function EnergyScoreDrilldown() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12 lg:col-span-7">
        <CardHeader title="Compliance over time" hint="Approved data / required" />
        <div className="px-6 pb-5">
          <AreaTrend
            data={[
              { x: "May", v: 71 },
              { x: "Jun", v: 73 },
              { x: "Jul", v: 76 },
              { x: "Aug", v: 78 },
              { x: "Sep", v: 78 },
              { x: "Oct", v: 80 },
              { x: "Nov", v: 81 },
              { x: "Dec", v: 81 },
              { x: "Jan", v: 82 },
              { x: "Feb", v: 82 },
              { x: "Mar", v: 81 },
              { x: "Apr", v: 82 },
            ]}
            dataKey="v"
            format={(v) => `${v}%`}
          />
        </div>
      </Card>

      <Card className="col-span-12 lg:col-span-5">
        <CardHeader title="What's still missing?" />
        <div className="p-5 space-y-3">
          <HBar
            data={[
              { name: "Meter readings (Apr)", value: 82 },
              { name: "Invoice scans pending", value: 68 },
              { name: "OCR low-confidence", value: 51 },
              { name: "Supplier data", value: 47 },
              { name: "Approval queue clear", value: 76 },
            ]}
          />
          <div className="rounded-xl bg-warn/10 border border-warn/25 p-3 text-[12px] text-warn">
            <strong>10</strong> meters across 3 properties have not reported in April.
            Send reminders from the Action Centre.
          </div>
        </div>
      </Card>

      <Card className="col-span-12">
        <CardHeader title="Compliance by property" />
        <div className="p-6">
          <HBar
            data={[
              { name: "Skyline Dubai", value: 96 },
              { name: "Peaks Resort Zermatt", value: 91 },
              { name: "Oceanfront Cape Town", value: 88 },
              { name: "The Pavilion London", value: 84 },
              { name: "Marina Residences Barcelona", value: 79 },
              { name: "Airport Hotel Dubai", value: 41 },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}

/* -------- 2. Energy Performance Index -------- */

export function PerformanceIndexDrilldown() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12 lg:col-span-8">
        <CardHeader title="Index trend" hint="Base 100 = 2022" />
        <div className="px-6 pb-5">
          <IntensityChart data={MONTHLY_INTENSITY} />
        </div>
      </Card>
      <Card className="col-span-12 lg:col-span-4">
        <CardHeader title="Index drivers — last 12 mo" />
        <ul className="p-5 space-y-3">
          <Driver label="LED retrofit (Q3)" delta={-2.4} good />
          <Driver label="BMS optimisation" delta={-1.8} good />
          <Driver label="F&B refurb commissioning" delta={1.2} />
          <Driver label="Weather (CDD/HDD)" delta={-0.6} good />
          <Driver label="Occupancy mix" delta={0.4} />
        </ul>
      </Card>
    </div>
  );
}

function Driver({
  label,
  delta,
  good,
}: {
  label: string;
  delta: number;
  good?: boolean;
}) {
  return (
    <li className="flex items-center justify-between text-sm">
      <span className="text-ink-700">{label}</span>
      <Badge tone={good ? "good" : "warn"}>
        {delta < 0 ? "" : "+"}
        {delta.toFixed(1)}%
      </Badge>
    </li>
  );
}

/* -------- 3. Energy Intensity (kWh/ORN) -------- */

export function EnergyIntensityDrilldown() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12 lg:col-span-8">
        <CardHeader
          title="Intensity over time"
          hint="kWh / Occupied Room Night"
        />
        <div className="px-6 pb-5">
          <AreaTrend
            data={MONTHLY_INTENSITY.map((d) => ({ x: d.month, v: d.intensity }))}
            dataKey="v"
            format={(v) => `${v}`}
          />
        </div>
      </Card>
      <Card className="col-span-12 lg:col-span-4">
        <CardHeader title="By source — last month" />
        <div className="p-6">
          <Donut
            totalValue="24.0"
            totalLabel="kWh / ORN"
            data={[
              { name: "Grid electricity", value: 64, color: "#0F6A3C" },
              { name: "District cooling", value: 12, color: "#0EA5E9" },
              { name: "Natural gas", value: 14, color: "#F59E0B" },
              { name: "Diesel", value: 2, color: "#DC2626" },
              { name: "Solar PV (offset)", value: 8, color: "#16A34A" },
            ]}
          />
          <ul className="mt-3 space-y-1.5 text-[12px]">
            {[
              { c: "#0F6A3C", n: "Grid electricity", v: "64%" },
              { c: "#0EA5E9", n: "District cooling", v: "12%" },
              { c: "#F59E0B", n: "Natural gas", v: "14%" },
              { c: "#DC2626", n: "Diesel", v: "2%" },
              { c: "#16A34A", n: "Solar PV (offset)", v: "8%" },
            ].map((s) => (
              <li
                key={s.n}
                className="flex items-center justify-between text-ink-700"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ background: s.c }}
                  />
                  {s.n}
                </span>
                <span className="font-semibold">{s.v}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}

/* -------- 4. Energy Cost -------- */

export function EnergyCostDrilldown() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12 lg:col-span-8">
        <CardHeader title="Cost — last 12 months" hint="USD per month" />
        <div className="px-6 pb-5">
          <AreaTrend
            data={[
              { x: "May 25", v: 480 },
              { x: "Jun", v: 510 },
              { x: "Jul", v: 540 },
              { x: "Aug", v: 555 },
              { x: "Sep", v: 510 },
              { x: "Oct", v: 470 },
              { x: "Nov", v: 440 },
              { x: "Dec", v: 410 },
              { x: "Jan", v: 395 },
              { x: "Feb", v: 380 },
              { x: "Mar", v: 410 },
              { x: "Apr 26", v: 425 },
            ]}
            dataKey="v"
            color="#7C3AED"
            format={(v) => `$${v}k`}
          />
        </div>
      </Card>
      <Card className="col-span-12 lg:col-span-4">
        <CardHeader title="Top 5 cost properties" />
        <div className="p-6">
          <HBar
            data={[
              { name: "Oceanfront Cape Town", value: 92 },
              { name: "The Pavilion London", value: 88 },
              { name: "Skyline Dubai", value: 76 },
              { name: "Marina Residences Barcelona", value: 71 },
              { name: "Peaks Resort Zermatt", value: 64 },
            ]}
            unit="%"
          />
          <div className="mt-3 text-[12px] text-ink-500">
            % of YoY cost target. Hover bars for absolute USD.
          </div>
        </div>
      </Card>
    </div>
  );
}

/* -------- 5. Renewable energy -------- */

export function RenewableDrilldown() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12 lg:col-span-7">
        <CardHeader title="Renewable share over time" />
        <div className="px-6 pb-5">
          <AreaTrend
            data={[
              { x: "May", v: 9 },
              { x: "Jun", v: 9 },
              { x: "Jul", v: 10 },
              { x: "Aug", v: 10 },
              { x: "Sep", v: 10 },
              { x: "Oct", v: 11 },
              { x: "Nov", v: 11 },
              { x: "Dec", v: 11 },
              { x: "Jan", v: 11 },
              { x: "Feb", v: 12 },
              { x: "Mar", v: 12 },
              { x: "Apr", v: 12 },
            ]}
            dataKey="v"
            color="#EA580C"
            format={(v) => `${v}%`}
          />
        </div>
      </Card>
      <Card className="col-span-12 lg:col-span-5">
        <CardHeader title="Sources" />
        <div className="p-6">
          <Donut
            totalValue="12%"
            totalLabel="renewable"
            data={[
              { name: "On-site solar PV", value: 8, color: "#EA580C" },
              { name: "I-RECs purchased", value: 4, color: "#FBBF24" },
              { name: "Conventional grid", value: 88, color: "#94A3B8" },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}

/* -------- 6. Carbon scope drilldown (used by Carbon Inventory) -------- */

export function ScopeDrilldown({
  scope,
}: {
  scope: 1 | 2 | 3;
}) {
  if (scope === 1) {
    return (
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-8">
          <CardHeader title="Scope 1 — emissions over time" hint="tCO₂e/month" />
          <div className="px-6 pb-5">
            <AreaTrend
              data={[
                { x: "May", v: 317 },
                { x: "Jun", v: 330 },
                { x: "Jul", v: 343 },
                { x: "Aug", v: 335 },
                { x: "Sep", v: 305 },
                { x: "Oct", v: 286 },
                { x: "Nov", v: 279 },
                { x: "Dec", v: 268 },
                { x: "Jan", v: 260 },
                { x: "Feb", v: 252 },
                { x: "Mar", v: 268 },
                { x: "Apr", v: 298 },
              ]}
              dataKey="v"
              color="#0F6A3C"
              format={(v) => `${v}t`}
            />
          </div>
        </Card>
        <Card className="col-span-12 lg:col-span-4">
          <CardHeader title="Scope 1 sources" />
          <div className="p-6">
            <Donut
              totalValue="3,428"
              totalLabel="tCO₂e (12 mo)"
              data={[
                { name: "Natural gas", value: 1846, color: "#0F6A3C" },
                { name: "Diesel (back-up)", value: 1168, color: "#7C2D12" },
                { name: "Refrigerants (R-410A)", value: 414, color: "#F59E0B" },
              ]}
            />
          </div>
        </Card>
        <Card className="col-span-12">
          <CardHeader title="Top contributors — Scope 1 by property" />
          <div className="p-6">
            <HBar
              data={[
                { name: "Oceanfront Cape Town", value: 181 },
                { name: "The Pavilion London", value: 158 },
                { name: "Skyline Dubai", value: 134 },
                { name: "Marina Residences Barcelona", value: 117 },
                { name: "Peaks Resort Zermatt", value: 77 },
              ]}
            />
          </div>
        </Card>
      </div>
    );
  }
  if (scope === 2) {
    return (
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-8">
          <CardHeader
            title="Scope 2 — location vs market based"
            hint="tCO₂e/month"
          />
          <div className="px-6 pb-5">
            <IntensityChart data={MONTHLY_INTENSITY} />
          </div>
        </Card>
        <Card className="col-span-12 lg:col-span-4">
          <CardHeader title="Grid mix" />
          <div className="p-6">
            <Donut
              totalValue="14,569"
              totalLabel="tCO₂e (12 mo)"
              data={[
                { name: "Grid electricity", value: 12814, color: "#0EA5E9" },
                { name: "District cooling", value: 1281, color: "#22D3EE" },
                { name: "Steam (district heat)", value: 474, color: "#A5F3FC" },
              ]}
            />
            <div className="mt-3 text-[12px] text-ink-500">
              Market-based result reflects PPAs and I-REC purchases.
            </div>
          </div>
        </Card>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12 lg:col-span-7">
        <CardHeader title="Scope 3 by category" />
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
      <Card className="col-span-12 lg:col-span-5">
        <CardHeader title="Data quality by category" />
        <div className="p-6">
          <HBar
            data={[
              { name: "Cat 1 (spend-based)", value: 52 },
              { name: "Cat 4 (supplier data)", value: 71 },
              { name: "Cat 6 (travel system)", value: 84 },
              { name: "Cat 7 (survey)", value: 47 },
              { name: "Cat 5 (hauler API)", value: 92 },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}
