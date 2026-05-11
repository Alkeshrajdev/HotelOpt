import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import {
  ESG_TOTALS,
  PORTFOLIO_HOTELS,
  PORTFOLIO_SCOPE3_CATEGORIES,
  PORTFOLIO_ENERGY_SOURCES,
  PORTFOLIO_WATER_SOURCES,
  PORTFOLIO_WASTE_STREAMS,
  PORTFOLIO_MONTHLY_TREND,
} from "@/lib/mock";
import { cn } from "@/lib/utils";

type Section = "carbon" | "energy" | "water" | "waste";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "carbon", label: "Carbon" },
  { key: "energy", label: "Energy" },
  { key: "water",  label: "Water"  },
  { key: "waste",  label: "Waste"  },
];

function DataConfidenceBadge({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-ink-500">
      <ShieldCheck size={12} className={pct >= 85 ? "text-good" : pct >= 70 ? "text-warn" : "text-bad"} />
      <span>Data confidence: </span>
      <span className={cn("font-semibold", pct >= 85 ? "text-good" : pct >= 70 ? "text-warn" : "text-bad")}>
        {pct}%
      </span>
      <span className="text-ink-400">portfolio-wide</span>
    </div>
  );
}

function MetricStrip({ items }: { items: { label: string; value: string; sub?: string; tone?: "good" | "warn" | "bad" }[] }) {
  return (
    <div className="flex divide-x divide-ink-100 overflow-x-auto rounded-xl border border-ink-100 bg-white mb-5">
      {items.map((item) => (
        <div key={item.label} className="px-5 py-4 min-w-[140px] flex-1">
          <div className="text-[10px] uppercase font-semibold tracking-wider text-ink-400 truncate">{item.label}</div>
          <div className="text-xl font-bold text-ink-900 tabular-nums mt-1">{item.value}</div>
          {item.sub && (
            <div className={cn("text-[11px] mt-0.5", item.tone ? `text-${item.tone}` : "text-ink-400")}>{item.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function CarbonSection() {
  const hotelData = [...PORTFOLIO_HOTELS]
    .sort((a, b) => b.carbon_t - a.carbon_t)
    .map((h) => ({
      name: h.shortName,
      scope1: Math.round(h.carbon_t * 0.08),
      scope2: Math.round(h.carbon_t * 0.34),
      scope3: Math.round(h.carbon_t * 0.58),
    }));

  const avgConfidence = Math.round(
    PORTFOLIO_HOTELS.reduce((s, h) => s + h.dataConfidence, 0) / PORTFOLIO_HOTELS.length
  );

  return (
    <div className="space-y-5">
      <MetricStrip items={[
        { label: "Total Emissions",   value: "42,850 tCO₂e",       sub: "-4.2% YoY", tone: "good" },
        { label: "Scope 1",           value: "3,428 tCO₂e",        sub: "8% of total" },
        { label: "Scope 2 (location)", value: "14,569 tCO₂e",      sub: "34% of total" },
        { label: "Scope 3",           value: "24,853 tCO₂e",       sub: "58% of total" },
        { label: "Carbon Intensity",  value: "59.5 kgCO₂e/RN",     sub: "-3.8 vs prior year", tone: "good" },
        { label: "Renewable Energy",  value: "12%",                 sub: "of total electricity", tone: "warn" },
      ]} />

      <div className="flex items-center justify-between mb-1">
        <DataConfidenceBadge pct={avgConfidence} />
        <Link to="/performance/carbon/overview" className="text-[12px] font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1">
          Open Carbon Hub <ArrowRight size={12} />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Emissions by Hotel — Scope Split" hint="tCO₂e, ranked by total" />
          <div className="px-4 pb-4 pt-2">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hotelData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 110 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" width={106} tick={{ fontSize: 11, fill: "#334155" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="scope1" name="Scope 1" stackId="a" fill="#7C3AED" maxBarSize={18} />
                <Bar dataKey="scope2" name="Scope 2" stackId="a" fill="#0F766E" maxBarSize={18} />
                <Bar dataKey="scope3" name="Scope 3" stackId="a" fill="#6EE7B7" radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Scope 3 Categories" hint="tCO₂e by upstream category" />
          <div className="px-4 pb-4 pt-2">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={PORTFOLIO_SCOPE3_CATEGORIES} layout="vertical" margin={{ top: 0, right: 50, bottom: 0, left: 160 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="category" width={155} tick={{ fontSize: 10, fill: "#334155" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                  formatter={(v: number) => [`${v.toLocaleString()} tCO₂e`, ""]} />
                <Bar dataKey="tco2e" fill="#0F766E" radius={[0, 4, 4, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
            <ul className="mt-3 space-y-1">
              {PORTFOLIO_SCOPE3_CATEGORIES.slice(0, 3).map((c) => (
                <li key={c.category} className="flex justify-between text-[11px] text-ink-600">
                  <span>{c.category}</span>
                  <span className="font-semibold">{c.pct}%</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Monthly Emissions Trend" hint="tCO₂e total, 12 months" />
        <div className="px-6 pb-6 pt-2">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={PORTFOLIO_MONTHLY_TREND} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={45}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                formatter={(v: number) => [`${v.toLocaleString()} tCO₂e`, "Emissions"]} />
              <Line type="monotone" dataKey="carbon" stroke="#0F766E" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function EnergySection() {
  const hotelData = [...PORTFOLIO_HOTELS]
    .sort((a, b) => b.energyIntensity - a.energyIntensity)
    .map((h) => ({ name: h.shortName, intensity: h.energyIntensity, total: h.energy_mwh }));

  const avgConfidence = Math.round(
    PORTFOLIO_HOTELS.reduce((s, h) => s + h.dataConfidence, 0) / PORTFOLIO_HOTELS.length
  );

  return (
    <div className="space-y-5">
      <MetricStrip items={[
        { label: "Total Energy Use",   value: "84.2 GWh",           sub: "-6.1% YoY", tone: "good" },
        { label: "Energy Intensity",   value: "116.9 kWh/RN",       sub: "-8.3 vs prior year", tone: "good" },
        { label: "Renewable Share",    value: "12%",                 sub: "of electricity", tone: "warn" },
        { label: "Grid Electricity",   value: "69.1%",               sub: "of total energy" },
        { label: "Natural Gas",        value: "19.9%",               sub: "of total energy" },
        { label: "Diesel",             value: "6.3%",                sub: "high-impact", tone: "bad" },
      ]} />

      <div className="flex items-center justify-between mb-1">
        <DataConfidenceBadge pct={avgConfidence} />
        <Link to="/performance/energy/overview" className="text-[12px] font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1">
          Open Energy Hub <ArrowRight size={12} />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Energy Intensity by Hotel" hint="kWh per room night — ranked" />
          <div className="px-4 pb-4 pt-2">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hotelData} layout="vertical" margin={{ top: 0, right: 50, bottom: 0, left: 110 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={106} tick={{ fontSize: 11, fill: "#334155" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                  formatter={(v: number) => [`${v.toFixed(1)} kWh/RN`, "Intensity"]} />
                <Bar dataKey="intensity" fill="#CA8A04" radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Energy Sources" hint="portfolio fuel mix" />
          <div className="px-4 pb-4 pt-4 flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={PORTFOLIO_ENERGY_SOURCES}
                  dataKey="pct"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {PORTFOLIO_ENERGY_SOURCES.map((s) => (
                    <Cell key={s.source} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                  formatter={(v: number) => [`${v}%`, ""]} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="w-full space-y-1.5 mt-2">
              {PORTFOLIO_ENERGY_SOURCES.map((s) => (
                <li key={s.source} className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                    <span className="text-ink-700">{s.source}</span>
                  </span>
                  <span className="font-semibold text-ink-900 tabular-nums">{s.pct}%</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Monthly Energy Trend" hint="total MWh, 12 months" />
        <div className="px-6 pb-6 pt-2">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={PORTFOLIO_MONTHLY_TREND} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={50}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                formatter={(v: number) => [`${v.toLocaleString()} MWh`, "Energy"]} />
              <Line type="monotone" dataKey="energy" stroke="#CA8A04" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function WaterSection() {
  const hotelData = [...PORTFOLIO_HOTELS]
    .sort((a, b) => b.waterIntensity - a.waterIntensity)
    .map((h) => ({ name: h.shortName, intensity: h.waterIntensity, total: h.water_m3 }));

  const avgConfidence = Math.round(
    PORTFOLIO_HOTELS.reduce((s, h) => s + h.dataConfidence, 0) / PORTFOLIO_HOTELS.length
  );

  return (
    <div className="space-y-5">
      <MetricStrip items={[
        { label: "Total Water Use",    value: "552,000 m³",          sub: "-3.8% YoY", tone: "good" },
        { label: "Water Intensity",    value: "532 L/GN",            sub: "-22 vs prior year", tone: "good" },
        { label: "Recycled Water",     value: "6%",                  sub: "of total", tone: "warn" },
        { label: "Municipal Supply",   value: "90.2%",               sub: "of total" },
        { label: "Borehole/Well",      value: "3.8%",                sub: "of total" },
        { label: "Hotels over Target", value: "7 / 10",              sub: "above 532 L/GN", tone: "warn" },
      ]} />

      <div className="flex items-center justify-between mb-1">
        <DataConfidenceBadge pct={avgConfidence} />
        <Link to="/performance/water/overview" className="text-[12px] font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1">
          Open Water Hub <ArrowRight size={12} />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Water Intensity by Hotel" hint="litres per guest night — ranked" />
          <div className="px-4 pb-4 pt-2">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hotelData} layout="vertical" margin={{ top: 0, right: 50, bottom: 0, left: 110 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={106} tick={{ fontSize: 11, fill: "#334155" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                  formatter={(v: number) => [`${v.toFixed(0)} L/GN`, "Intensity"]} />
                <Bar dataKey="intensity" fill="#0EA5E9" radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Water Sources" hint="portfolio supply mix" />
          <div className="px-4 pb-4 pt-4 flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={PORTFOLIO_WATER_SOURCES} dataKey="pct" nameKey="source" cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {PORTFOLIO_WATER_SOURCES.map((s) => (
                    <Cell key={s.source} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                  formatter={(v: number) => [`${v}%`, ""]} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="w-full space-y-1.5 mt-2">
              {PORTFOLIO_WATER_SOURCES.map((s) => (
                <li key={s.source} className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                    <span className="text-ink-700">{s.source}</span>
                  </span>
                  <span className="font-semibold text-ink-900 tabular-nums">{s.pct}%</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Monthly Water Trend" hint="total m³, 12 months" />
        <div className="px-6 pb-6 pt-2">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={PORTFOLIO_MONTHLY_TREND} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={50}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                formatter={(v: number) => [`${v.toLocaleString()} m³`, "Water"]} />
              <Line type="monotone" dataKey="waterM3" stroke="#0EA5E9" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function WasteSection() {
  const hotelData = [...PORTFOLIO_HOTELS]
    .sort((a, b) => a.diversion_pct - b.diversion_pct)
    .map((h) => ({ name: h.shortName, diversion: h.diversion_pct, total: h.waste_t }));

  const avgConfidence = Math.round(
    PORTFOLIO_HOTELS.reduce((s, h) => s + h.dataConfidence, 0) / PORTFOLIO_HOTELS.length
  );

  return (
    <div className="space-y-5">
      <MetricStrip items={[
        { label: "Total Waste",        value: "8,420 tonnes",        sub: "+1.4% YoY", tone: "bad" },
        { label: "Diversion Rate",     value: "42%",                 sub: "vs 60% target", tone: "bad" },
        { label: "Landfill",           value: "4,883 t",             sub: "58% of total", tone: "bad" },
        { label: "Recycled",           value: "2,170 t",             sub: "25.8% of total" },
        { label: "Composted",          value: "1,360 t",             sub: "16.2% of total" },
        { label: "Food Waste",         value: "82 g/cover",          sub: "-8.6% YoY", tone: "good" },
      ]} />

      <div className="flex items-center justify-between mb-1">
        <DataConfidenceBadge pct={avgConfidence} />
        <Link to="/performance/waste/overview" className="text-[12px] font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1">
          Open Waste Hub <ArrowRight size={12} />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Diversion Rate by Hotel" hint="% diverted from landfill — worst first" />
          <div className="px-4 pb-4 pt-2">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hotelData} layout="vertical" margin={{ top: 0, right: 50, bottom: 0, left: 110 }}>
                <XAxis type="number" domain={[0, 80]} tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" width={106} tick={{ fontSize: 11, fill: "#334155" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                  formatter={(v: number) => [`${v}%`, "Diversion"]} />
                <Bar dataKey="diversion" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {hotelData.map((d) => (
                    <Cell key={d.name} fill={d.diversion >= 50 ? "#22C55E" : d.diversion >= 35 ? "#F59E0B" : "#EF4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Waste Streams" hint="portfolio disposal mix" />
          <div className="px-4 pb-4 pt-4 flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={PORTFOLIO_WASTE_STREAMS} dataKey="tonnes" nameKey="stream" cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {PORTFOLIO_WASTE_STREAMS.map((s) => (
                    <Cell key={s.stream} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                  formatter={(v: number) => [`${v.toLocaleString()} t`, ""]} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="w-full space-y-1.5 mt-2">
              {PORTFOLIO_WASTE_STREAMS.map((s) => (
                <li key={s.stream} className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                    <span className="text-ink-700">{s.stream}</span>
                  </span>
                  <span className="font-semibold text-ink-900 tabular-nums">{s.pct}%</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Monthly Diversion Rate Trend" hint="% diverted from landfill, 12 months" />
        <div className="px-6 pb-6 pt-2">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={PORTFOLIO_MONTHLY_TREND} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={35}
                tickFormatter={(v) => `${v}%`} domain={[38, 46]} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                formatter={(v: number) => [`${v}%`, "Diversion"]} />
              <Line type="monotone" dataKey="diversion" stroke="#9333EA" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

export default function EnvironmentTab() {
  const [section, setSection] = useState<Section>("carbon");

  return (
    <div className="space-y-5">
      <div className="flex gap-0.5 border-b border-ink-100 -mx-1">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={cn(
              "px-4 py-2 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
              section === s.key
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-ink-500 hover:text-ink-800 hover:border-ink-200"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === "carbon" && <CarbonSection />}
      {section === "energy" && <EnergySection />}
      {section === "water"  && <WaterSection />}
      {section === "waste"  && <WasteSection />}
    </div>
  );
}
