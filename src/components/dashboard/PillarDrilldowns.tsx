// Drilldowns for the Water, Waste and Carbon pillars.
// Each follows the same shape: a hero in the modal header, a body of cards
// (trend + breakdown + by-property typically).

import { Card, CardHeader } from "@/components/ui/Card";
import AreaTrend from "@/components/charts/Area";
import Donut from "@/components/charts/Donut";
import HBar from "@/components/charts/HBar";
import Badge from "@/components/ui/Badge";
import { CARBON, WASTE, WATER } from "@/lib/pillarData";
import { CheckCircle2, ShieldAlert } from "lucide-react";

/* ---------- WATER ---------- */

export function WaterIntensityDrilldown() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12 lg:col-span-7">
        <CardHeader title="Water intensity over time" hint="m³ per ORN" />
        <div className="px-6 pb-5">
          <AreaTrend
            data={WATER.trend.map((d) => ({ x: d.x, v: d.v }))}
            dataKey="v"
            color="#AF8D84"
            format={(v) => v.toFixed(2)}
          />
        </div>
      </Card>
      <Card className="col-span-12 lg:col-span-5">
        <CardHeader title="Water sources" />
        <div className="p-6">
          <Donut
            totalValue="0.42"
            totalLabel="m³ / ORN"
            data={WATER.sources}
          />
          <ul className="mt-3 space-y-1.5 text-[12px]">
            {WATER.sources.map((s) => (
              <li key={s.name} className="flex items-center justify-between text-ink-700">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
                  {s.name}
                </span>
                <span className="font-semibold">{s.value}%</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>
      <Card className="col-span-12">
        <CardHeader title="By property" hint="m³ / ORN" />
        <div className="p-6">
          <HBar
            data={WATER.byProperty.map((p) => ({ name: p.name, value: Math.round(p.value * 200) }))}
            unit=""
          />
          <div className="mt-2 text-[11px] text-ink-500">
            Bars normalised for visual comparison. Hover for absolute m³/ORN.
          </div>
        </div>
      </Card>
    </div>
  );
}

export function WaterRecycledDrilldown() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12 lg:col-span-7">
        <CardHeader title="Recycled share over time" />
        <div className="px-6 pb-5">
          <AreaTrend
            data={[
              { x: "May", v: 14 }, { x: "Jun", v: 15 }, { x: "Jul", v: 16 },
              { x: "Aug", v: 17 }, { x: "Sep", v: 18 }, { x: "Oct", v: 19 },
              { x: "Nov", v: 20 }, { x: "Dec", v: 20 }, { x: "Jan", v: 21 },
              { x: "Feb", v: 21 }, { x: "Mar", v: 22 }, { x: "Apr", v: 22 },
            ]}
            dataKey="v"
            color="#AF8D84"
            format={(v) => `${v}%`}
          />
        </div>
      </Card>
      <Card className="col-span-12 lg:col-span-5">
        <CardHeader title="Recycled sources" />
        <div className="p-6">
          <Donut
            totalValue="22%"
            totalLabel="recycled"
            data={[
              { name: "Greywater (sinks/showers)", value: 12, color: "#807245" },
              { name: "HVAC condensate",           value: 6,  color: "#AF8D84" },
              { name: "Rainwater harvested",       value: 4,  color: "#959891" },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}

export function WaterLeaksDrilldown() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12">
        <CardHeader title="Leak alerts — last 30 days" />
        <ul className="p-5 space-y-2 text-sm">
          <li className="flex items-center justify-between rounded-xl border border-warn/25 bg-warn/10 p-3">
            <div className="flex items-center gap-3">
              <ShieldAlert size={18} className="text-warn" />
              <div>
                <div className="font-semibold text-ink-900">Cooling tower make-up — Skyline Dubai</div>
                <div className="text-[11px] text-ink-500">Anomalous flow at 02:18 — 2.4 m³/h above baseline</div>
              </div>
            </div>
            <Badge tone="warn">Investigating</Badge>
          </li>
          <li className="flex items-center justify-between rounded-xl border border-warn/25 bg-warn/10 p-3">
            <div className="flex items-center gap-3">
              <ShieldAlert size={18} className="text-warn" />
              <div>
                <div className="font-semibold text-ink-900">Laundry feed — Peaks Resort Zermatt</div>
                <div className="text-[11px] text-ink-500">3-hour run with no batch logged</div>
              </div>
            </div>
            <Badge tone="warn">Investigating</Badge>
          </li>
        </ul>
      </Card>
    </div>
  );
}

