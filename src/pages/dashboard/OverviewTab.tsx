import { useMemo, useState } from "react";
import {
  Zap, Droplet, Cloud, Recycle,
  DollarSign, TrendingDown, ArrowRight,
  ArrowDownRight, ArrowUpRight,
  Award, AlertTriangle,
} from "lucide-react";
import {
  ComposedChart, BarChart, LineChart,
  Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";
import { PORTFOLIO_HOTELS, PORTFOLIO_SCOPE3_CATEGORIES } from "@/lib/mock";
import type { DashboardFilters } from "./FilterBar";

type Props = { filters: DashboardFilters; onNavigate: (tab: string) => void };

/* ── Monthly portfolio cost data ($k) ────────────────────────────────────── */
const MONTHLY = [
  { month:"May", energy:335, water:12, waste:1, costPY:371, intensity:11.6 },
  { month:"Jun", energy:390, water:13, waste:2, costPY:431, intensity:13.1 },
  { month:"Jul", energy:441, water:15, waste:2, costPY:488, intensity:14.8 },
  { month:"Aug", energy:449, water:15, waste:2, costPY:496, intensity:15.1 },
  { month:"Sep", energy:405, water:14, waste:2, costPY:448, intensity:13.7 },
  { month:"Oct", energy:386, water:13, waste:2, costPY:427, intensity:14.8 },
  { month:"Nov", energy:362, water:13, waste:2, costPY:401, intensity:15.9 },
  { month:"Dec", energy:374, water:14, waste:2, costPY:415, intensity:15.6 },
  { month:"Jan", energy:352, water:13, waste:2, costPY:391, intensity:15.3 },
  { month:"Feb", energy:329, water:13, waste:2, costPY:366, intensity:14.8 },
  { month:"Mar", energy:369, water:13, waste:2, costPY:409, intensity:14.5 },
  { month:"Apr", energy:404, water:15, waste:2, costPY:448, intensity:17.7 },
];
const TOTAL_TY = MONTHLY.reduce((s, m) => s + m.energy + m.water + m.waste, 0);
const TOTAL_PY = MONTHLY.reduce((s, m) => s + m.costPY, 0);

/* Portfolio-level physical totals (for share calculation) */
const PORT = {
  energy: PORTFOLIO_HOTELS.reduce((s, h) => s + h.energy_mwh, 0),
  water:  PORTFOLIO_HOTELS.reduce((s, h) => s + h.water_m3,   0),
  carbon: PORTFOLIO_HOTELS.reduce((s, h) => s + h.carbon_t,   0),
  waste:  PORTFOLIO_HOTELS.reduce((s, h) => s + h.waste_t,    0),
};

const SCOPE3_TOTAL = PORTFOLIO_SCOPE3_CATEGORIES.reduce((s, c) => s + c.tco2e, 0);
const MONTH_NAMES  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function monthToIdx(m: number) { return (m - 5 + 12) % 12; }

/* ── Section header ──────────────────────────────────────────────────────── */
function SectionHead({ title, action, onClick, right }: {
  title: string; action?: string; onClick?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="w-0.5 h-5 rounded-full bg-brand-600 shrink-0" />
        <h2 className="text-[14px] font-semibold text-ink-800">{title}</h2>
      </div>
      {right ?? (action && onClick && (
        <button onClick={onClick} className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700 hover:text-brand-900 transition-colors">
          {action} <ArrowRight size={12} />
        </button>
      ))}
    </div>
  );
}

/* ── Cost chart tooltip ──────────────────────────────────────────────────── */
function CostTip({ active, payload, label }: {
  active?: boolean; payload?: { dataKey: string; value: number }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  const energy = payload.find(p => p.dataKey === "energy");
  const water  = payload.find(p => p.dataKey === "water");
  const waste  = payload.find(p => p.dataKey === "waste");
  const py     = payload.find(p => p.dataKey === "costPY");
  const total  = (energy?.value ?? 0) + (water?.value ?? 0) + (waste?.value ?? 0);
  const diff   = py ? total - py.value : null;
  return (
    <div className="bg-white border border-ink-200 rounded-xl shadow-pop px-3.5 py-3 text-[12px] min-w-[170px]">
      <div className="font-semibold text-ink-800 mb-2">{label}</div>
      <div className="space-y-0.5">
        {energy && <div className="flex justify-between gap-4"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm inline-block bg-[#0F6A3C]"/>Energy</span><span className="font-semibold">${energy.value}k</span></div>}
        {water  && <div className="flex justify-between gap-4"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm inline-block bg-[#38bdf8]"/>Water</span><span className="font-semibold">${water.value}k</span></div>}
        {waste  && <div className="flex justify-between gap-4"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm inline-block bg-[#a78bfa]"/>Waste</span><span className="font-semibold">${waste.value}k</span></div>}
        <div className="flex justify-between gap-4 pt-1 mt-1 border-t border-ink-100">
          <span className="text-ink-500">Total</span>
          <span className="font-bold text-ink-900">${total}k</span>
        </div>
        {diff !== null && (
          <div className={cn("flex justify-between gap-4 text-[11px] font-semibold", diff < 0 ? "text-good" : "text-bad")}>
            <span>vs prior year</span>
            <span>{diff < 0 ? "−" : "+"}${Math.abs(diff)}k</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Carbon intensity tooltip ────────────────────────────────────────────── */
function CarbonTip({ active, payload, label }: {
  active?: boolean; payload?: { value: number }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-ink-200 rounded-xl shadow-pop px-3.5 py-3 text-[12px]">
      <div className="font-semibold text-ink-800 mb-1">{label}</div>
      <div className="flex justify-between gap-4">
        <span className="text-ink-500">Carbon intensity</span>
        <span className="font-bold" style={{ color:"#0d9488" }}>{payload[0].value} kgCO₂e/ORN</span>
      </div>
    </div>
  );
}

/* ── Hotel breakdown chart tooltip ──────────────────────────────────────── */
function HotelTip({ active, payload, label }: {
  active?: boolean; payload?: { dataKey: string; value: number }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  const energy = payload.find(p => p.dataKey === "energy");
  const water  = payload.find(p => p.dataKey === "water");
  const waste  = payload.find(p => p.dataKey === "waste");
  const total  = (energy?.value ?? 0) + (water?.value ?? 0) + (waste?.value ?? 0);
  return (
    <div className="bg-white border border-ink-200 rounded-xl shadow-pop px-3.5 py-3 text-[12px] min-w-[160px]">
      <div className="font-semibold text-ink-800 mb-2 truncate max-w-[150px]">{label}</div>
      <div className="space-y-0.5">
        {energy && <div className="flex justify-between gap-4"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm inline-block bg-[#0F6A3C]"/>Energy</span><span className="font-semibold">${energy.value}k</span></div>}
        {water  && <div className="flex justify-between gap-4"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm inline-block bg-[#38bdf8]"/>Water</span><span className="font-semibold">${water.value}k</span></div>}
        {waste  && <div className="flex justify-between gap-4"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm inline-block bg-[#a78bfa]"/>Waste</span><span className="font-semibold">${waste.value}k</span></div>}
        <div className="flex justify-between gap-4 pt-1 mt-1 border-t border-ink-100">
          <span className="text-ink-500">Total</span>
          <span className="font-bold text-ink-900">${total}k</span>
        </div>
      </div>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────────────────────── */
export default function OverviewTab({ filters, onNavigate }: Props) {
  const { mode, month, comparison } = filters;
  const [chartMode, setChartMode] = useState<"cost" | "carbon">("cost");

  /* Filtered hotels */
  const filteredHotels = useMemo(() =>
    filters.hotelIds === "all"
      ? PORTFOLIO_HOTELS
      : PORTFOLIO_HOTELS.filter(h => (filters.hotelIds as string[]).includes(h.id)),
    [filters.hotelIds]
  );

  /* Physical totals */
  const ftot = useMemo(() => {
    const energy = filteredHotels.reduce((s, h) => s + h.energy_mwh, 0);
    const water  = filteredHotels.reduce((s, h) => s + h.water_m3,   0);
    const carbon = filteredHotels.reduce((s, h) => s + h.carbon_t,   0);
    const waste  = filteredHotels.reduce((s, h) => s + h.waste_t,    0);
    const orn    = filteredHotels.reduce((s, h) => s + h.orn,        0);
    const wDiv   = waste > 0
      ? filteredHotels.reduce((s, h) => s + h.diversion_pct * h.waste_t, 0) / waste
      : 0;
    return { energy, water, carbon, waste, orn, wDiv };
  }, [filteredHotels]);

  /* Scope 3 scaled by carbon share */
  const sh = useMemo(() => ({
    energy: PORT.energy > 0 ? ftot.energy / PORT.energy : 0,
    water:  PORT.water  > 0 ? ftot.water  / PORT.water  : 0,
    waste:  PORT.waste  > 0 ? ftot.waste  / PORT.waste  : 0,
    carbon: PORT.carbon > 0 ? ftot.carbon / PORT.carbon : 0,
  }), [ftot]);
  const avgShare = (sh.energy + sh.water + sh.waste) / 3;

  const filteredScope3 = Math.round(SCOPE3_TOTAL * sh.carbon);
  const totalGHG       = ftot.carbon + filteredScope3;

  /* YoY averages */
  const avgYoyCarbon = filteredHotels.length > 0
    ? filteredHotels.reduce((s, h) => s + h.yoyCarbon, 0) / filteredHotels.length : 0;
  const avgYoyEnergy = filteredHotels.length > 0
    ? filteredHotels.reduce((s, h) => s + h.yoyEnergy, 0) / filteredHotels.length : 0;

  /* Scaled monthly data */
  const scaledMonthly = useMemo(() =>
    MONTHLY.map(m => ({
      ...m,
      energy: Math.round(m.energy * sh.energy),
      water:  Math.round(m.water  * sh.water),
      waste:  Math.round(m.waste  * sh.waste),
      costPY: Math.round(m.costPY * avgShare),
    })),
    [sh, avgShare]
  );

  const filteredTY      = Math.round(TOTAL_TY * avgShare);
  const filteredPY      = Math.round(TOTAL_PY * avgShare);
  const filteredSavings = filteredPY - filteredTY;

  /* Month mode */
  const curMonthNum  = month ?? 5;
  const curMonthRow  = MONTHLY[monthToIdx(curMonthNum)];
  const compMonthRow = useMemo(() => {
    if (comparison.type === "prior-month") {
      const prev = curMonthNum === 1 ? 12 : curMonthNum - 1;
      return MONTHLY[monthToIdx(prev)];
    }
    return null;
  }, [comparison, curMonthNum]);

  const mCur      = Math.round(curMonthRow.energy * sh.energy + curMonthRow.water * sh.water + curMonthRow.waste * sh.waste);
  const mComp     = compMonthRow
    ? Math.round(compMonthRow.energy * sh.energy + compMonthRow.water * sh.water + compMonthRow.waste * sh.waste)
    : Math.round(curMonthRow.costPY * avgShare);
  const mSavings  = mComp - mCur;
  const mDeltaPct = mComp > 0 ? ((mCur - mComp) / mComp) * 100 : 0;

  /* Hotel breakdown chart */
  const hotelMonthData = useMemo(() =>
    filteredHotels
      .map(h => ({
        name:   h.shortName,
        energy: PORT.energy > 0 ? Math.round(curMonthRow.energy * h.energy_mwh / PORT.energy) : 0,
        water:  PORT.water  > 0 ? Math.round(curMonthRow.water  * h.water_m3   / PORT.water ) : 0,
        waste:  PORT.waste  > 0 ? Math.round(curMonthRow.waste  * h.waste_t    / PORT.waste ) : 0,
      }))
      .map(h => ({ ...h, total: h.energy + h.water + h.waste }))
      .sort((a, b) => b.total - a.total),
    [filteredHotels, curMonthRow]
  );
  const hotelChartHeight = Math.max(220, filteredHotels.length * 44);

  /* Comparison label */
  const compLabel = (() => {
    const mn = MONTH_NAMES[curMonthNum - 1];
    if (comparison.type === "prior-year")    return `${(comparison as { type:"prior-year"; year:number }).year}`;
    if (comparison.type === "same-month-ly") return `${mn} ${filters.year - 1}`;
    if (comparison.type === "prior-month") {
      const p = curMonthNum === 1 ? 12 : curMonthNum - 1;
      return `${MONTH_NAMES[p - 1]} ${curMonthNum === 1 ? filters.year - 1 : filters.year}`;
    }
    if (comparison.type === "custom") {
      const c = comparison as { type:"custom"; year:number; month:number };
      return `${MONTH_NAMES[c.month - 1]} ${c.year}`;
    }
    return "";
  })();

  const periodLabel = mode === "year"
    ? `${filters.year} vs ${compLabel}`
    : `${MONTH_NAMES[curMonthNum - 1]} ${filters.year} vs ${compLabel}`;

  /* ── Monthly insights (year mode) ────────────────────────────────────── */
  const monthlyStats = useMemo(() => {
    const rows = scaledMonthly.map(m => ({
      month: m.month,
      total: m.energy + m.water + m.waste,
      py:    m.costPY,
      diff:  (m.energy + m.water + m.waste) - m.costPY,
      intensity: m.intensity,
    }));
    const best  = rows.reduce((a, b) => a.diff < b.diff ? a : b);
    const worst = rows.reduce((a, b) => a.diff > b.diff ? a : b);
    const peak  = rows.reduce((a, b) => a.intensity > b.intensity ? a : b);
    const below = rows.filter(r => r.diff < 0).length;
    return { best, worst, peak, below, total: rows.length };
  }, [scaledMonthly]);

  /* ── Hotel performance ───────────────────────────────────────────────── */
  const { leaders, attention } = useMemo(() => {
    const reliable = filteredHotels.filter(h => h.dataConfidence >= 70);
    const leaders  = [...reliable]
      .sort((a, b) => (a.carbonIntensity + a.yoyCarbon * 3) - (b.carbonIntensity + b.yoyCarbon * 3))
      .slice(0, 3);

    function attentionScore(h: typeof PORTFOLIO_HOTELS[0]) {
      let s = 0;
      if (h.dataConfidence < 70) s += (70 - h.dataConfidence) * 2;
      if (h.carbonIntensity > 60) s += h.carbonIntensity - 60;
      if (h.yoyCarbon > -2)       s += (2 + h.yoyCarbon) * 4;
      return s;
    }
    const attention = [...filteredHotels]
      .sort((a, b) => attentionScore(b) - attentionScore(a))
      .slice(0, 3);

    return { leaders, attention };
  }, [filteredHotels]);

  function attentionReason(h: typeof PORTFOLIO_HOTELS[0]): string {
    if (h.dataConfidence < 50) return "Low data confidence";
    if (h.dataConfidence < 70) return "Data gaps detected";
    if (h.carbonIntensity > 70) return "High carbon intensity";
    if (h.yoyCarbon > -2)       return "Minimal YoY improvement";
    return "Needs review";
  }

  /* ── Primary KPI tiles ───────────────────────────────────────────────── */
  type PrimaryTile = {
    icon: React.ElementType; color: string;
    label: string; value: string; unit: string;
    subLabel?: string;
    delta: string; deltaGood: boolean; highlight?: boolean;
    tab?: string;
  };

  const primaryTiles: PrimaryTile[] = mode === "year" ? [
    {
      icon: DollarSign, color: "#0F6A3C",
      label: "Total spend", value: `$${(filteredTY / 1000).toFixed(2)}M`, unit: "energy · water · waste",
      delta: `−${((1 - filteredTY / filteredPY) * 100).toFixed(1)}% vs ${compLabel}`, deltaGood: true,
    },
    {
      icon: Cloud, color: "#0F766E",
      label: "Total GHG", value: (totalGHG / 1000).toFixed(1) + "k", unit: "tCO₂e",
      subLabel: `S1+2: ${(ftot.carbon / 1000).toFixed(1)}k · S3: ${(filteredScope3 / 1000).toFixed(1)}k`,
      delta: `${avgYoyCarbon.toFixed(1)}% vs last year`, deltaGood: avgYoyCarbon < 0, tab: "environment",
    },
    {
      icon: TrendingDown, color: "#16a34a",
      label: "Est. cost avoidance", value: `$${filteredSavings}k`, unit: `vs ${compLabel} spend`,
      delta: "from reduced consumption", deltaGood: true, highlight: true,
    },
  ] : [
    {
      icon: DollarSign, color: "#0F6A3C",
      label: "Total cost", value: `$${mCur}k`, unit: "energy · water · waste",
      delta: `${mDeltaPct.toFixed(1)}% vs ${compLabel}`, deltaGood: mDeltaPct < 0,
    },
    {
      icon: Cloud, color: "#0F766E",
      label: "Carbon intensity", value: curMonthRow.intensity.toFixed(1), unit: "kgCO₂e / ORN",
      delta: `${avgYoyCarbon.toFixed(1)}% vs last year`, deltaGood: avgYoyCarbon < 0, tab: "environment",
    },
    {
      icon: TrendingDown, color: "#16a34a",
      label: "Est. cost avoidance", value: `$${Math.abs(mSavings)}k`, unit: `vs ${compLabel}`,
      delta: mSavings >= 0 ? "cost reduction" : "cost increase",
      deltaGood: mSavings >= 0, highlight: true,
    },
  ];

  /* ── Secondary KPI tiles ─────────────────────────────────────────────── */
  type SecondaryTile = {
    icon: React.ElementType; color: string;
    label: string; value: string; unit: string;
    delta: string; deltaGood: boolean; tab?: string;
  };

  const secondaryTiles: SecondaryTile[] = mode === "year" ? [
    {
      icon: Zap,     color: "#D97706",
      label: "Energy",          value: (ftot.energy / 1000).toFixed(1) + "k", unit: "MWh",
      delta: `${avgYoyEnergy.toFixed(1)}%`, deltaGood: avgYoyEnergy < 0, tab: "environment",
    },
    {
      icon: Droplet, color: "#0EA5E9",
      label: "Water",           value: (ftot.water / 1000).toFixed(0) + "k", unit: "m³",
      delta: "−7.8%", deltaGood: true, tab: "environment",
    },
    {
      icon: Recycle, color: "#7C3AED",
      label: "Waste diversion", value: `${Math.round(ftot.wDiv)}%`, unit: "diverted",
      delta: "+6 pp", deltaGood: true, tab: "environment",
    },
  ] : [
    {
      icon: Zap,     color: "#D97706",
      label: "Energy cost",  value: `$${Math.round(curMonthRow.energy * sh.energy)}k`, unit: "this month",
      delta: `${avgYoyEnergy.toFixed(1)}%`, deltaGood: avgYoyEnergy < 0, tab: "environment",
    },
    {
      icon: Droplet, color: "#0EA5E9",
      label: "Water cost",   value: `$${Math.round(curMonthRow.water * sh.water)}k`, unit: "this month",
      delta: "−7.8%", deltaGood: true, tab: "environment",
    },
    {
      icon: Recycle, color: "#7C3AED",
      label: "Waste diversion", value: `${Math.round(ftot.wDiv)}%`, unit: "diverted",
      delta: "+6 pp", deltaGood: true, tab: "environment",
    },
  ];

  /* ── Efficiency tiles (static portfolio benchmarks) ─────────────────── */
  const EFF_TILES = [
    {
      icon: Zap,     color: "#D97706",
      label: "Energy intensity",  value: "24.0", unit: "kWh / ORN",
      delta: -6.0, progress: 42, fromLabel: "28.0 (2022)", toLabel: "18.5 by 2030", tab: "environment",
    },
    {
      icon: Droplet, color: "#0EA5E9",
      label: "Water intensity",   value: "0.23", unit: "m³ / ORN",
      delta: -8.0, progress: 50, fromLabel: "0.28 (2022)", toLabel: "0.18 by 2030", tab: "environment",
    },
    {
      icon: Cloud,   color: "#0F6A3C",
      label: "Carbon intensity",  value: "16.3", unit: "kgCO₂e / ORN",
      delta: -10.0, progress: 52, fromLabel: "22.0 (2019)", toLabel: "11.0 by 2030", tab: "environment",
    },
    {
      icon: Recycle, color: "#7C3AED",
      label: "Waste diversion",   value: `${Math.round(ftot.wDiv)}%`, unit: "of waste diverted",
      delta: 6.0,
      progress: Math.round(Math.max(0, Math.min(100, ((ftot.wDiv - 45) / (80 - 45)) * 100))),
      fromLabel: "45% (2022)", toLabel: "80% by 2030", tab: "environment",
    },
  ];

  return (
    <div className="space-y-8">

      {/* ── 1. Executive KPIs ──────────────────────────────────────────── */}
      <div>
        <SectionHead title={`Executive Snapshot — ${periodLabel}`} />

        {/* Primary tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
          {primaryTiles.map((t) => {
            const Icon = t.icon;
            const Tag  = t.tab ? "button" : "div";
            return (
              <Tag
                key={t.label}
                onClick={t.tab ? () => onNavigate(t.tab!) : undefined}
                className={cn(
                  "card p-5 border-l-4 text-left flex flex-col gap-0",
                  t.highlight && "bg-good/5 border-good/40",
                  t.tab && "cursor-pointer hover:shadow-pop hover:-translate-y-0.5 transition-all"
                )}
                style={!t.highlight ? { borderLeftColor: t.color } : undefined}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg grid place-items-center shrink-0"
                    style={{ background: t.highlight ? "#16a34a18" : `${t.color}18` }}>
                    <Icon size={14} style={{ color: t.highlight ? "#16a34a" : t.color }} />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-500 leading-snug">
                    {t.label}
                  </span>
                </div>
                <div className={cn(
                  "text-[2rem] font-extrabold tabular-nums leading-none",
                  t.highlight ? "text-good" : "text-ink-900"
                )}>
                  {t.value}
                </div>
                <div className="text-[11px] text-ink-400 mt-0.5">{t.unit}</div>
                {t.subLabel && (
                  <div className="text-[10px] text-ink-400 mt-0.5 font-medium">{t.subLabel}</div>
                )}
                <div className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold mt-3 self-start",
                  t.deltaGood ? "bg-good/10 text-good" : "bg-bad/10 text-bad"
                )}>
                  {t.deltaGood ? <ArrowDownRight size={10}/> : <ArrowUpRight size={10}/>}
                  {t.delta}
                </div>
              </Tag>
            );
          })}
        </div>

        {/* Secondary tiles — compact horizontal */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {secondaryTiles.map((t) => {
            const Icon = t.icon;
            const Tag  = t.tab ? "button" : "div";
            return (
              <Tag
                key={t.label}
                onClick={t.tab ? () => onNavigate(t.tab!) : undefined}
                className={cn(
                  "card px-4 py-3 flex items-center gap-3 text-left",
                  t.tab && "cursor-pointer hover:shadow-pop hover:-translate-y-0.5 transition-all"
                )}
              >
                <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0"
                  style={{ background: `${t.color}15` }}>
                  <Icon size={14} style={{ color: t.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-500">
                    {t.label}
                  </div>
                  <div className="text-[1.4rem] font-extrabold tabular-nums text-ink-900 leading-tight">
                    {t.value}
                    <span className="text-[11px] font-normal text-ink-400 ml-1">{t.unit}</span>
                  </div>
                </div>
                <div className={cn(
                  "chip text-[11px] font-semibold shrink-0",
                  t.deltaGood ? "bg-good/10 text-good" : "bg-bad/10 text-bad"
                )}>
                  {t.deltaGood ? <ArrowDownRight size={9}/> : <ArrowUpRight size={9}/>}
                  {t.delta}
                </div>
              </Tag>
            );
          })}
        </div>
      </div>

      {/* ── 2. Chart + Insights ────────────────────────────────────────── */}
      <div>
        <SectionHead
          title={
            mode === "year"
              ? "Portfolio Cost & Performance"
              : `Property Breakdown — ${MONTH_NAMES[curMonthNum - 1]} ${filters.year}`
          }
          right={mode === "year" ? (
            <div className="flex items-center gap-2">
              <div className="flex bg-ink-100 rounded-lg p-0.5">
                {(["cost", "carbon"] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setChartMode(m)}
                    className={cn(
                      "h-6 px-2.5 rounded-md text-[11px] font-semibold transition-all capitalize",
                      chartMode === m ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-700"
                    )}
                  >
                    {m === "cost" ? "Cost" : "Carbon"}
                  </button>
                ))}
              </div>
            </div>
          ) : undefined}
        />

        <div className={cn("grid gap-4", mode === "year" ? "grid-cols-1 xl:grid-cols-12" : "")}>

          {/* Chart */}
          <div className={cn("card p-5", mode === "year" ? "xl:col-span-8" : "")}>
            {/* Summary strip */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mb-4 pb-4 border-b border-ink-100">
              {mode === "year" ? (
                chartMode === "cost" ? (
                  <>
                    <div className="text-[13px]"><span className="text-ink-500">This year </span><span className="font-bold text-ink-900">${(filteredTY/1000).toFixed(2)}M</span></div>
                    <div className="text-[13px]"><span className="text-ink-500">Prior year </span><span className="font-semibold text-ink-400">${(filteredPY/1000).toFixed(2)}M</span></div>
                    <div className="text-[13px]"><span className="text-ink-500">Saving </span><span className="font-bold text-good">${filteredSavings}k</span></div>
                    <div className="ml-auto flex flex-wrap items-center gap-3 text-[11px] text-ink-500">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-[#0F6A3C]"/>Energy</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-[#38bdf8]"/>Water</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-[#a78bfa]"/>Waste</span>
                      <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-slate-300 inline-block"/>Prior year</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-[13px]"><span className="text-ink-500">Portfolio avg </span><span className="font-bold text-ink-900">16.3 kgCO₂e/ORN</span></div>
                    <div className="text-[13px]"><span className="text-ink-500">Peak </span><span className="font-semibold text-bad">Apr — 17.7</span></div>
                    <div className="text-[13px]"><span className="text-ink-500">2030 target </span><span className="font-semibold text-good">11.0</span></div>
                  </>
                )
              ) : (
                <>
                  <div className="text-[13px]"><span className="text-ink-500">This month </span><span className="font-bold text-ink-900">${mCur}k</span></div>
                  <div className="text-[13px]"><span className="text-ink-500">vs {compLabel} </span><span className="font-semibold text-ink-400">${mComp}k</span></div>
                  <div className="text-[13px]"><span className="text-ink-500">{mSavings >= 0 ? "Saving" : "Over"} </span>
                    <span className={cn("font-bold", mSavings >= 0 ? "text-good" : "text-bad")}>${Math.abs(mSavings)}k</span>
                  </div>
                  <div className="ml-auto flex items-center gap-3 text-[11px] text-ink-500">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-[#0F6A3C]"/>Energy</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-[#38bdf8]"/>Water</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-[#a78bfa]"/>Waste</span>
                  </div>
                </>
              )}
            </div>

            {/* Chart body */}
            {mode === "year" ? (
              chartMode === "cost" ? (
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={scaledMonthly} barCategoryGap="24%">
                    <CartesianGrid vertical={false} stroke="#f3f4f6"/>
                    <XAxis dataKey="month" tick={{ fontSize:11, fill:"#6b7280" }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize:11, fill:"#6b7280" }} tickFormatter={v=>`$${v}k`} axisLine={false} tickLine={false} width={50}/>
                    <Tooltip content={<CostTip/>} cursor={{ fill:"rgba(0,0,0,0.025)" }}/>
                    <Bar dataKey="energy" stackId="a" fill="#0F6A3C" fillOpacity={0.88} isAnimationActive={false}/>
                    <Bar dataKey="water"  stackId="a" fill="#38bdf8" fillOpacity={0.85} isAnimationActive={false}/>
                    <Bar dataKey="waste"  stackId="a" fill="#a78bfa" fillOpacity={0.85} radius={[3,3,0,0]} isAnimationActive={false}/>
                    <Line dataKey="costPY" stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="5 3" dot={false} isAnimationActive={false}/>
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={scaledMonthly}>
                    <CartesianGrid vertical={false} stroke="#f3f4f6"/>
                    <XAxis dataKey="month" tick={{ fontSize:11, fill:"#6b7280" }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize:11, fill:"#0d9488" }} axisLine={false} tickLine={false} width={40} domain={[8,22]}/>
                    <Tooltip content={<CarbonTip/>} cursor={{ stroke:"#0d9488", strokeWidth:1, strokeDasharray:"4 2" }}/>
                    <ReferenceLine y={11} stroke="#16a34a" strokeDasharray="5 3" strokeWidth={1.5}
                      label={{ value:"2030 target", position:"right", style:{ fontSize:9, fill:"#16a34a" } }}/>
                    <Line dataKey="intensity" stroke="#0d9488" strokeWidth={2.5}
                      dot={{ fill:"#0d9488", r:3 }} activeDot={{ r:5 }} isAnimationActive={false}/>
                  </LineChart>
                </ResponsiveContainer>
              )
            ) : (
              <ResponsiveContainer width="100%" height={hotelChartHeight}>
                <BarChart layout="vertical" data={hotelMonthData} margin={{ left:0, right:16, top:4, bottom:4 }} barCategoryGap="28%">
                  <CartesianGrid horizontal={false} stroke="#f3f4f6"/>
                  <XAxis type="number" tick={{ fontSize:11, fill:"#6b7280" }} tickFormatter={v=>`$${v}k`} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="name" width={128} tick={{ fontSize:11, fill:"#374151" }} axisLine={false} tickLine={false}/>
                  <Tooltip content={<HotelTip/>} cursor={{ fill:"rgba(0,0,0,0.025)" }}/>
                  <Bar dataKey="energy" stackId="a" fill="#0F6A3C" fillOpacity={0.88} isAnimationActive={false}/>
                  <Bar dataKey="water"  stackId="a" fill="#38bdf8" fillOpacity={0.85} isAnimationActive={false}/>
                  <Bar dataKey="waste"  stackId="a" fill="#a78bfa" fillOpacity={0.85} radius={[0,3,3,0]} isAnimationActive={false}/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Insights panel — year mode only */}
          {mode === "year" && (
            <div className="xl:col-span-4 flex flex-col gap-3">
              {/* Headline */}
              <div className="card p-4 bg-good/5 border-good/25">
                <div className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide mb-1">Performance</div>
                <div className="text-[1.5rem] font-extrabold text-good leading-none">
                  {monthlyStats.below}/{monthlyStats.total}
                </div>
                <div className="text-[12px] text-ink-600 mt-0.5">months below prior year spend</div>
              </div>

              {/* Best month */}
              <div className="card p-4">
                <div className="text-[11px] font-semibold text-ink-400 uppercase tracking-wide mb-1">Best month</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[1.2rem] font-extrabold text-ink-900">{monthlyStats.best.month}</span>
                  <span className="text-[13px] font-semibold text-good">
                    −${Math.abs(monthlyStats.best.diff)}k
                  </span>
                </div>
                <div className="text-[11px] text-ink-400">vs prior year</div>
              </div>

              {/* Peak carbon */}
              <div className="card p-4">
                <div className="text-[11px] font-semibold text-ink-400 uppercase tracking-wide mb-1">Peak carbon intensity</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[1.2rem] font-extrabold text-ink-900">{monthlyStats.peak.intensity}</span>
                  <span className="text-[11px] text-ink-400">kgCO₂e/ORN</span>
                </div>
                <div className="text-[11px] text-ink-400">{monthlyStats.peak.month}</div>
              </div>

              {/* Est. avoidance breakdown */}
              <div className="card p-4 flex-1">
                <div className="text-[11px] font-semibold text-ink-400 uppercase tracking-wide mb-2">Est. avoidance breakdown</div>
                <div className="space-y-2">
                  {[
                    { label:"Energy", color:"#0F6A3C", pct: Math.round(sh.energy * 70) },
                    { label:"Water",  color:"#38bdf8", pct: Math.round(sh.water  * 20) },
                    { label:"Waste",  color:"#a78bfa", pct: Math.round(sh.waste  * 10) },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between text-[11px] text-ink-500 mb-0.5">
                        <span>{item.label}</span>
                        <span className="font-semibold">{item.pct}%</span>
                      </div>
                      <div className="h-1.5 bg-ink-100 rounded-full">
                        <div className="h-full rounded-full" style={{ width:`${item.pct}%`, background: item.color }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Efficiency ──────────────────────────────────────────────── */}
      <div>
        <SectionHead
          title="Efficiency — intensity per occupied room night"
          action="View environment"
          onClick={() => onNavigate("environment")}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {EFF_TILES.map((t) => {
            const Icon = t.icon;
            const progColor = t.progress >= 60 ? "#16a34a" : t.progress >= 40 ? "#d97706" : "#ef4444";
            const isGood = t.delta < 0 || (t.label.includes("diversion") && t.delta > 0);
            return (
              <button
                key={t.label}
                onClick={() => onNavigate(t.tab)}
                className="card p-4 border-l-4 flex flex-col gap-3 text-left hover:shadow-pop hover:-translate-y-0.5 transition-all"
                style={{ borderLeftColor: t.color }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md grid place-items-center shrink-0" style={{ background:`${t.color}18` }}>
                      <Icon size={13} style={{ color: t.color }}/>
                    </div>
                    <span className="text-[11px] font-semibold text-ink-600 leading-snug">{t.label}</span>
                  </div>
                  <span className={cn("chip shrink-0 text-[10px] font-bold", isGood ? "bg-good/10 text-good" : "bg-bad/10 text-bad")}>
                    {t.delta > 0 ? "+" : ""}{t.delta.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-[1.75rem] font-extrabold tabular-nums text-ink-900 leading-none">{t.value}</span>
                  <span className="text-[11px] text-ink-400 ml-1">{t.unit}</span>
                </div>
                <div className="space-y-1.5">
                  <div className="h-1.5 rounded-full bg-ink-100 relative">
                    <div className="absolute left-0 top-0 h-full rounded-full" style={{ width:`${t.progress}%`, background: progColor }}/>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-ink-400">
                    <span>{t.fromLabel}</span>
                    <span className="font-semibold" style={{ color: progColor }}>{t.progress}%</span>
                    <span>{t.toLabel}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 4. Hotel performance ────────────────────────────────────────── */}
      <div>
        <SectionHead
          title="Hotel Performance"
          action="View all hotels"
          onClick={() => onNavigate("hotels")}
        />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          {/* Leaders */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Award size={14} className="text-good shrink-0"/>
              <span className="text-[12px] font-semibold text-ink-800">Leading — lowest carbon intensity</span>
            </div>
            <div className="space-y-2">
              {leaders.map((h, i) => (
                <div key={h.id} className="flex items-center gap-3 py-2 border-t border-ink-100 first:border-0 first:pt-0">
                  <div className="w-5 h-5 rounded-full bg-good/15 text-good text-[10px] font-bold grid place-items-center shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-ink-800 truncate">{h.name}</div>
                    <div className="text-[10px] text-ink-400">{h.region} · {h.dataConfidence}% confidence</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[13px] font-bold text-ink-900">{h.carbonIntensity.toFixed(1)}</div>
                    <div className="text-[10px] text-ink-400">kgCO₂e/ORN</div>
                  </div>
                  <div className="chip bg-good/10 text-good text-[10px] font-semibold shrink-0">
                    {h.yoyCarbon.toFixed(1)}%
                  </div>
                </div>
              ))}
              {leaders.length === 0 && (
                <div className="text-[12px] text-ink-400 py-4 text-center">No hotels with sufficient data.</div>
              )}
            </div>
          </div>

          {/* Needs attention */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={14} className="text-warn shrink-0"/>
              <span className="text-[12px] font-semibold text-ink-800">Needs attention</span>
            </div>
            <div className="space-y-2">
              {attention.map((h) => (
                <div key={h.id} className="flex items-center gap-3 py-2 border-t border-ink-100 first:border-0 first:pt-0">
                  <div className="w-5 h-5 rounded-full bg-warn/15 text-warn grid place-items-center shrink-0">
                    <AlertTriangle size={9}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-ink-800 truncate">{h.name}</div>
                    <div className="text-[10px] text-warn font-medium">{attentionReason(h)}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[13px] font-bold text-ink-900">{h.carbonIntensity.toFixed(1)}</div>
                    <div className="text-[10px] text-ink-400">kgCO₂e/ORN</div>
                  </div>
                  <div className={cn("chip text-[10px] font-semibold shrink-0",
                    h.dataConfidence < 70 ? "bg-warn/10 text-warn" : "bg-bad/10 text-bad"
                  )}>
                    {h.dataConfidence < 70 ? `${h.dataConfidence}% data` : `${h.yoyCarbon.toFixed(1)}% YoY`}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
