import { useMemo } from "react";
import {
  Zap, Droplet, Cloud, Recycle,
  DollarSign, TrendingDown, ArrowRight,
  ArrowDownRight, ArrowUpRight,
} from "lucide-react";
import {
  ComposedChart, BarChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import { PORTFOLIO_HOTELS } from "@/lib/mock";
import type { DashboardFilters } from "./FilterBar";

type Props = {
  filters: DashboardFilters;
  onNavigate: (tab: string) => void;
};

/* ── Portfolio-level monthly cost data ($k) ──────────────────────────────── */
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

/* Pre-computed portfolio-level physical totals (for share calculation) */
const PORT = {
  energy: PORTFOLIO_HOTELS.reduce((s, h) => s + h.energy_mwh, 0),
  water:  PORTFOLIO_HOTELS.reduce((s, h) => s + h.water_m3,   0),
  carbon: PORTFOLIO_HOTELS.reduce((s, h) => s + h.carbon_t,   0),
  waste:  PORTFOLIO_HOTELS.reduce((s, h) => s + h.waste_t,    0),
};

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* Calendar month number → MONTHLY index (fiscal year starts May) */
function monthToIdx(m: number) { return (m - 5 + 12) % 12; }

/* ── Section header ──────────────────────────────────────────────────────── */
function SectionHead({ title, action, onClick }: {
  title: string; action?: string; onClick?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className="w-0.5 h-5 rounded-full bg-brand-600 shrink-0" />
        <h2 className="text-[14px] font-semibold text-ink-800">{title}</h2>
      </div>
      {action && onClick && (
        <button
          onClick={onClick}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700 hover:text-brand-900 transition-colors"
        >
          {action} <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
}

/* ── Year-mode chart tooltip ─────────────────────────────────────────────── */
function YearChartTip({ active, payload, label }: {
  active?: boolean;
  payload?: { dataKey: string; value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const energy = payload.find(p => p.dataKey === "energy");
  const water  = payload.find(p => p.dataKey === "water");
  const waste  = payload.find(p => p.dataKey === "waste");
  const py     = payload.find(p => p.dataKey === "costPY");
  const int    = payload.find(p => p.dataKey === "intensity");
  const total  = (energy?.value ?? 0) + (water?.value ?? 0) + (waste?.value ?? 0);
  const diff   = py ? total - py.value : null;

  return (
    <div className="bg-white border border-ink-200 rounded-xl shadow-pop px-3.5 py-3 text-[12px] min-w-[190px]">
      <div className="font-semibold text-ink-800 mb-2">{label}</div>
      <div className="space-y-0.5">
        {energy && <div className="flex justify-between gap-4"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm inline-block bg-[#0F6A3C]" />Energy</span><span className="font-semibold">${energy.value}k</span></div>}
        {water  && <div className="flex justify-between gap-4"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm inline-block bg-[#38bdf8]" />Water</span><span className="font-semibold">${water.value}k</span></div>}
        {waste  && <div className="flex justify-between gap-4"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm inline-block bg-[#a78bfa]" />Waste</span><span className="font-semibold">${waste.value}k</span></div>}
        <div className="flex justify-between gap-4 pt-1 mt-1 border-t border-ink-100">
          <span className="text-ink-500">Total</span>
          <span className="font-bold text-ink-900">${total}k</span>
        </div>
        {diff !== null && (
          <div className={cn("flex justify-between gap-4 text-[11px] font-semibold", diff < 0 ? "text-good" : "text-bad")}>
            <span>vs last year</span>
            <span>{diff < 0 ? "Saved " : "+"}${Math.abs(diff)}k</span>
          </div>
        )}
      </div>
      {int && (
        <div className="flex justify-between gap-4 mt-2 pt-2 border-t border-ink-100 text-[11px]">
          <span className="text-ink-500">Carbon intensity</span>
          <span className="font-bold" style={{ color:"#0d9488" }}>{int.value} kgCO₂e/ORN</span>
        </div>
      )}
    </div>
  );
}

/* ── Month-mode (hotel breakdown) tooltip ────────────────────────────────── */
function HotelChartTip({ active, payload, label }: {
  active?: boolean;
  payload?: { dataKey: string; value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const energy = payload.find(p => p.dataKey === "energy");
  const water  = payload.find(p => p.dataKey === "water");
  const waste  = payload.find(p => p.dataKey === "waste");
  const total  = (energy?.value ?? 0) + (water?.value ?? 0) + (waste?.value ?? 0);
  return (
    <div className="bg-white border border-ink-200 rounded-xl shadow-pop px-3.5 py-3 text-[12px] min-w-[170px]">
      <div className="font-semibold text-ink-800 mb-2 truncate max-w-[160px]">{label}</div>
      <div className="space-y-0.5">
        {energy && <div className="flex justify-between gap-4"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm inline-block bg-[#0F6A3C]" />Energy</span><span className="font-semibold">${energy.value}k</span></div>}
        {water  && <div className="flex justify-between gap-4"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm inline-block bg-[#38bdf8]" />Water</span><span className="font-semibold">${water.value}k</span></div>}
        {waste  && <div className="flex justify-between gap-4"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm inline-block bg-[#a78bfa]" />Waste</span><span className="font-semibold">${waste.value}k</span></div>}
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

  /* ── Filtered hotels ───────────────────────────────────────────────────── */
  const filteredHotels = useMemo(() =>
    filters.hotelIds === "all"
      ? PORTFOLIO_HOTELS
      : PORTFOLIO_HOTELS.filter(h => (filters.hotelIds as string[]).includes(h.id)),
    [filters.hotelIds]
  );

  /* ── Filtered physical totals ──────────────────────────────────────────── */
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

  /* ── Shares (for scaling cost data) ───────────────────────────────────── */
  const sh = useMemo(() => ({
    energy: PORT.energy > 0 ? ftot.energy / PORT.energy : 0,
    water:  PORT.water  > 0 ? ftot.water  / PORT.water  : 0,
    waste:  PORT.waste  > 0 ? ftot.waste  / PORT.waste  : 0,
  }), [ftot]);
  const avgShare = (sh.energy + sh.water + sh.waste) / 3;

  /* ── Weighted avg YoY for filtered hotels ──────────────────────────────── */
  const avgYoyCarbon = filteredHotels.length > 0
    ? filteredHotels.reduce((s, h) => s + h.yoyCarbon, 0) / filteredHotels.length
    : 0;
  const avgYoyEnergy = filteredHotels.length > 0
    ? filteredHotels.reduce((s, h) => s + h.yoyEnergy, 0) / filteredHotels.length
    : 0;

  /* ── Year-mode: scaled monthly trend ──────────────────────────────────── */
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

  /* ── Month-mode: current & comparison rows ─────────────────────────────── */
  const curMonthNum  = month ?? 5;
  const curMonthRow  = MONTHLY[monthToIdx(curMonthNum)];

  const compMonthRow = useMemo(() => {
    if (comparison.type === "prior-month") {
      const prev = curMonthNum === 1 ? 12 : curMonthNum - 1;
      return MONTHLY[monthToIdx(prev)];
    }
    // same-month-ly or custom: use costPY as the comparison total proxy
    return null;
  }, [comparison, curMonthNum]);

  /* Month-mode cost totals (filtered) */
  const mCur  = Math.round((curMonthRow.energy * sh.energy + curMonthRow.water * sh.water + curMonthRow.waste * sh.waste));
  const mComp = compMonthRow
    ? Math.round(compMonthRow.energy * sh.energy + compMonthRow.water * sh.water + compMonthRow.waste * sh.waste)
    : Math.round(curMonthRow.costPY * avgShare);
  const mSavings  = mComp - mCur;
  const mDeltaPct = mComp > 0 ? ((mCur - mComp) / mComp) * 100 : 0;

  /* Month-mode: per-hotel breakdown for horizontal chart */
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

  /* ── Comparison label (for chart header) ──────────────────────────────── */
  const compLabel = (() => {
    const mn = MONTH_NAMES[curMonthNum - 1];
    if (comparison.type === "prior-year")    return `${(comparison as { type: "prior-year"; year: number }).year}`;
    if (comparison.type === "same-month-ly") return `${mn} ${filters.year - 1}`;
    if (comparison.type === "prior-month") {
      const p = curMonthNum === 1 ? 12 : curMonthNum - 1;
      return `${MONTH_NAMES[p - 1]} ${curMonthNum === 1 ? filters.year - 1 : filters.year}`;
    }
    if (comparison.type === "custom") {
      const c = comparison as { type: "custom"; year: number; month: number };
      return `${MONTH_NAMES[c.month - 1]} ${c.year}`;
    }
    return "";
  })();

  /* ── Efficiency tiles — static portfolio-level benchmarks ───────────────
     Intensity targets require a consistent normalised dataset; these use the
     pre-validated portfolio KPIs rather than raw PORTFOLIO_HOTELS sums whose
     scale differs from the target pathway numbers.                           */
  const EFF_TILES = [
    {
      icon: Zap, color: "#D97706",
      label: "Energy intensity", value: "24.0", unit: "kWh / ORN",
      delta: -6.0,
      progress: 42,
      fromLabel: "28.0 (2022)", toLabel: "18.5 by 2030", tab: "environment",
    },
    {
      icon: Droplet, color: "#0EA5E9",
      label: "Water intensity", value: "0.23", unit: "m³ / ORN",
      delta: -8.0,
      progress: 50,
      fromLabel: "0.28 (2022)", toLabel: "0.18 by 2030", tab: "environment",
    },
    {
      icon: Cloud, color: "#0F6A3C",
      label: "Carbon intensity", value: "16.3", unit: "kgCO₂e / ORN",
      delta: -10.0,
      progress: 52,
      fromLabel: "22.0 (2019)", toLabel: "11.0 by 2030", tab: "environment",
    },
    {
      icon: Recycle, color: "#7C3AED",
      label: "Waste diversion", value: "64%", unit: "of waste diverted",
      delta: 6.0,
      progress: 54,
      fromLabel: "45% (2022)", toLabel: "80% by 2030", tab: "environment",
    },
  ];

  /* ── Snap tiles (year vs month mode) ──────────────────────────────────── */
  const snapTiles = mode === "year"
    ? [
        {
          icon: DollarSign, iconBg: "bg-ink-100 text-ink-600",
          label: "Total spend", value: `$${(filteredTY / 1000).toFixed(2)}M`, unit: "energy · water · waste",
          delta: `−${((1 - filteredTY / filteredPY) * 100).toFixed(1)}% vs ${compLabel}`,
          deltaGood: true, highlight: false,
        },
        {
          icon: TrendingDown, iconBg: "bg-good/15 text-good",
          label: "Saved this year", value: `$${filteredSavings}k`, unit: `vs ${compLabel} spend`,
          delta: "from reduced consumption", deltaGood: true, highlight: true,
        },
        {
          icon: Zap, iconBg: "bg-pillar-energy/10 text-pillar-energy",
          label: "Energy", value: ftot.energy.toLocaleString(), unit: "MWh total",
          delta: `${avgYoyEnergy.toFixed(1)}% vs last year`, deltaGood: avgYoyEnergy < 0, tab: "environment",
        },
        {
          icon: Droplet, iconBg: "bg-pillar-water/10 text-pillar-water",
          label: "Water", value: ftot.water.toLocaleString(), unit: "m³ total",
          delta: "−7.8% vs last year", deltaGood: true, tab: "environment",
        },
        {
          icon: Cloud, iconBg: "bg-pillar-carbon/10 text-pillar-carbon",
          label: "Carbon", value: ftot.carbon.toLocaleString(), unit: "tCO₂e Scope 1+2",
          delta: `${avgYoyCarbon.toFixed(1)}% vs last year`, deltaGood: avgYoyCarbon < 0, tab: "environment",
        },
        {
          icon: Recycle, iconBg: "bg-pillar-waste/10 text-pillar-waste",
          label: "Waste diversion", value: `${Math.round(ftot.wDiv)}%`,
          unit: `${ftot.waste.toLocaleString()} t generated`,
          delta: "+6 pp vs last year", deltaGood: true, tab: "environment",
        },
      ]
    : [
        {
          icon: DollarSign, iconBg: "bg-ink-100 text-ink-600",
          label: "Total cost", value: `$${mCur}k`, unit: "energy · water · waste",
          delta: `${mDeltaPct.toFixed(1)}% vs ${compLabel}`, deltaGood: mDeltaPct < 0,
          highlight: false,
        },
        {
          icon: TrendingDown, iconBg: mSavings >= 0 ? "bg-good/15 text-good" : "bg-bad/15 text-bad",
          label: mSavings >= 0 ? "Saved vs comparison" : "Over vs comparison",
          value: `$${Math.abs(mSavings)}k`,
          unit: `vs ${compLabel}`,
          delta: mSavings >= 0 ? "cost reduction" : "cost increase",
          deltaGood: mSavings >= 0, highlight: true,
        },
        {
          icon: Zap, iconBg: "bg-pillar-energy/10 text-pillar-energy",
          label: "Energy cost", value: `$${Math.round(curMonthRow.energy * sh.energy)}k`, unit: "this month",
          delta: `${avgYoyEnergy.toFixed(1)}% vs last year`, deltaGood: avgYoyEnergy < 0, tab: "environment",
        },
        {
          icon: Droplet, iconBg: "bg-pillar-water/10 text-pillar-water",
          label: "Water cost", value: `$${Math.round(curMonthRow.water * sh.water)}k`, unit: "this month",
          delta: "−7.8% vs last year", deltaGood: true, tab: "environment",
        },
        {
          icon: Cloud, iconBg: "bg-pillar-carbon/10 text-pillar-carbon",
          label: "Carbon intensity", value: curMonthRow.intensity.toFixed(1), unit: "kgCO₂e / ORN",
          delta: `${avgYoyCarbon.toFixed(1)}% vs last year`, deltaGood: avgYoyCarbon < 0, tab: "environment",
        },
        {
          icon: Recycle, iconBg: "bg-pillar-waste/10 text-pillar-waste",
          label: "Waste cost", value: `$${Math.round(curMonthRow.waste * sh.waste)}k`, unit: "this month",
          delta: "+6 pp diversion YoY", deltaGood: true, tab: "environment",
        },
      ];

  /* ── Period label for section header ──────────────────────────────────── */
  const periodLabel = mode === "year"
    ? `${filters.year} vs ${compLabel}`
    : `${MONTH_NAMES[curMonthNum - 1]} ${filters.year} vs ${compLabel}`;

  return (
    <div className="space-y-10">

      {/* ── 1. Executive Snapshot ────────────────────────────────────────── */}
      <div>
        <SectionHead title={`Executive Snapshot — ${periodLabel}`} />
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          {snapTiles.map((t) => {
            const Icon = t.icon;
            const Tag  = "tab" in t && t.tab ? "button" : "div";
            return (
              <Tag
                key={t.label}
                onClick={"tab" in t && t.tab ? () => onNavigate(t.tab!) : undefined}
                className={cn(
                  "card p-5 flex flex-col gap-0 text-left",
                  t.highlight && "bg-good/5 border-good/25",
                  "tab" in t && t.tab && "cursor-pointer hover:shadow-pop hover:-translate-y-0.5 transition-all"
                )}
              >
                <div className={cn("w-9 h-9 rounded-xl grid place-items-center mb-3 shrink-0", t.iconBg)}>
                  <Icon size={16} />
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-500 leading-snug">
                  {t.label}
                </div>
                <div className={cn(
                  "text-[1.65rem] font-extrabold tabular-nums mt-1 leading-none",
                  t.highlight ? (t.deltaGood ? "text-good" : "text-bad") : "text-ink-900"
                )}>
                  {t.value}
                </div>
                <div className="text-[11px] text-ink-400 mt-0.5">{t.unit}</div>
                <div className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold mt-2 self-start",
                  t.deltaGood ? "bg-good/10 text-good" : "bg-bad/10 text-bad"
                )}>
                  {t.deltaGood ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}
                  {t.delta}
                </div>
                {"tab" in t && t.tab && (
                  <span className="text-[10px] text-ink-400 mt-1.5 flex items-center gap-0.5">
                    View detail <ArrowRight size={9} />
                  </span>
                )}
              </Tag>
            );
          })}
        </div>
      </div>

      {/* ── 2. Cost & Performance chart ──────────────────────────────────── */}
      <div>
        <SectionHead
          title={
            mode === "year"
              ? "Portfolio Cost & Performance — monthly trend"
              : `Property Breakdown — ${MONTH_NAMES[curMonthNum - 1]} ${filters.year}`
          }
          action="View environment"
          onClick={() => onNavigate("environment")}
        />
        <div className="card p-6">

          {/* Summary strip */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-5 pb-5 border-b border-ink-100">
            {mode === "year" ? (
              <>
                <div className="text-[13px]">
                  <span className="text-ink-500">This year  </span>
                  <span className="font-bold text-ink-900">${(filteredTY / 1000).toFixed(2)}M</span>
                </div>
                <div className="text-[13px]">
                  <span className="text-ink-500">Prior year  </span>
                  <span className="font-semibold text-ink-400">${(filteredPY / 1000).toFixed(2)}M</span>
                </div>
                <div className="text-[13px]">
                  <span className="text-ink-500">Saving  </span>
                  <span className="font-bold text-good">${filteredSavings}k</span>
                </div>
                {/* Legend */}
                <div className="ml-auto flex flex-wrap items-center gap-4 text-[11px] text-ink-500">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block bg-[#0F6A3C] opacity-90" />Energy</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block bg-[#38bdf8]" />Water</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block bg-[#a78bfa]" />Waste</span>
                  <span className="flex items-center gap-1.5"><span className="w-5 border-t-2 border-dashed border-slate-300 inline-block" />Prior year</span>
                  <span className="flex items-center gap-1.5"><span className="w-5 border-t-2 border-dashed inline-block" style={{ borderColor:"#0d9488" }} />Carbon intensity</span>
                </div>
              </>
            ) : (
              <>
                <div className="text-[13px]">
                  <span className="text-ink-500">This month  </span>
                  <span className="font-bold text-ink-900">${mCur}k</span>
                </div>
                <div className="text-[13px]">
                  <span className="text-ink-500">vs {compLabel}  </span>
                  <span className="font-semibold text-ink-400">${mComp}k</span>
                </div>
                <div className="text-[13px]">
                  <span className="text-ink-500">{mSavings >= 0 ? "Saving" : "Over"}  </span>
                  <span className={cn("font-bold", mSavings >= 0 ? "text-good" : "text-bad")}>
                    ${Math.abs(mSavings)}k
                  </span>
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-4 text-[11px] text-ink-500">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block bg-[#0F6A3C] opacity-90" />Energy</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block bg-[#38bdf8]" />Water</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block bg-[#a78bfa]" />Waste</span>
                </div>
              </>
            )}
          </div>

          {mode === "year" ? (
            /* ── Year: 12-month stacked bar + intensity overlay ── */
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={scaledMonthly} barCategoryGap="24%" barGap={0}>
                <CartesianGrid vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize:11, fill:"#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="cost" orientation="left" tick={{ fontSize:11, fill:"#6b7280" }} tickFormatter={v => `$${v}k`} axisLine={false} tickLine={false} width={52} domain={[0, 560]} />
                <YAxis yAxisId="int" orientation="right" tick={{ fontSize:11, fill:"#0d9488" }} axisLine={false} tickLine={false} width={34} domain={[8, 22]} label={{ value:"kgCO₂e/ORN", angle:90, position:"insideRight", offset:6, style:{ fontSize:9, fill:"#0d9488" } }} />
                <Tooltip content={<YearChartTip />} cursor={{ fill:"rgba(0,0,0,0.025)" }} />
                <Bar yAxisId="cost" dataKey="energy" stackId="a" fill="#0F6A3C" fillOpacity={0.88} isAnimationActive={false} />
                <Bar yAxisId="cost" dataKey="water"  stackId="a" fill="#38bdf8" fillOpacity={0.85} isAnimationActive={false} />
                <Bar yAxisId="cost" dataKey="waste"  stackId="a" fill="#a78bfa" fillOpacity={0.85} radius={[3,3,0,0]} isAnimationActive={false} />
                <Line yAxisId="cost" dataKey="costPY" stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
                <Line yAxisId="int"  dataKey="intensity" stroke="#0d9488" strokeWidth={2} strokeDasharray="5 3" dot={{ fill:"#0d9488", r:3 }} activeDot={{ r:5 }} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            /* ── Month: horizontal stacked bars per hotel ── */
            <ResponsiveContainer width="100%" height={hotelChartHeight}>
              <BarChart
                layout="vertical"
                data={hotelMonthData}
                margin={{ left: 0, right: 24, top: 4, bottom: 4 }}
                barCategoryGap="28%"
              >
                <CartesianGrid horizontal={false} stroke="#f3f4f6" />
                <XAxis
                  type="number"
                  tick={{ fontSize:11, fill:"#6b7280" }}
                  tickFormatter={v => `$${v}k`}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tick={{ fontSize:11, fill:"#374151" }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip content={<HotelChartTip />} cursor={{ fill:"rgba(0,0,0,0.025)" }} />
                <Bar dataKey="energy" stackId="a" fill="#0F6A3C" fillOpacity={0.88} isAnimationActive={false} />
                <Bar dataKey="water"  stackId="a" fill="#38bdf8" fillOpacity={0.85} isAnimationActive={false} />
                <Bar dataKey="waste"  stackId="a" fill="#a78bfa" fillOpacity={0.85} radius={[0,3,3,0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── 3. Efficiency — intensity per ORN ────────────────────────────── */}
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
                className="card p-5 border-l-4 flex flex-col gap-4 text-left hover:shadow-pop hover:-translate-y-0.5 transition-all cursor-pointer"
                style={{ borderLeftColor: t.color }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg grid place-items-center shrink-0" style={{ background:`${t.color}18` }}>
                      <Icon size={14} style={{ color: t.color }} />
                    </div>
                    <span className="text-[11px] font-semibold text-ink-600 leading-snug">{t.label}</span>
                  </div>
                  <span className={cn("chip shrink-0 text-[11px] font-bold", isGood ? "bg-good/10 text-good" : "bg-bad/10 text-bad")}>
                    {t.delta > 0 ? "+" : ""}{typeof t.delta === "number" ? t.delta.toFixed(1) : t.delta}%
                  </span>
                </div>
                <div>
                  <span className="text-[2rem] font-extrabold tabular-nums text-ink-900 leading-none">{t.value}</span>
                  <span className="text-[12px] text-ink-400 ml-1.5">{t.unit}</span>
                </div>
                <div className="space-y-2">
                  <div className="relative h-2 rounded-full bg-ink-100">
                    <div className="absolute left-0 top-0 h-full rounded-full" style={{ width:`${t.progress}%`, background: progColor }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-ink-400">
                    <span>{t.fromLabel}</span>
                    <span className="font-semibold" style={{ color: progColor }}>{t.progress}% there</span>
                    <span>{t.toLabel}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Quick nav ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 pt-4 border-t border-ink-100">
        {[
          { label: "Environment detail",    tab: "environment" },
          { label: "Targets & commitments", tab: "targets"     },
          { label: "Hotels breakdown",      tab: "hotels"      },
          { label: "Social & Governance",   tab: "social"      },
        ].map(l => (
          <button
            key={l.tab}
            onClick={() => onNavigate(l.tab)}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand-700 hover:text-brand-900
                       border border-brand-100 hover:border-brand-200 rounded-xl px-3.5 py-2 bg-white hover:bg-brand-50 transition-colors"
          >
            {l.label} <ArrowRight size={11} />
          </button>
        ))}
      </div>

    </div>
  );
}