/* ---------- WASTE ---------- */

export function WasteIntensityDrilldown() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12 lg:col-span-7">
        <CardHeader title="Waste / ORN over time" />
        <div className="px-6 pb-5">
          <AreaTrend
            data={WASTE.trend.map((d) => ({ x: d.x, v: d.v }))}
            dataKey="v"
            color="#959891"
            format={(v) => v.toFixed(2)}
          />
        </div>
      </Card>
      <Card className="col-span-12 lg:col-span-5">
        <CardHeader title="By stream" />
        <div className="p-6">
          <Donut
            totalValue="1.8"
            totalLabel="kg / ORN"
            data={WASTE.streams}
          />
          <ul className="mt-3 space-y-1.5 text-[12px]">
            {WASTE.streams.map((s) => (
              <li key={s.name} className="flex items-center justify-between text-ink-700">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
                  {s.name}
                </span>
                <span className="font-semibold">{s.value}%</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}

export function WasteDiversionDrilldown() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12 lg:col-span-7">
        <CardHeader title="Diversion rate by property" hint="incl. waste-to-energy" />
        <div className="p-6">
          <HBar data={WASTE.diversionByProperty} />
        </div>
      </Card>
      <Card className="col-span-12 lg:col-span-5">
        <CardHeader title="Top contractors" />
        <ul className="p-5 space-y-2 text-sm">
          <li className="flex items-center justify-between"><span>EcoWaste APAC</span><Badge tone="good">98% audited</Badge></li>
          <li className="flex items-center justify-between"><span>GreenLoop EMEA</span><Badge tone="good">94% audited</Badge></li>
          <li className="flex items-center justify-between"><span>CityClean MENA</span><Badge tone="warn">61% audited</Badge></li>
          <li className="flex items-center justify-between"><span>Local hauler — Whistler</span><Badge tone="good">100% audited</Badge></li>
        </ul>
      </Card>
    </div>
  );
}

export function WasteFoodDrilldown() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12 lg:col-span-7">
        <CardHeader title="Food waste by meal period" hint="g per cover" />
        <div className="p-6">
          <HBar data={WASTE.foodByMeal} unit="g" />
        </div>
      </Card>
      <Card className="col-span-12 lg:col-span-5">
        <CardHeader title="LeanPath / Traytracker integration" />
        <div className="p-5 text-sm space-y-2">
          <div className="flex items-center justify-between">
            <span>Hotels live</span><span className="font-semibold">4 / 6</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Records ingested (Apr)</span><span className="font-semibold">12,840</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Avg. confidence</span><span className="font-semibold">94%</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ---------- CARBON ---------- */

export function CarbonIntensityDrilldown() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12 lg:col-span-7">
        <CardHeader title="Carbon intensity over time" hint="tCO₂e / ORN" />
        <div className="px-6 pb-5">
          <AreaTrend
            data={CARBON.trend.map((d) => ({ x: d.x, v: d.v }))}
            dataKey="v"
            color="#8B6D66"
            format={(v) => v.toFixed(3)}
          />
        </div>
      </Card>
      <Card className="col-span-12 lg:col-span-5">
        <CardHeader title="Scope mix" />
        <div className="p-6">
          <Donut
            totalValue="29.4k"
            totalLabel="tCO₂e (12 mo)"
            data={[
              { name: "Scope 1",          value: 1820,  color: "#807245" },
              { name: "Scope 2 (market)", value: 4910,  color: "#AF8D84" },
              { name: "Scope 3",          value: 22640, color: "#959891" },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}
