import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PORTFOLIO_HOTELS } from "@/lib/mock";

/* ── Shared type (imported by Dashboard + OverviewTab) ───────────────────── */
export type DashboardFilters = {
  hotelIds: "all" | string[];
  mode: "year" | "month";
  year: number;
  month: number | null;   // 1–12; null in year mode
  comparison:
    | { type: "prior-year"; year: number }
    | { type: "same-month-ly" }
    | { type: "prior-month" }
    | { type: "custom"; year: number; month: number };
};

export const DEFAULT_FILTERS: DashboardFilters = {
  hotelIds: "all",
  mode: "year",
  year: 2025,
  month: null,
  comparison: { type: "prior-year", year: 2024 },
};

type Props = {
  filters: DashboardFilters;
  onChange: (f: DashboardFilters) => void;
};

/* ── Static options ──────────────────────────────────────────────────────── */
const YEARS = [2025, 2024, 2023, 2022];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const REGION_GROUPS: { region: string; hotels: typeof PORTFOLIO_HOTELS }[] =
  Object.entries(
    PORTFOLIO_HOTELS.reduce<Record<string, typeof PORTFOLIO_HOTELS>>((acc, h) => {
      (acc[h.region] ??= []).push(h);
      return acc;
    }, {})
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([region, hotels]) => ({ region, hotels }));

const ALL_IDS = PORTFOLIO_HOTELS.map(h => h.id);

/* ── Properties pill label ───────────────────────────────────────────────── */
function propertiesLabel(hotelIds: "all" | string[]): string {
  if (hotelIds === "all" || hotelIds.length === ALL_IDS.length) return "All Properties";
  if (hotelIds.length === 0) return "No properties";
  if (hotelIds.length === 1)
    return PORTFOLIO_HOTELS.find(h => h.id === hotelIds[0])?.shortName ?? "1 property";
  for (const { region, hotels } of REGION_GROUPS) {
    const rIds = hotels.map(h => h.id).sort().join(",");
    if ([...hotelIds].sort().join(",") === rIds) return `${region} (${hotels.length})`;
  }
  return `${hotelIds.length} of ${ALL_IDS.length} properties`;
}

/* ── Compact styled select ───────────────────────────────────────────────── */
function Sel({ value, onChange, children, className }: {
  value: string | number;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative inline-flex items-center shrink-0", className)}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-8 pl-2.5 pr-7 rounded-lg border border-ink-200 bg-white text-[12px] font-semibold
                   text-ink-700 appearance-none cursor-pointer hover:border-ink-300 transition-colors
                   focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
      >
        {children}
      </select>
      <ChevronDown size={11} className="absolute right-2 pointer-events-none text-ink-400" />
    </div>
  );
}

