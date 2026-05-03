// Drilldowns for Water, Waste, Carbon, Social, Governance pillars.
// Each follows the same shape: a hero in the modal header, a body of cards
// (trend + breakdown + by-property typically).

import { Card, CardHeader } from "@/components/ui/Card";
import AreaTrend from "@/components/charts/Area";
import Donut from "@/components/charts/Donut";
import HBar from "@/components/charts/HBar";
import Badge from "@/components/ui/Badge";
import { CARBON, GOVERNANCE, SOCIAL, WASTE, WATER } from "@/lib/pillarData";
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
            color="#0EA5E9"
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
            color="#22D3EE"
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
              { name: "Greywater (sinks/showers)", value: 12, color: "#22D3EE" },
              { name: "HVAC condensate",           value: 6,  color: "#06B6D4" },
              { name: "Rainwater harvested",       value: 4,  color: "#7DD3FC" },
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
                <div className="font-semibold text-ink-900">Cooling tower make-up — Greenview Resort</div>
                <div className="text-[11px] text-ink-500">Anomalous flow at 02:18 — 2.4 m³/h above baseline</div>
              </div>
            </div>
            <Badge tone="warn">Investigating</Badge>
          </li>
          <li className="flex items-center justify-between rounded-xl border border-warn/25 bg-warn/10 p-3">
            <div className="flex items-center gap-3">
              <ShieldAlert size={18} className="text-warn" />
              <div>
                <div className="font-semibold text-ink-900">Laundry feed — Mountain Lodge</div>
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
            color="#0D9488"
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
        <CardHeader title="Diversion rate by property" />
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
            color="#134E4A"
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
              { name: "Scope 1",          value: 1820,  color: "#0F6A3C" },
              { name: "Scope 2 (market)", value: 4910,  color: "#0EA5E9" },
              { name: "Scope 3",          value: 22640, color: "#7C3AED" },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}

/* ---------- SOCIAL ---------- */

export function HeadcountDrilldown() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12 lg:col-span-7">
        <CardHeader title="Headcount over time" />
        <div className="px-6 pb-5">
          <AreaTrend
            data={SOCIAL.headcountTrend.map((d) => ({ x: d.x, v: d.v }))}
            dataKey="v"
            color="#7C3AED"
          />
        </div>
      </Card>
      <Card className="col-span-12 lg:col-span-5">
        <CardHeader title="By gender" hint="GRI 405-1" />
        <div className="p-6">
          <Donut
            totalValue="3,240"
            totalLabel="employees"
            data={SOCIAL.byGender}
          />
        </div>
      </Card>
      <Card className="col-span-12 lg:col-span-6">
        <CardHeader title="By age band" />
        <div className="p-6">
          <HBar data={SOCIAL.byAge} />
        </div>
      </Card>
      <Card className="col-span-12 lg:col-span-6">
        <CardHeader title="By role band" />
        <div className="p-6">
          <HBar data={SOCIAL.byRole} />
        </div>
      </Card>
    </div>
  );
}

export function DiversityDrilldown() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12 lg:col-span-7">
        <CardHeader title="Female leadership over time" />
        <div className="px-6 pb-5">
          <AreaTrend
            data={[
              { x: "May", v: 36 }, { x: "Jun", v: 37 }, { x: "Jul", v: 38 },
              { x: "Aug", v: 39 }, { x: "Sep", v: 39 }, { x: "Oct", v: 40 },
              { x: "Nov", v: 40 }, { x: "Dec", v: 41 }, { x: "Jan", v: 41 },
              { x: "Feb", v: 41 }, { x: "Mar", v: 42 }, { x: "Apr", v: 42 },
            ]}
            dataKey="v"
            color="#7C3AED"
            format={(v) => `${v}%`}
          />
        </div>
      </Card>
      <Card className="col-span-12 lg:col-span-5">
        <CardHeader title="Leadership composition" hint="GRI 405-1 (b)" />
        <div className="p-6">
          <Donut
            totalValue="42%"
            totalLabel="female"
            data={[
              { name: "Female leaders", value: 42, color: "#7C3AED" },
              { name: "Male leaders", value: 56, color: "#A78BFA" },
              { name: "Other / undisclosed", value: 2, color: "#C4B5FD" },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}

export function TrainingDrilldown() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12">
        <CardHeader title="Training hours per FTE — by role" hint="GRI 404-1" />
        <div className="p-6">
          <HBar data={SOCIAL.trainingByRole} unit="h" />
        </div>
      </Card>
    </div>
  );
}

