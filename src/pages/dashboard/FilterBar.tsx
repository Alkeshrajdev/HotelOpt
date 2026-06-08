import { useState, useRef, useEffect } from "react";
import { Building2, ChevronDown, Check, SlidersHorizontal, X } from "lucide-react";
import {
  useTopbar, YEAR_OPTIONS, MONTH_OPTIONS,
  type DashMode, type DashComparison,
} from "@/lib/topbarContext";
import { cn } from "@/lib/utils";

/* ── Hotel data (mirrors PORTFOLIO_HOTELS regions) ─────────────────────────── */
const HOTELS_BY_REGION: Record<string, { id: string; name: string }[]> = {
  EMEA: [
    { id: "h1",  name: "Skyline Dubai" },
    { id: "h2",  name: "Airport Hotel Dubai" },
    { id: "h4",  name: "The Pavilion London" },
    { id: "h5",  name: "Grand Harbour Lisbon" },
    { id: "h6",  name: "Marina Residences Barcelona" },
    { id: "h8",  name: "The Montrose Paris" },
    { id: "h9",  name: "Peaks Resort Zermatt" },
  ],
  APAC: [
    { id: "h3",  name: "Bay View Singapore" },
    { id: "h10", name: "Riverside Bangkok" },
  ],
  Africa: [
    { id: "h7",  name: "Oceanfront Cape Town" },
  ],
};

const ALL_HOTELS = Object.values(HOTELS_BY_REGION).flat();
const ALL_IDS    = ALL_HOTELS.map((h) => h.id);
const TOTAL      = ALL_IDS.length;

/* ── Label helper ──────────────────────────────────────────────────────────── */
function propsLabel(hotelIds: "all" | string[]): string {
  const ids: string[] = hotelIds === "all" ? ALL_IDS : (hotelIds as string[]);
  if (ids.length === TOTAL) return "All Properties";
  if (ids.length === 0)     return "No properties";
  if (ids.length === 1)     return ALL_HOTELS.find((h) => h.id === ids[0])?.name ?? "1 property";
  for (const [region, hotels] of Object.entries(HOTELS_BY_REGION)) {
    const rIds = hotels.map((h) => h.id);
    if (rIds.length === ids.length && rIds.every((id) => ids.includes(id)))
      return `${region} (${rIds.length})`;
  }
  return `${ids.length} of ${TOTAL} properties`;
}

/* ── Small shared dropdown list ────────────────────────────────────────────── */
function DropdownItem({
  selected, children, onClick,
}: { selected?: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-1.5 text-[12px] hover:bg-ink-50 flex items-center gap-2 transition-colors",
        selected && "font-semibold text-brand-700"
      )}
    >
      {selected
        ? <Check size={11} className="text-good shrink-0" />
        : <span className="w-[11px] shrink-0" />}
      {children}
    </button>
  );
}

/* ── Desktop controls ───────────────────────────────────────────────────────── */
const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