/* ── Properties tree dropdown ────────────────────────────────────────────── */
function PropertiesDropdown({ hotelIds, onChange }: {
  hotelIds: "all" | string[];
  onChange: (ids: "all" | string[]) => void;
}) {
  const [open, setOpen]       = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(REGION_GROUPS.map(g => g.region))
  );
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const selected = hotelIds === "all" ? ALL_IDS : hotelIds;

  function regionState(hotels: typeof PORTFOLIO_HOTELS) {
    const n = hotels.filter(h => selected.includes(h.id)).length;
    return { checked: n === hotels.length, indeterminate: n > 0 && n < hotels.length };
  }

  function toggleRegion(hotels: typeof PORTFOLIO_HOTELS) {
    const ids = hotels.map(h => h.id);
    const allIn = ids.every(id => selected.includes(id));
    const next = allIn
      ? selected.filter(id => !ids.includes(id))
      : Array.from(new Set([...selected, ...ids]));
    onChange(next.length === ALL_IDS.length ? "all" : next);
  }

  function toggleHotel(id: string) {
    const next = selected.includes(id)
      ? selected.filter(i => i !== id)
      : [...selected, id];
    onChange(next.length === ALL_IDS.length ? "all" : next);
  }

  function toggleRegionExpand(region: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(region) ? next.delete(region) : next.add(region);
      return next;
    });
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg border border-ink-200 bg-white
                   text-[12px] font-semibold text-ink-700 hover:border-ink-300 hover:bg-ink-50
                   focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-colors whitespace-nowrap"
      >
        {propertiesLabel(hotelIds)}
        <ChevronDown
          size={11}
          className={cn("text-ink-400 transition-transform duration-150 shrink-0", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-64 bg-white border border-ink-200 rounded-xl shadow-pop z-50 py-1.5">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-ink-100 mb-1">
            <span className="text-[11px] text-ink-500">
              <span className="font-semibold text-ink-700">{selected.length}</span>
              {" / "}{ALL_IDS.length} selected
            </span>
            <div className="flex gap-3">
              <button
                onClick={() => onChange("all")}
                className="text-[11px] font-semibold text-brand-700 hover:text-brand-900"
              >All</button>
              <button
                onClick={() => onChange([])}
                className="text-[11px] font-semibold text-ink-400 hover:text-ink-700"
              >None</button>
            </div>
          </div>

          {/* Tree */}
          <div className="max-h-72 overflow-y-auto">
            {REGION_GROUPS.map(({ region, hotels }) => {
              const { checked, indeterminate } = regionState(hotels);
              const isExp = expanded.has(region);
              return (
                <div key={region}>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-ink-50">
                    <button
                      onClick={() => toggleRegionExpand(region)}
                      className="shrink-0 text-ink-400 hover:text-ink-600 w-4"
                    >
                      <ChevronRight
                        size={12}
                        className={cn("transition-transform duration-150", isExp && "rotate-90")}
                      />
                    </button>
                    <label className="flex items-center gap-2 flex-1 cursor-pointer min-w-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        ref={el => { if (el) el.indeterminate = indeterminate; }}
                        onChange={() => toggleRegion(hotels)}
                        className="rounded border-ink-300 text-brand-600 focus:ring-brand-500 shrink-0 cursor-pointer"
                      />
                      <span className="text-[12px] font-semibold text-ink-800 truncate">{region}</span>
                      <span className="text-[11px] text-ink-400 ml-auto shrink-0">{hotels.length}</span>
                    </label>
                  </div>
                  {isExp && hotels.map(hotel => (
                    <label
                      key={hotel.id}
                      className="flex items-center gap-2 px-3 py-1 pl-9 hover:bg-ink-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(hotel.id)}
                        onChange={() => toggleHotel(hotel.id)}
                        className="rounded border-ink-300 text-brand-600 focus:ring-brand-500 shrink-0 cursor-pointer"
                      />
                      <span className="text-[12px] text-ink-600 truncate">{hotel.shortName}</span>
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Month comparison picker ─────────────────────────────────────────────── */
type MonthComparison = Exclude<DashboardFilters["comparison"], { type: "prior-year" }>;

function MonthComparisonPicker({ comparison, currentYear, currentMonth, onChange }: {
  comparison: MonthComparison;
  currentYear: number;
  currentMonth: number;
  onChange: (c: DashboardFilters["comparison"]) => void;
}) {
  const PRESETS: { type: "same-month-ly" | "prior-month"; label: string }[] = [
    { type: "same-month-ly", label: "Same month LY" },
    { type: "prior-month",   label: "Prior month"   },
  ];
  const isCustom = comparison.type === "custom";
  const custom   = isCustom ? (comparison as { type: "custom"; year: number; month: number }) : null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {PRESETS.map(p => (
        <button
          key={p.type}
          onClick={() => onChange({ type: p.type })}
          className={cn(
            "h-7 px-2.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap",
            comparison.type === p.type
              ? "bg-brand-700 text-white"
              : "bg-ink-100 text-ink-500 hover:bg-ink-200 hover:text-ink-800"
          )}
        >
          {p.label}
        </button>
      ))}
      <button
        onClick={() =>
          !isCustom &&
          onChange({ type: "custom", year: currentYear - 1, month: currentMonth })
        }
        className={cn(
          "h-7 px-2.5 rounded-lg text-[11px] font-semibold transition-all",
          isCustom
            ? "bg-brand-700 text-white"
            : "bg-ink-100 text-ink-500 hover:bg-ink-200 hover:text-ink-800"
        )}
      >
        Custom
      </button>
      {isCustom && custom && (
        <>
          <Sel
            value={custom.month}
            onChange={v => onChange({ type: "custom", year: custom.year, month: Number(v) })}
          >
            {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </Sel>
          <Sel
            value={custom.year}
            onChange={v => onChange({ type: "custom", year: Number(v), month: custom.month })}
          >
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </Sel>
        </>
      )}
    </div>
  );
}

/* ── FilterBar ───────────────────────────────────────────────────────────── */
export default function FilterBar({ filters, onChange }: Props) {
  const { hotelIds, mode, year, month, comparison } = filters;

  function patch(partial: Partial<DashboardFilters>) {
    onChange({ ...filters, ...partial });
  }

  function switchMode(newMode: "year" | "month") {
    if (newMode === mode) return;
    if (newMode === "year") {
      patch({ mode: "year", month: null, comparison: { type: "prior-year", year: year - 1 } });
    } else {
      patch({ mode: "month", month: new Date().getMonth() + 1, comparison: { type: "same-month-ly" } });
    }
  }

  const pyComp = comparison as { type: "prior-year"; year: number };

  return (
    <div className="flex flex-wrap items-center gap-2 py-3 border-b border-ink-100">

      {/* Properties */}
      <PropertiesDropdown
        hotelIds={hotelIds}
        onChange={ids => patch({ hotelIds: ids })}
      />

      <div className="w-px h-5 bg-ink-100 mx-0.5 shrink-0" />

      {/* Mode toggle */}
      <div className="flex bg-ink-100 rounded-lg p-0.5 shrink-0">
        {(["year", "month"] as const).map(m => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={cn(
              "h-7 px-3 rounded-md text-[12px] font-semibold transition-all capitalize",
              mode === m
                ? "bg-white text-ink-900 shadow-sm"
                : "text-ink-500 hover:text-ink-700"
            )}
          >
            {m === "year" ? "Year" : "Month"}
          </button>
        ))}
      </div>

      {/* Period picker */}
      {mode === "year" ? (
        <Sel
          value={year}
          onChange={v => {
            const y = Number(v);
            patch({ year: y, comparison: { type: "prior-year", year: y - 1 } });
          }}
        >
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </Sel>
      ) : (
        <>
          <Sel value={month ?? 1} onChange={v => patch({ month: Number(v) })}>
            {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </Sel>
          <Sel value={year} onChange={v => patch({ year: Number(v) })}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </Sel>
        </>
      )}

      {/* vs comparison */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[12px] font-medium text-ink-400 shrink-0">vs</span>
        {mode === "year" ? (
          <Sel
            value={pyComp.year ?? year - 1}
            onChange={v => patch({ comparison: { type: "prior-year", year: Number(v) } })}
          >
            {YEARS.filter(y => y < year).map(y => <option key={y} value={y}>{y}</option>)}
          </Sel>
        ) : (
          <MonthComparisonPicker
            comparison={comparison as MonthComparison}
            currentYear={year}
            currentMonth={month ?? 1}
            onChange={c => patch({ comparison: c })}
          />
        )}
      </div>

    </div>
  );
}