export function SafetyDrilldown() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12 lg:col-span-7">
        <CardHeader title="LTIFR over time" hint="GRI 403-9 — lower is better" />
        <div className="px-6 pb-5">
          <AreaTrend
            data={SOCIAL.ltifrTrend.map((d) => ({ x: d.x, v: d.v }))}
            dataKey="v"
            color="#DC2626"
            format={(v) => v.toFixed(2)}
          />
        </div>
      </Card>
      <Card className="col-span-12 lg:col-span-5">
        <CardHeader title="Incidents — last 12 months" />
        <ul className="p-5 space-y-2 text-sm">
          <li className="flex items-center justify-between"><span>Lost-time incidents</span><span className="font-semibold">14</span></li>
          <li className="flex items-center justify-between"><span>Near misses</span><span className="font-semibold">37</span></li>
          <li className="flex items-center justify-between"><span>Recordables (TRIFR 1.21)</span><span className="font-semibold">42</span></li>
          <li className="flex items-center justify-between"><span>Average lost days</span><span className="font-semibold">3.4</span></li>
        </ul>
      </Card>
    </div>
  );
}

/* ---------- GOVERNANCE ---------- */

export function AttestationsDrilldown() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12">
        <CardHeader title="Annual attestations" hint="FR-1.2.13 / GRI 205 / CSRD G1" />
        <ul className="p-5 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {GOVERNANCE.attestationItems.map((a) => (
            <li
              key={a.name}
              className="flex items-center justify-between rounded-xl border border-ink-200 p-3 bg-white"
            >
              <div className="flex items-center gap-2">
                {a.status === "ready" ? (
                  <CheckCircle2 size={16} className="text-good" />
                ) : (
                  <ShieldAlert size={16} className="text-bad" />
                )}
                <span className="text-ink-900 font-medium">{a.name}</span>
              </div>
              <span className="text-[11px] text-ink-500">{a.lastAttested}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function AntiCorruptionDrilldown() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12 lg:col-span-7">
        <CardHeader title="Completion by property" hint="GRI 205-2" />
        <div className="p-6">
          <HBar data={GOVERNANCE.acByProperty} />
        </div>
      </Card>
      <Card className="col-span-12 lg:col-span-5">
        <CardHeader title="Course mix" />
        <div className="p-6">
          <Donut
            totalValue="96%"
            totalLabel="completion"
            data={[
              { name: "Code of conduct",       value: 32, color: "#EA580C" },
              { name: "Anti-bribery",          value: 28, color: "#F97316" },
              { name: "Conflict of interest",  value: 22, color: "#FB923C" },
              { name: "Data privacy",          value: 18, color: "#FDBA74" },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}

export function WhistleblowDrilldown() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12">
        <CardHeader title="Reports — last 12 months" />
        <ul className="p-5 space-y-2 text-sm">
          <li className="rounded-xl border border-ink-200 p-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink-900">Workplace conduct — Greenview Resort</span>
              <Badge tone="good">Resolved · 12 days</Badge>
            </div>
            <div className="text-[11px] text-ink-500 mt-0.5">Reported anonymously, mediated, training provided.</div>
          </li>
          <li className="rounded-xl border border-ink-200 p-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink-900">Procurement — City Centre Hotel</span>
              <Badge tone="good">Resolved · 21 days</Badge>
            </div>
            <div className="text-[11px] text-ink-500 mt-0.5">Vendor relationship reviewed and replaced.</div>
          </li>
          <li className="rounded-xl border border-ink-200 p-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink-900">Supplier compliance — Mountain Lodge</span>
              <Badge tone="good">Resolved · 9 days</Badge>
            </div>
            <div className="text-[11px] text-ink-500 mt-0.5">Supplier code of conduct re-signed.</div>
          </li>
        </ul>
      </Card>
    </div>
  );
}

export function SupplierCodeDrilldown() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12 lg:col-span-7">
        <CardHeader title="Adoption over time" />
        <div className="px-6 pb-5">
          <AreaTrend
            data={[
              { x: "May", v: 56 }, { x: "Jun", v: 58 }, { x: "Jul", v: 61 },
              { x: "Aug", v: 64 }, { x: "Sep", v: 66 }, { x: "Oct", v: 68 },
              { x: "Nov", v: 70 }, { x: "Dec", v: 71 }, { x: "Jan", v: 72 },
              { x: "Feb", v: 73 }, { x: "Mar", v: 74 }, { x: "Apr", v: 74 },
            ]}
            dataKey="v"
            color="#EA580C"
            format={(v) => `${v}%`}
          />
        </div>
      </Card>
      <Card className="col-span-12 lg:col-span-5">
        <CardHeader title="Top suppliers — adoption status" />
        <ul className="p-5 space-y-2 text-sm">
          <li className="flex items-center justify-between"><span>Aurora Linens Co.</span><Badge tone="good">Signed</Badge></li>
          <li className="flex items-center justify-between"><span>GreenMile Logistics</span><Badge tone="good">Signed</Badge></li>
          <li className="flex items-center justify-between"><span>Ocean Fresh Seafood</span><Badge tone="warn">Reminder sent</Badge></li>
          <li className="flex items-center justify-between"><span>Solar Roofs MENA</span><Badge tone="good">Signed</Badge></li>
          <li className="flex items-center justify-between"><span>FreshLeaf Produce</span><Badge tone="bad">Stale</Badge></li>
        </ul>
      </Card>
    </div>
  );
}