function DesktopControls() {
  const {
    dashHotelIds, setDashHotelIds,
    dashMode, setDashMode,
    dashYear, setDashYear,
    dashMonth, setDashMonth,
    dashQuarter, setDashQuarter,
    dashComparison, setDashComparison,
  } = useTopbar();

  const [propsOpen,      setPropsOpen]      = useState(false);
  const [yearOpen,       setYearOpen]       = useState(false);
  const [monthOpen,      setMonthOpen]      = useState(false);
  const [quarterOpen,    setQuarterOpen]    = useState(false);
  const [cmpYearOpen,    setCmpYearOpen]    = useState(false);

  const propsRef    = useRef<HTMLDivElement>(null);
  const yearRef     = useRef<HTMLDivElement>(null);
  const monthRef    = useRef<HTMLDivElement>(null);
  const quarterRef  = useRef<HTMLDivElement>(null);
  const cmpYearRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (propsRef.current   && !propsRef.current.contains(e.target as Node))   setPropsOpen(false);
      if (yearRef.current    && !yearRef.current.contains(e.target as Node))    setYearOpen(false);
      if (monthRef.current   && !monthRef.current.contains(e.target as Node))   setMonthOpen(false);
      if (quarterRef.current && !quarterRef.current.contains(e.target as Node)) setQuarterOpen(false);
      if (cmpYearRef.current && !cmpYearRef.current.contains(e.target as Node)) setCmpYearOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const selectedIds: string[] = dashHotelIds === "all" ? ALL_IDS : (dashHotelIds as string[]);

  const regionState = (region: string): "all" | "some" | "none" => {
    const rIds  = HOTELS_BY_REGION[region].map((h) => h.id);
    const count = rIds.filter((id) => selectedIds.includes(id)).length;
    if (count === rIds.length) return "all";
    if (count === 0)           return "none";
    return "some";
  };

  const toggleHotel = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((i) => i !== id)
      : [...selectedIds, id];
    if (next.length === 0) return; // never empty
    setDashHotelIds(next.length === TOTAL ? "all" : next);
  };

  const toggleRegion = (region: string) => {
    const rIds      = HOTELS_BY_REGION[region].map((h) => h.id);
    const allSel    = rIds.every((id) => selectedIds.includes(id));
    if (allSel) {
      const next = selectedIds.filter((id) => !rIds.includes(id));
      if (next.length === 0) return;
      setDashHotelIds(next.length === TOTAL ? "all" : next);
    } else {
      const next = [...new Set([...selectedIds, ...rIds])];
      setDashHotelIds(next.length === TOTAL ? "all" : next);
    }
  };

  const switchMode = (m: DashMode) => {
    setDashMode(m);
    if (m === "year")    setDashComparison({ type: "prior-year", year: dashYear - 1 });
    if (m === "quarter") setDashComparison({ type: "same-quarter-ly" });
    if (m === "month")   setDashComparison({ type: "same-month-ly" });
  };

  const compYears = YEAR_OPTIONS.filter((y) => y < dashYear);

  return (
    <div className="hidden xl:flex items-center gap-2 flex-1">

      {/* ── Properties multi-select ─────────────────────────────────────── */}
      <div className="relative" ref={propsRef}>
        <button
          onClick={() => setPropsOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-ink-200 bg-white text-[12px] font-medium text-ink-700 hover:bg-ink-50 transition-colors max-w-[200px]"
        >
          <Building2 size={13} className="text-ink-400 shrink-0" />
          <span className="truncate">{propsLabel(dashHotelIds)}</span>
          <ChevronDown size={11} className="text-ink-400 shrink-0" />
        </button>

        {propsOpen && (
          <div className="absolute left-0 top-10 w-64 card shadow-pop z-50 py-1.5 overflow-y-auto max-h-80">
            {/* All properties */}
            <button
              onClick={() => setDashHotelIds("all")}
              className="w-full text-left px-3 py-2 text-[12px] flex items-center gap-2 hover:bg-ink-50 border-b border-ink-100 mb-1"
            >
              <span className={cn(
                "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                selectedIds.length === TOTAL
                  ? "bg-brand-600 border-brand-600"
                  : "border-ink-300"
              )}>
                {selectedIds.length === TOTAL && <Check size={10} className="text-white" />}
              </span>
              <span className="font-semibold text-ink-800">All Properties</span>
              <span className="ml-auto text-[11px] text-ink-400">{TOTAL}</span>
            </button>

            {/* Regions + hotels */}
            {Object.entries(HOTELS_BY_REGION).map(([region, hotels]) => {
              const rs = regionState(region);
              return (
                <div key={region}>
                  <button
                    onClick={() => toggleRegion(region)}
                    className="w-full text-left px-3 py-1.5 text-[12px] flex items-center gap-2 hover:bg-ink-50"
                  >
                    <span className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                      rs === "all"  && "bg-brand-600 border-brand-600",
                      rs === "some" && "bg-brand-100 border-brand-400",
                      rs === "none" && "border-ink-300",
                    )}>
                      {rs === "all"  && <Check size={10} className="text-white" />}
                      {rs === "some" && <span className="w-2 h-0.5 bg-brand-700 rounded-full" />}
                    </span>
                    <span className="font-semibold text-ink-700">{region}</span>
                    <span className="ml-auto text-[11px] text-ink-400">{hotels.length}</span>
                  </button>
                  {hotels.map((hotel) => {
                    const checked = selectedIds.includes(hotel.id);
                    return (
                      <button
                        key={hotel.id}
                        onClick={() => toggleHotel(hotel.id)}
                        className="w-full text-left pl-9 pr-3 py-1.5 text-[12px] flex items-center gap-2 hover:bg-ink-50 text-ink-600"
                      >
                        <span className={cn(
                          "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                          checked ? "bg-brand-600 border-brand-600" : "border-ink-300"
                        )}>
                          {checked && <Check size={10} className="text-white" />}
                        </span>
                        {hotel.name}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Divider ─────────────────────────────────────────────────────── */}
      <span className="h-5 w-px bg-ink-200 shrink-0" />

      {/* ── Mode toggle ─────────────────────────────────────────────────── */}
      <div className="flex items-center bg-ink-100 rounded-lg p-0.5 shrink-0">
        {(["year", "quarter", "month"] as DashMode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={cn(
              "px-2.5 h-6 text-[12px] font-medium rounded-md transition-colors",
              m === dashMode
                ? "bg-white text-ink-900 shadow-sm"
                : "text-ink-500 hover:text-ink-700"
            )}
          >
            {m === "year" ? "Year" : m === "quarter" ? "Quarter" : "Month"}
          </button>
        ))}
      </div>

      {/* ── Period picker ───────────────────────────────────────────────── */}
      {/* Quarter picker */}
      {dashMode === "quarter" && (
        <div className="relative" ref={quarterRef}>
          <button
            onClick={() => { setQuarterOpen((v) => !v); setYearOpen(false); }}
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-ink-200 bg-white text-[12px] font-medium text-ink-700 hover:bg-ink-50 transition-colors"
          >
            {QUARTERS[dashQuarter - 1]}
            <ChevronDown size={11} className="text-ink-400" />
          </button>
          {quarterOpen && (
            <div className="absolute left-0 top-10 w-20 card shadow-pop z-50 py-1">
              {QUARTERS.map((q, i) => (
                <DropdownItem
                  key={q}
                  selected={(i + 1) === dashQuarter}
                  onClick={() => { setDashQuarter(i + 1); setQuarterOpen(false); }}
                >
                  {q}
                </DropdownItem>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Month picker */}
      {dashMode === "month" && (
        <div className="relative" ref={monthRef}>
          <button
            onClick={() => { setMonthOpen((v) => !v); setYearOpen(false); }}
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-ink-200 bg-white text-[12px] font-medium text-ink-700 hover:bg-ink-50 transition-colors"
          >
            {MONTH_OPTIONS[dashMonth - 1].slice(0, 3)}
            <ChevronDown size={11} className="text-ink-400" />
          </button>
          {monthOpen && (
            <div className="absolute left-0 top-10 w-32 card shadow-pop z-50 py-1 overflow-y-auto max-h-64">
              {MONTH_OPTIONS.map((m, i) => (
                <DropdownItem
                  key={m}
                  selected={(i + 1) === dashMonth}
                  onClick={() => { setDashMonth(i + 1); setMonthOpen(false); }}
                >
                  {m}
                </DropdownItem>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="relative" ref={yearRef}>
        <button
          onClick={() => { setYearOpen((v) => !v); setMonthOpen(false); }}
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-ink-200 bg-white text-[12px] font-medium text-ink-700 hover:bg-ink-50 transition-colors"
        >
          {dashYear}
          <ChevronDown size={11} className="text-ink-400" />
        </button>
        {yearOpen && (
          <div className="absolute left-0 top-10 w-24 card shadow-pop z-50 py-1 overflow-y-auto max-h-48">
            {YEAR_OPTIONS.map((y) => (
              <DropdownItem
                key={y}
                selected={y === dashYear}
                onClick={() => {
                  setDashYear(y);
                  setYearOpen(false);
                  if (dashComparison.type === "prior-year")
                    setDashComparison({ type: "prior-year", year: y - 1 });
                }}
              >
                {y}
              </DropdownItem>
            ))}
          </div>
        )}
      </div>

      {/* ── "vs" label ──────────────────────────────────────────────────── */}
      <span className="text-[11px] font-semibold text-ink-400 shrink-0">vs</span>

      {/* ── Comparison — year mode ───────────────────────────────────────── */}
      {dashMode === "year" && (
        <div className="relative" ref={cmpYearRef}>
          <button
            onClick={() => setCmpYearOpen((v) => !v)}
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-ink-200 bg-white text-[12px] font-medium text-ink-700 hover:bg-ink-50 transition-colors"
          >
            {dashComparison.type === "prior-year" ? dashComparison.year : "—"}
            <ChevronDown size={11} className="text-ink-400" />
          </button>
          {cmpYearOpen && (
            <div className="absolute left-0 top-10 w-24 card shadow-pop z-50 py-1 overflow-y-auto max-h-48">
              {compYears.map((y) => (
                <DropdownItem
                  key={y}
                  selected={dashComparison.type === "prior-year" && dashComparison.year === y}
                  onClick={() => { setDashComparison({ type: "prior-year", year: y }); setCmpYearOpen(false); }}
                >
                  {y}
                </DropdownItem>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Comparison — quarter mode ────────────────────────────────────── */}
      {dashMode === "quarter" && (
        <div className="flex items-center gap-1.5">
          {([
            { key: "same-quarter-ly" as const, label: "Same Qtr LY" },
            { key: "prior-quarter"   as const, label: "Prior Qtr"   },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setDashComparison({ type: key })}
              className={cn(
                "h-7 px-2.5 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap",
                dashComparison.type === key
                  ? "bg-brand-700 text-white"
                  : "bg-ink-100 text-ink-600 hover:bg-ink-200"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Comparison — month mode ──────────────────────────────────────── */}
      {dashMode === "month" && (
        <div className="flex items-center gap-1.5">
          {([
            { key: "same-month-ly" as const, label: "Same month LY" },
            { key: "prior-month"   as const, label: "Prior month"   },
            { key: "custom"        as const, label: "Custom"        },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                if (key === "custom")
                  setDashComparison({ type: "custom", year: dashYear - 1, month: dashMonth });
                else
                  setDashComparison({ type: key });
              }}
              className={cn(
                "h-7 px-2.5 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap",
                dashComparison.type === key
                  ? "bg-brand-700 text-white"
                  : "bg-ink-100 text-ink-600 hover:bg-ink-200"
              )}
            >
              {label}
            </button>
          ))}

          {/* Custom inline pickers */}
          {dashComparison.type === "custom" && (
            <div className="flex items-center gap-1">
              <select
                value={dashComparison.month}
                onChange={(e) =>
                  setDashComparison({ type: "custom", year: dashComparison.year, month: Number(e.target.value) })
                }
                className="h-8 px-1.5 rounded-lg border border-ink-200 bg-white text-[12px] text-ink-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {MONTH_OPTIONS.map((m, i) => (
                  <option key={m} value={i + 1}>{m.slice(0, 3)}</option>
                ))}
              </select>
              <select
                value={dashComparison.year}
                onChange={(e) =>
                  setDashComparison({ type: "custom", year: Number(e.target.value), month: dashComparison.month })
                }
                className="h-8 px-1.5 rounded-lg border border-ink-200 bg-white text-[12px] text-ink-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Mobile panel ───────────────────────────────────────────────────────────── */
function MobileControls() {
  const {
    dashHotelIds, setDashHotelIds,
    dashMode, setDashMode,
    dashYear, setDashYear,
    dashMonth, setDashMonth,
    dashQuarter, setDashQuarter,
    dashComparison, setDashComparison,
  } = useTopbar();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const switchModeMobile = (m: DashMode) => {
    setDashMode(m);
    if (m === "year")    setDashComparison({ type: "prior-year", year: dashYear - 1 });
    if (m === "quarter") setDashComparison({ type: "same-quarter-ly" });
    if (m === "month")   setDashComparison({ type: "same-month-ly" });
  };

  return (
    <div className="xl:hidden relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-secondary h-8 px-2.5 text-[12px] inline-flex items-center gap-1.5"
      >
        <SlidersHorizontal size={13} />
        Filters
        {dashHotelIds !== "all" && (
          <span className="ml-0.5 w-4 h-4 rounded-full bg-brand-600 text-white text-[10px] font-bold grid place-items-center">
            !
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-10 w-[300px] card shadow-pop z-50">
          <div className="px-4 py-3 border-b border-ink-200 flex items-center justify-between">
            <span className="text-sm font-semibold text-ink-900">Dashboard Filters</span>
            <button onClick={() => setOpen(false)} className="btn-ghost w-7 h-7 p-0"><X size={13} /></button>
          </div>
          <div className="p-3 space-y-4">

            {/* Mode toggle */}
            <div>
              <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wide block mb-1.5">View period</span>
              <div className="flex items-center bg-ink-100 rounded-lg p-0.5 w-fit">
                {(["year", "quarter", "month"] as DashMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => switchModeMobile(m)}
                    className={cn(
                      "px-3 h-7 text-[12px] font-medium rounded-md transition-colors",
                      m === dashMode ? "bg-white text-ink-900 shadow-sm" : "text-ink-500"
                    )}
                  >
                    {m === "year" ? "Year" : m === "quarter" ? "Qtr" : "Month"}
                  </button>
                ))}
              </div>
            </div>

            {/* Year */}
            <div>
              <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wide block mb-1.5">Year</span>
              <select
                value={dashYear}
                onChange={(e) => setDashYear(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-lg border border-ink-200 bg-white text-sm text-ink-700 focus:outline-none"
              >
                {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Quarter (only in quarter mode) */}
            {dashMode === "quarter" && (
              <div>
                <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wide block mb-1.5">Quarter</span>
                <select
                  value={dashQuarter}
                  onChange={(e) => setDashQuarter(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-lg border border-ink-200 bg-white text-sm text-ink-700 focus:outline-none"
                >
                  {QUARTERS.map((q, i) => <option key={q} value={i + 1}>{q}</option>)}
                </select>
              </div>
            )}

            {/* Month (only in month mode) */}
            {dashMode === "month" && (
              <div>
                <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wide block mb-1.5">Month</span>
                <select
                  value={dashMonth}
                  onChange={(e) => setDashMonth(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-lg border border-ink-200 bg-white text-sm text-ink-700 focus:outline-none"
                >
                  {MONTH_OPTIONS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
            )}

            {/* Comparison */}
            <div>
              <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wide block mb-1.5">Compare vs</span>
              {dashMode === "year" && (
                <select
                  value={dashComparison.type === "prior-year" ? dashComparison.year : ""}
                  onChange={(e) => setDashComparison({ type: "prior-year", year: Number(e.target.value) })}
                  className="w-full h-9 px-3 rounded-lg border border-ink-200 bg-white text-sm text-ink-700 focus:outline-none"
                >
                  {YEAR_OPTIONS.filter((y) => y < dashYear).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              )}
              {dashMode === "quarter" && (
                <div className="space-y-1.5">
                  {([
                    { key: "same-quarter-ly" as const, label: "Same quarter last year" },
                    { key: "prior-quarter"   as const, label: "Prior quarter" },
                  ] as const).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setDashComparison({ type: key })}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                        dashComparison.type === key
                          ? "bg-brand-50 text-brand-700 font-semibold"
                          : "bg-ink-50 text-ink-600 hover:bg-ink-100"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {dashMode === "month" && (
                <div className="space-y-1.5">
                  {([
                    { key: "same-month-ly" as const, label: "Same month last year" },
                    { key: "prior-month"   as const, label: "Prior month" },
                    { key: "custom"        as const, label: "Custom period" },
                  ] as const).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => {
                        if (key === "custom")
                          setDashComparison({ type: "custom", year: dashYear - 1, month: dashMonth });
                        else
                          setDashComparison({ type: key });
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                        dashComparison.type === key
                          ? "bg-brand-50 text-brand-700 font-semibold"
                          : "bg-ink-50 text-ink-600 hover:bg-ink-100"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                  {dashComparison.type === "custom" && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <select
                        value={dashComparison.month}
                        onChange={(e) =>
                          setDashComparison({ type: "custom", year: dashComparison.year, month: Number(e.target.value) })
                        }
                        className="h-9 px-2 rounded-lg border border-ink-200 bg-white text-sm text-ink-700 focus:outline-none"
                      >
                        {MONTH_OPTIONS.map((m, i) => <option key={m} value={i + 1}>{m.slice(0, 3)}</option>)}
                      </select>
                      <select
                        value={dashComparison.year}
                        onChange={(e) =>
                          setDashComparison({ type: "custom", year: Number(e.target.value), month: dashComparison.month })
                        }
                        className="h-9 px-2 rounded-lg border border-ink-200 bg-white text-sm text-ink-700 focus:outline-none"
                      >
                        {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Properties summary */}
            <div>
              <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wide block mb-1.5">Properties</span>
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-ink-50 text-sm">
                <span className="text-ink-700">{propsLabel(dashHotelIds)}</span>
                {dashHotelIds !== "all" && (
                  <button
                    onClick={() => setDashHotelIds("all")}
                    className="text-[11px] text-brand-700 font-semibold"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="px-4 py-3 border-t border-ink-200 flex justify-end">
            <button onClick={() => setOpen(false)} className="btn-primary h-8 px-4 text-[12px]">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Export ─────────────────────────────────────────────────────────────────── */
export default function DashboardFilterBar() {
  return (
    <>
      <DesktopControls />
      <MobileControls />
    </>
  );
}
