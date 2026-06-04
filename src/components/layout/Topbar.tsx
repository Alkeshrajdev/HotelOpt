import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Building2,
  CalendarRange,
  ChevronDown,
  CheckCircle2,
  Database,
  FileText,
  Globe,
  HelpCircle,
  KeyRound,
  LogOut,
  Map,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  User,
  X,
  Zap,
  CreditCard,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  useTopbar, DATA_BASIS_LABEL, type DataBasis,
  getTopbarConfig, YEAR_OPTIONS, MONTH_OPTIONS, type OpsGranularity,
} from "@/lib/topbarContext";
import { cn } from "@/lib/utils";

/* ── Filter options ────────────────────────────────────────────────────────── */
const PROPERTY_OPTIONS = [
  "All Properties (72)",
  "Skyline Dubai",
  "Airport Hotel Dubai",
  "Bay View Singapore",
  "The Pavilion London",
  "Grand Harbour Lisbon",
  "Marina Residences Barcelona",
  "Oceanfront Cape Town",
  "The Montrose Paris",
  "Peaks Resort Zermatt",
  "Riverside Bangkok",
];

const REGION_OPTIONS = [
  "All Regions",
  "EMEA",
  "APAC",
  "Africa",
  "Americas",
];

const PERIOD_OPTIONS = [
  "May 2025 – Apr 2026",
  "May 2024 – Apr 2025",
  "Jan 2025 – Dec 2025",
  "Jan 2024 – Dec 2024",
  "Q1 2026 (Jan–Mar)",
  "Q4 2025 (Oct–Dec)",
  "Q3 2025 (Jul–Sep)",
];

const ROLE_LABEL: Record<string, string> = {
  maker:       "Maker — Data Entry",
  checker:     "Checker — Reviewer",
  property_sm: "Sustainability Manager",
  super_admin: "Super Admin",
};

/* ── Notification types & data ─────────────────────────────────────────── */
type NotifItem = { id: string; title: string; detail: string; priority: "high" | "medium" | "low"; href: string };
type NotifCategory = { key: string; label: string; icon: React.ElementType; items: NotifItem[]; href: string };

const NOTIF_CATEGORIES: NotifCategory[] = [
  {
    key: "review", label: "Review & Approval", icon: CheckCircle2, href: "/review-approval",
    items: [
      { id: "r1", title: "24 records pending review",         detail: "6 overdue · SLA breach risk",          priority: "high",   href: "/review-approval?status=submitted" },
      { id: "r2", title: "3 queries awaiting maker response", detail: "Water · Waste · Carbon",               priority: "medium", href: "/review-approval?status=queried" },
    ],
  },
  {
    key: "data", label: "Data Capture", icon: Database, href: "/data-capture",
    items: [
      { id: "d1", title: "Missing meter data — 4 properties", detail: "Energy Feb 2026 · Due 7 May",          priority: "high",   href: "/data-capture?flag=missing" },
    ],
  },
  {
    key: "certifications", label: "Certifications", icon: ShieldCheck, href: "/certifications",
    items: [
      { id: "c1", title: "Green Key evidence due in 12 days", detail: "Criterion 3.4 — Energy policy",        priority: "medium", href: "/certifications?status=evidence-due" },
      { id: "c2", title: "GSTC certificate expires in 45 days", detail: "Grand Hyatt Dubai",                  priority: "medium", href: "/certifications" },
    ],
  },
  {
    key: "reports", label: "Reports", icon: FileText, href: "/reports",
    items: [
      { id: "rp1", title: "CSRD report generation blocked",   detail: "Missing S1/Supplier data for Scope 3", priority: "high",   href: "/reports" },
    ],
  },
  {
    key: "ai", label: "AI / OCR", icon: Bot, href: "/review-approval?flag=low-confidence",
    items: [
      { id: "ai1", title: "9 OCR extractions below confidence threshold", detail: "Manual review required",   priority: "medium", href: "/review-approval?flag=low-confidence" },
    ],
  },
];

/* ── Global search ──────────────────────────────────────────────────────── */
type SearchResult = {
  id: string;
  category: "Properties" | "Reports" | "Actions" | "Suppliers";
  title: string;
  subtitle: string;
  href: string;
};
const SEARCH_CATEGORY_ORDER: SearchResult["category"][] = ["Properties", "Reports", "Actions", "Suppliers"];

const SEARCH_RESULTS: SearchResult[] = [
  { id: "p1", category: "Properties", title: "Grand Hyatt Dubai",       subtitle: "5★ · Dubai, UAE · 674 rooms",       href: "/properties"     },
  { id: "p2", category: "Properties", title: "Greenview Resort",        subtitle: "4★ · Bali, Indonesia · 220 rooms",  href: "/properties"     },
  { id: "p3", category: "Properties", title: "Mountain Lodge",          subtitle: "3★ · Zurich, CH · 80 rooms",        href: "/properties"     },
  { id: "p4", category: "Properties", title: "Aurora Hotels HQ",        subtitle: "Corporate · London, UK",            href: "/properties"     },
  { id: "r1", category: "Reports",    title: "GHG Inventory 2025",      subtitle: "Published · Carbon",                href: "/reports"        },
  { id: "r2", category: "Reports",    title: "CSRD Draft 2025",         subtitle: "In-progress · ESRS",                href: "/reports"        },
  { id: "r3", category: "Reports",    title: "Green Key Evidence Pack", subtitle: "Pending · Certifications",          href: "/certifications" },
  { id: "a1", category: "Actions",    title: "BMS schedule review",     subtitle: "Open · Energy · Grand Hyatt Dubai", href: "/actions"        },
  { id: "a2", category: "Actions",    title: "LED retrofit — Phase 2",  subtitle: "In-progress · Energy",              href: "/actions"        },
  { id: "a3", category: "Actions",    title: "Water audit booking",     subtitle: "Open · Water · Greenview Resort",   href: "/actions"        },
  { id: "s1", category: "Suppliers",  title: "FreshLeaf Produce",       subtitle: "Food & Bev · Active",               href: "/supplier-portal"},
  { id: "s2", category: "Suppliers",  title: "Ecofleet Logistics",      subtitle: "Transport · Active",                href: "/supplier-portal"},
];

/* ── Help panel data ───────────────────────────────────────────────────── */
type HelpTopic = { icon: React.ElementType; label: string; description: string };
const HELP_TOPICS: HelpTopic[] = [
  { icon: BookOpen,   label: "Getting started",          description: "Set up properties, data capture flows, and your first report." },
  { icon: Database,   label: "Data capture & review",    description: "How to import, validate, and approve consumption data." },
  { icon: BarChart3,  label: "Performance & benchmarks", description: "Understanding GP scores, pillars, and comparable pools." },
  { icon: FileText,   label: "Reporting & disclosure",   description: "CSRD, GRI, CDP, TCFD — generating and publishing reports." },
  { icon: ShieldCheck,label: "Certifications",           description: "Tracking criteria, evidence packages, and renewals." },
  { icon: Zap,        label: "Integrations",             description: "Connecting BMS, accounting, and sustainability platforms." },
];

type ChangelogEntry = { date: string; tag: "Feature" | "Fix" | "Improvement"; text: string };
const CHANGELOG: ChangelogEntry[] = [
  { date: "May 2026",  tag: "Feature",     text: "AI Assistant with knowledge-base citations and action cards." },
  { date: "May 2026",  tag: "Feature",     text: "Marketplace: 12 integrations with OAuth setup wizards." },
  { date: "Apr 2026",  tag: "Improvement", text: "Guest Engagement: eco-points ledger and NPS survey builder." },
  { date: "Apr 2026",  tag: "Feature",     text: "Billing: seat management and API key management." },
  { date: "Mar 2026",  tag: "Fix",         text: "Comparable pool filtering now respects client isolation rules." },
  { date: "Mar 2026",  tag: "Improvement", text: "Performance hub: pillar-first navigation with genuine performance view." },
];

/* ── Data basis options ──────────────────────────────────────────────────── */
const DATA_BASIS_OPTIONS: DataBasis[] = ["approved", "approved+provisional", "draft", "pending"];

/* ── Topbar ──────────────────────────────────────────────────────────────── */
export default function Topbar() {
  const { profile, session, signOut } = useAuth();
  const {
    property, setProperty, region, setRegion, dataBasis, setDataBasis,
    year, setYear, month, setMonth, compareYear, setCompareYear,
    opsGranularity, setOpsGranularity, opsCustomStart, setOpsCustomStart,
    opsCustomEnd, setOpsCustomEnd,
  } = useTopbar();
  const navigate = useNavigate();
  const location = useLocation();
  const cfg      = getTopbarConfig(location.pathname);

  const [menuOpen,        setMenuOpen]        = useState(false);
  const [notifOpen,       setNotifOpen]       = useState(false);
  const [basisOpen,       setBasisOpen]       = useState(false);
  const [filtersOpen,     setFiltersOpen]     = useState(false);
  const [propertyOpen,    setPropertyOpen]    = useState(false);
  const [regionOpen,      setRegionOpen]      = useState(false);
  const [yearOpen,        setYearOpen]        = useState(false);
  const [compareYearOpen, setCompareYearOpen] = useState(false);
  const [monthOpen,       setMonthOpen]       = useState(false);
  const [activeNotifCategory, setActiveNotifCategory] = useState("review");
  const [readIds,        setReadIds]        = useState<Set<string>>(new Set());

  const [searchOpen,  setSearchOpen]  = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchIdx,   setSearchIdx]   = useState(0);

  const [helpOpen,    setHelpOpen]    = useState(false);
  const [helpTab,     setHelpTab]     = useState<"topics" | "contact" | "whats-new">("topics");
  const [contactForm, setContactForm] = useState({ subject: "", message: "" });
  const [contactSent, setContactSent] = useState(false);

  const menuRef        = useRef<HTMLDivElement>(null);
  const notifRef       = useRef<HTMLDivElement>(null);
  const basisRef       = useRef<HTMLDivElement>(null);
  const filterRef      = useRef<HTMLDivElement>(null);
  const propertyRef    = useRef<HTMLDivElement>(null);
  const regionRef      = useRef<HTMLDivElement>(null);
  const yearRef        = useRef<HTMLDivElement>(null);
  const compareYearRef = useRef<HTMLDivElement>(null);
  const monthRef       = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current        && !menuRef.current.contains(e.target as Node))        setMenuOpen(false);
      if (notifRef.current       && !notifRef.current.contains(e.target as Node))       setNotifOpen(false);
      if (basisRef.current       && !basisRef.current.contains(e.target as Node))       setBasisOpen(false);
      if (filterRef.current      && !filterRef.current.contains(e.target as Node))      setFiltersOpen(false);
      if (propertyRef.current    && !propertyRef.current.contains(e.target as Node))    setPropertyOpen(false);
      if (regionRef.current      && !regionRef.current.contains(e.target as Node))      setRegionOpen(false);
      if (yearRef.current        && !yearRef.current.contains(e.target as Node))        setYearOpen(false);
      if (compareYearRef.current && !compareYearRef.current.contains(e.target as Node)) setCompareYearOpen(false);
      if (monthRef.current       && !monthRef.current.contains(e.target as Node))       setMonthOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setSearchQuery("");
        setSearchIdx(0);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setHelpOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const unreadCount = (cat: NotifCategory) => cat.items.filter((i) => !readIds.has(i.id)).length;
  const totalUnread = NOTIF_CATEGORIES.reduce((s, c) => s + unreadCount(c), 0);
  const markRead    = (id: string) => setReadIds((prev) => new Set([...prev, id]));
  const markAllRead = () => setReadIds(new Set(NOTIF_CATEGORIES.flatMap((c) => c.items.map((i) => i.id))));

  const filteredResults = searchQuery.trim()
    ? SEARCH_RESULTS.filter(
        (r) =>
          r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : SEARCH_RESULTS;
  const flatResults = SEARCH_CATEGORY_ORDER.flatMap((cat) => filteredResults.filter((r) => r.category === cat));

  const handleSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSearchIdx((i) => Math.min(i + 1, flatResults.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSearchIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && flatResults[searchIdx]) {
      navigate(flatResults[searchIdx].href);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  const fullName  = profile?.full_name || profile?.email || session?.user.email || "Hotel Optimizer User";
  const roleLabel = profile?.role ? ROLE_LABEL[profile.role] ?? profile.role : "Loading…";
  const initials  = fullName.split(/\s|@/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  const activeCategory = NOTIF_CATEGORIES.find((c) => c.key === activeNotifCategory)!;

  return (
    <>
      <header className="h-16 border-b border-ink-200 bg-white dark-surface flex items-center px-4 sm:px-6 gap-3 sm:gap-4 shrink-0 z-20">

        {/* ── Context filters — desktop (xl+) ── */}
        <div className="hidden xl:flex items-center gap-2 flex-wrap">

          {/* Property */}
          {cfg.showProperty && (
            <div className="relative" ref={propertyRef}>
              <FilterPill
                icon={<Building2 size={13} />}
                label="PROPERTY"
                value={property}
                onClick={() => { setPropertyOpen((v) => !v); setRegionOpen(false); setYearOpen(false); setCompareYearOpen(false); setMonthOpen(false); }}
              />
              {propertyOpen && (
                <DropdownList
                  options={PROPERTY_OPTIONS} value={property}
                  onSelect={setProperty} onClose={() => setPropertyOpen(false)}
                  width="w-56"
                />
              )}
            </div>
          )}

          {/* Region */}
          {cfg.showRegion && (
            <div className="relative" ref={regionRef}>
              <FilterPill
                icon={<Map size={13} />}
                label="REGION"
                value={region}
                onClick={() => { setRegionOpen((v) => !v); setPropertyOpen(false); setYearOpen(false); }}
              />
              {regionOpen && (
                <DropdownList
                  options={REGION_OPTIONS} value={region}
                  onSelect={setRegion} onClose={() => setRegionOpen(false)}
                />
              )}
            </div>
          )}

          {/* Period: single year */}
          {cfg.periodType === "year" && (
            <div className="relative" ref={yearRef}>
              <FilterPill
                icon={<CalendarRange size={13} />}
                label="YEAR"
                value={String(year)}
                onClick={() => { setYearOpen((v) => !v); setPropertyOpen(false); setRegionOpen(false); }}
              />
              {yearOpen && (
                <DropdownList
                  options={YEAR_OPTIONS.map(String)} value={String(year)}
                  onSelect={(v) => setYear(Number(v))} onClose={() => setYearOpen(false)}
                />
              )}
            </div>
          )}

          {/* Period: month + year */}
          {cfg.periodType === "month-year" && (
            <>
              <div className="relative" ref={monthRef}>
                <FilterPill
                  icon={<CalendarRange size={13} />}
                  label="MONTH"
                  value={MONTH_OPTIONS[month - 1]}
                  onClick={() => { setMonthOpen((v) => !v); setYearOpen(false); setPropertyOpen(false); }}
                />
                {monthOpen && (
                  <DropdownList
                    options={MONTH_OPTIONS} value={MONTH_OPTIONS[month - 1]}
                    onSelect={(v) => setMonth(MONTH_OPTIONS.indexOf(v) + 1)}
                    onClose={() => setMonthOpen(false)} width="w-36"
                  />
                )}
              </div>
              <div className="relative" ref={yearRef}>
                <FilterPill
                  label="YEAR"
                  value={String(year)}
                  onClick={() => { setYearOpen((v) => !v); setMonthOpen(false); setPropertyOpen(false); }}
                />
                {yearOpen && (
                  <DropdownList
                    options={YEAR_OPTIONS.map(String)} value={String(year)}
                    onSelect={(v) => setYear(Number(v))} onClose={() => setYearOpen(false)}
                  />
                )}
              </div>
            </>
          )}

          {/* Period: year + compare year */}
          {cfg.periodType === "year-compare" && (
            <>
              <div className="relative" ref={yearRef}>
                <FilterPill
                  icon={<CalendarRange size={13} />}
                  label="YEAR"
                  value={String(year)}
                  onClick={() => { setYearOpen((v) => !v); setCompareYearOpen(false); setPropertyOpen(false); }}
                />
                {yearOpen && (
                  <DropdownList
                    options={YEAR_OPTIONS.map(String)} value={String(year)}
                    onSelect={(v) => { const n = Number(v); setYear(n); if (compareYear === n) setCompareYear(null); }}
                    onClose={() => setYearOpen(false)}
                  />
                )}
              </div>
              <span className="text-[11px] font-semibold text-ink-400 px-0.5 self-end mb-1">vs</span>
              <div className="relative" ref={compareYearRef}>
                <FilterPill
                  label="COMPARE"
                  value={compareYear ? String(compareYear) : "None"}
                  onClick={() => { setCompareYearOpen((v) => !v); setYearOpen(false); setPropertyOpen(false); }}
                  dimmed={!compareYear}
                />
                {compareYearOpen && (
                  <DropdownList
                    options={["None", ...YEAR_OPTIONS.filter((y) => y !== year).map(String)]}
                    value={compareYear ? String(compareYear) : "None"}
                    onSelect={(v) => setCompareYear(v === "None" ? null : Number(v))}
                    onClose={() => setCompareYearOpen(false)}
                  />
                )}
              </div>
            </>
          )}

          {/* Period: Smart Ops granularity */}
          {cfg.periodType === "ops" && (
            <>
              <div className="flex items-center gap-0.5 bg-ink-100 p-1 rounded-xl">
                {(["day", "week", "month", "year", "custom"] as OpsGranularity[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => setOpsGranularity(g)}
                    className={cn("tab text-[11px] py-1 px-2.5 capitalize", g === opsGranularity && "tab-active")}
                  >
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </button>
                ))}
              </div>
              {opsGranularity === "custom" && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={opsCustomStart}
                    onChange={(e) => setOpsCustomStart(e.target.value)}
                    className="h-8 px-2 rounded-lg border border-ink-200 bg-white text-[11px] text-ink-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <span className="text-[11px] text-ink-400">→</span>
                  <input
                    type="date"
                    value={opsCustomEnd}
                    onChange={(e) => setOpsCustomEnd(e.target.value)}
                    className="h-8 px-2 rounded-lg border border-ink-200 bg-white text-[11px] text-ink-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              )}
            </>
          )}

          {/* Data basis */}
          {cfg.showDataBasis && (
            <div className="relative" ref={basisRef}>
              <button
                onClick={() => setBasisOpen((v) => !v)}
                className={cn(
                  "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[12px] font-medium transition-colors",
                  dataBasis === "approved"
                    ? "border-good/30 bg-good/8 text-good"
                    : "border-warn/30 bg-warn/8 text-warn"
                )}
              >
                <Database size={12} />
                {DATA_BASIS_LABEL[dataBasis]}
                <ChevronDown size={11} className="opacity-60" />
              </button>
              {basisOpen && (
                <div className="absolute left-0 top-10 w-52 card shadow-pop z-40 py-1 overflow-hidden">
                  {DATA_BASIS_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => { setDataBasis(opt); setBasisOpen(false); }}
                      className={cn("w-full text-left px-3 py-2 text-sm hover:bg-ink-50 flex items-center gap-2", opt === dataBasis && "font-semibold text-brand-700")}
                    >
                      {opt === dataBasis && <CheckCircle2 size={13} className="text-good shrink-0" />}
                      {opt !== dataBasis && <span className="w-[13px] shrink-0" />}
                      {DATA_BASIS_LABEL[opt]}
                    </button>
                  ))}
                  {dataBasis !== "approved" && (
                    <div className="mx-2 mb-2 mt-1 rounded-lg bg-warn/10 border border-warn/25 px-2 py-1.5 text-[11px] text-warn leading-snug">
                      Non-approved data included — not suitable for external disclosure.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Compact filters — mobile (below xl) ── */}
        <div className="xl:hidden relative" ref={filterRef}>
          <button onClick={() => setFiltersOpen((v) => !v)} className="btn-secondary h-8 px-2.5 text-[12px]">
            <SlidersHorizontal size={13} /> Filters
          </button>
          {filtersOpen && (
            <div className="absolute left-0 top-10 w-[300px] card shadow-pop z-40">
              <div className="px-4 py-3 border-b border-ink-200 flex items-center justify-between">
                <span className="text-sm font-semibold text-ink-900">Filters</span>
                <button onClick={() => setFiltersOpen(false)} className="btn-ghost w-7 h-7 p-0"><X size={13} /></button>
              </div>
              <div className="p-3 space-y-3">
                {cfg.showProperty && (
                  <div>
                    <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wide">Property</span>
                    <select value={property} onChange={(e) => setProperty(e.target.value)}
                      className="mt-1 w-full h-9 px-3 rounded-lg border border-ink-200 bg-white text-sm text-ink-700 focus:outline-none">
                      {PROPERTY_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                )}
                {cfg.showRegion && (
                  <div>
                    <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wide">Region</span>
                    <select value={region} onChange={(e) => setRegion(e.target.value)}
                      className="mt-1 w-full h-9 px-3 rounded-lg border border-ink-200 bg-white text-sm text-ink-700 focus:outline-none">
                      {REGION_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                )}
                {(cfg.periodType === "year" || cfg.periodType === "year-compare") && (
                  <div>
                    <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wide">Year</span>
                    <select value={year} onChange={(e) => setYear(Number(e.target.value))}
                      className="mt-1 w-full h-9 px-3 rounded-lg border border-ink-200 bg-white text-sm text-ink-700 focus:outline-none">
                      {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                )}
                {cfg.periodType === "year-compare" && (
                  <div>
                    <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wide">Compare with</span>
                    <select value={compareYear ?? ""} onChange={(e) => setCompareYear(e.target.value ? Number(e.target.value) : null)}
                      className="mt-1 w-full h-9 px-3 rounded-lg border border-ink-200 bg-white text-sm text-ink-700 focus:outline-none">
                      <option value="">None</option>
                      {YEAR_OPTIONS.filter((y) => y !== year).map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                )}
                {cfg.periodType === "month-year" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wide">Month</span>
                      <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
                        className="mt-1 w-full h-9 px-3 rounded-lg border border-ink-200 bg-white text-sm text-ink-700 focus:outline-none">
                        {MONTH_OPTIONS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wide">Year</span>
                      <select value={year} onChange={(e) => setYear(Number(e.target.value))}
                        className="mt-1 w-full h-9 px-3 rounded-lg border border-ink-200 bg-white text-sm text-ink-700 focus:outline-none">
                        {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                )}
                {cfg.periodType === "ops" && (
                  <div>
                    <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wide">View</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(["day","week","month","year","custom"] as OpsGranularity[]).map((g) => (
                        <button key={g} onClick={() => setOpsGranularity(g)}
                          className={cn("tab text-[11px] capitalize", g === opsGranularity && "tab-active")}>
                          {g.charAt(0).toUpperCase() + g.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {cfg.showDataBasis && (
                  <div>
                    <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wide">Data Basis</span>
                    <div className="mt-1 space-y-1">
                      {DATA_BASIS_OPTIONS.map((opt) => (
                        <button key={opt} onClick={() => setDataBasis(opt)}
                          className={cn("w-full text-left px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors",
                            opt === dataBasis ? "bg-brand-50 text-brand-700 font-semibold" : "hover:bg-ink-50 text-ink-700")}>
                          {opt === dataBasis && <CheckCircle2 size={13} className="text-good shrink-0" />}
                          {opt !== dataBasis && <span className="w-[13px] shrink-0" />}
                          {DATA_BASIS_LABEL[opt]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="px-4 py-3 border-t border-ink-200 flex justify-end">
                <button onClick={() => setFiltersOpen(false)} className="btn-primary h-8 px-3 text-[12px]">Done</button>
              </div>
            </div>
          )}
        </div>

        {/* ── Search bar (opens ⌘K modal) ── */}
        <div className="relative flex-1 max-w-lg">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
          <input
            readOnly
            onClick={() => { setSearchOpen(true); setSearchQuery(""); setSearchIdx(0); }}
            className="input pl-9 h-9 text-sm cursor-pointer"
            placeholder="Search properties, reports, suppliers, actions…"
          />
          <span className="kbd absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline">⌘K</span>
        </div>

        {/* ── Right cluster ── */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">

          <button
            onClick={() => navigate("/ai-assistant")}
            className="hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-brand-50 text-brand-700 text-[12px] font-semibold hover:bg-brand-100 transition-colors"
          >
            <Sparkles size={13} /> Ask AI
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen((v) => !v)}
              className="relative w-9 h-9 grid place-items-center rounded-full hover:bg-ink-100 text-ink-600"
              aria-label={`${totalUnread} unread notifications`}
            >
              <Bell size={18} />
              {totalUnread > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-bad text-white text-[9px] font-bold grid place-items-center leading-none">
                  {totalUnread > 9 ? "9+" : totalUnread}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-[420px] card shadow-pop z-40 overflow-hidden flex flex-col max-h-[520px]">
                <div className="px-4 py-3 border-b border-ink-200 flex items-center justify-between shrink-0">
                  <span className="text-sm font-semibold text-ink-900">Notifications</span>
                  <div className="flex items-center gap-2">
                    {totalUnread > 0 && (
                      <button onClick={markAllRead} className="text-[11px] text-brand-700 font-semibold hover:text-brand-900">
                        Mark all read
                      </button>
                    )}
                    <button onClick={() => setNotifOpen(false)} className="btn-ghost w-7 h-7 p-0"><X size={13} /></button>
                  </div>
                </div>

                <div className="flex items-center gap-1 px-3 py-2 border-b border-ink-100 overflow-x-auto shrink-0">
                  {NOTIF_CATEGORIES.filter((c) => c.items.length > 0).map((cat) => {
                    const uc = unreadCount(cat);
                    return (
                      <button
                        key={cat.key}
                        onClick={() => setActiveNotifCategory(cat.key)}
                        className={cn(
                          "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors",
                          cat.key === activeNotifCategory ? "bg-brand-700 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                        )}
                      >
                        <cat.icon size={11} />
                        {cat.label}
                        {uc > 0 && (
                          <span className={cn(
                            "rounded-full px-1 text-[10px] font-bold",
                            cat.key === activeNotifCategory ? "bg-white/20 text-white" : "bg-bad/10 text-bad"
                          )}>
                            {uc}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-ink-100">
                  {activeCategory.items.map((item) => {
                    const isRead = readIds.has(item.id);
                    return (
                      <div key={item.id} className={cn("px-4 py-3 hover:bg-ink-50 transition-colors", isRead && "opacity-50")}>
                        <div className="flex items-start gap-2.5">
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0 mt-1.5",
                            isRead                              && "bg-ink-300",
                            !isRead && item.priority === "high"   && "bg-bad",
                            !isRead && item.priority === "medium" && "bg-warn",
                            !isRead && item.priority === "low"    && "bg-good",
                          )} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-ink-900">{item.title}</div>
                            <div className="text-[11px] text-ink-500 mt-0.5">{item.detail}</div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!isRead && (
                              <button onClick={() => markRead(item.id)} className="text-[11px] text-ink-400 hover:text-ink-600">
                                Mark read
                              </button>
                            )}
                            <button
                              onClick={() => { markRead(item.id); navigate(item.href); setNotifOpen(false); }}
                              className="text-[11px] font-semibold text-brand-700 hover:text-brand-900"
                            >
                              View →
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {activeCategory.items.length === 0 && (
                    <div className="py-8 text-center text-[13px] text-ink-400">No items in this category.</div>
                  )}
                </div>

                <div className="px-4 py-2.5 border-t border-ink-100 shrink-0">
                  <button
                    onClick={() => { navigate(activeCategory.href); setNotifOpen(false); }}
                    className="text-[12px] text-brand-700 font-semibold hover:text-brand-900"
                  >
                    View all in {activeCategory.label} →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Help */}
          <button
            onClick={() => { setHelpOpen((v) => !v); setHelpTab("topics"); }}
            className="hidden sm:grid w-9 h-9 place-items-center rounded-full hover:bg-ink-100 text-ink-600"
            title="Help & Support"
          >
            <HelpCircle size={18} />
          </button>

          <div className="hidden sm:block h-6 w-px bg-ink-200" />

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 pr-1 pl-1 py-1 rounded-full hover:bg-ink-100 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-white grid place-items-center font-semibold text-sm shrink-0">
                {initials || "HO"}
              </div>
              <div className="hidden md:block text-left leading-tight pr-1">
                <div className="text-sm font-semibold text-ink-900 max-w-[160px] truncate">{fullName}</div>
                <div className="text-[11px] text-ink-500">{roleLabel}</div>
              </div>
              <ChevronDown size={13} className="text-ink-400" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 card shadow-pop z-40 overflow-hidden py-1">
                <div className="px-4 py-3 border-b border-ink-100 mb-1">
                  <div className="text-sm font-semibold text-ink-900 truncate">{fullName}</div>
                  <div className="text-[11px] text-ink-500">{roleLabel}</div>
                </div>
                <MenuItem icon={User}        label="My Profile" />
                <MenuItem icon={ShieldCheck} label="My Role & Access" />
                <MenuItem icon={Building2}   label="My Properties" />
                <MenuItem icon={Globe}       label="Language" trailing="English" />
                <div className="my-1 border-t border-ink-100" />
                <MenuItem icon={Bell}        label="Notification Preferences" />
                <MenuItem icon={KeyRound}    label="Security & MFA" />
                <div className="my-1 border-t border-ink-100" />
                <MenuItem icon={HelpCircle}  label="Help & Support" />
                <MenuItem icon={Settings}    label="Privacy & Terms" />
                <div className="my-1 border-t border-ink-100" />
                <button
                  onClick={async () => { setMenuOpen(false); await signOut(); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-ink-50 flex items-center gap-2.5 text-bad"
                >
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── ⌘K Global Search Modal ───────────────────────────────────────── */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 bg-ink-900/50 backdrop-blur-sm flex items-start justify-center pt-[10vh]"
          onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl shadow-pop-lg overflow-hidden mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input row */}
            <div className="flex items-center gap-3 px-4 border-b border-ink-200 h-14">
              <Search size={18} className="text-ink-400 shrink-0" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSearchIdx(0); }}
                onKeyDown={handleSearchKey}
                className="flex-1 text-sm text-ink-900 placeholder:text-ink-400 bg-transparent outline-none"
                placeholder="Search properties, reports, actions, suppliers…"
              />
              <button
                onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                className="btn-ghost h-7 w-7 p-0 shrink-0"
              >
                <X size={13} />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[400px] overflow-y-auto py-2">
              {SEARCH_CATEGORY_ORDER.map((cat) => {
                const catResults = filteredResults.filter((r) => r.category === cat);
                if (catResults.length === 0) return null;
                return (
                  <div key={cat}>
                    <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-400">
                      {cat}
                    </div>
                    {catResults.map((result) => {
                      const globalIdx = flatResults.indexOf(result);
                      return (
                        <button
                          key={result.id}
                          onClick={() => { navigate(result.href); setSearchOpen(false); setSearchQuery(""); }}
                          onMouseEnter={() => setSearchIdx(globalIdx)}
                          className={cn(
                            "w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors",
                            globalIdx === searchIdx ? "bg-brand-50" : "hover:bg-ink-50"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-ink-900">{result.title}</div>
                            <div className="text-[11px] text-ink-500">{result.subtitle}</div>
                          </div>
                          <ArrowRight size={13} className="text-ink-300 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
              {filteredResults.length === 0 && (
                <div className="py-8 text-center text-[13px] text-ink-400">
                  No results for "{searchQuery}".
                </div>
              )}
            </div>

            {/* Keyboard hints */}
            <div className="px-4 py-2 border-t border-ink-100 flex items-center gap-4 text-[11px] text-ink-400 bg-ink-50">
              <span><kbd className="kbd">↑↓</kbd> navigate</span>
              <span><kbd className="kbd">↵</kbd> open</span>
              <span><kbd className="kbd">Esc</kbd> close</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Help Panel ───────────────────────────────────────────────────── */}
      {helpOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setHelpOpen(false)} />
          <div className="fixed inset-y-0 right-0 w-80 z-50 bg-white border-l border-ink-200 shadow-pop-lg flex flex-col">
            <div className="px-4 py-3 border-b border-ink-200 flex items-center justify-between shrink-0">
              <span className="text-sm font-semibold text-ink-900">Help & Support</span>
              <button onClick={() => setHelpOpen(false)} className="btn-ghost w-7 h-7 p-0"><X size={13} /></button>
            </div>

            <div className="flex items-center gap-1 px-3 py-2 border-b border-ink-100 shrink-0">
              {(["topics", "contact", "whats-new"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setHelpTab(t)}
                  className={cn("tab text-[11px] py-1 px-2.5", t === helpTab && "tab-active")}
                >
                  {t === "topics" ? "Topics" : t === "contact" ? "Contact" : "What's New"}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {helpTab === "topics" && (
                <div className="p-3 space-y-1.5">
                  {HELP_TOPICS.map((topic) => (
                    <button
                      key={topic.label}
                      className="w-full text-left p-3 rounded-xl hover:bg-ink-50 flex items-start gap-3 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 grid place-items-center shrink-0 mt-0.5">
                        <topic.icon size={15} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-ink-900">{topic.label}</div>
                        <div className="text-[11px] text-ink-500 mt-0.5 leading-snug">{topic.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {helpTab === "contact" && (
                <div className="p-4">
                  {contactSent ? (
                    <div className="text-center py-8">
                      <CheckCircle2 size={32} className="text-good mx-auto mb-3" />
                      <div className="text-sm font-semibold text-ink-900">Message sent!</div>
                      <div className="text-[12px] text-ink-500 mt-1">We'll reply within 1 business day.</div>
                      <button
                        onClick={() => { setContactSent(false); setContactForm({ subject: "", message: "" }); }}
                        className="btn-ghost text-[12px] mt-4"
                      >
                        Send another
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={(e) => { e.preventDefault(); setContactSent(true); }} className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-medium text-ink-500 mb-1">Subject</label>
                        <input
                          required
                          value={contactForm.subject}
                          onChange={(e) => setContactForm((f) => ({ ...f, subject: e.target.value }))}
                          className="input w-full text-sm"
                          placeholder="Briefly describe your issue…"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-ink-500 mb-1">Message</label>
                        <textarea
                          required
                          rows={5}
                          value={contactForm.message}
                          onChange={(e) => setContactForm((f) => ({ ...f, message: e.target.value }))}
                          className="input w-full text-sm resize-none"
                          placeholder="Describe the issue in detail…"
                        />
                      </div>
                      <button type="submit" className="btn-primary w-full text-sm h-9">Send message</button>
                    </form>
                  )}
                </div>
              )}

              {helpTab === "whats-new" && (
                <div className="p-3 space-y-1">
                  {CHANGELOG.map((entry, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-ink-50">
                      <span className={cn(
                        "mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0",
                        entry.tag === "Feature"     && "bg-brand-50 text-brand-700",
                        entry.tag === "Improvement" && "bg-info/10 text-info",
                        entry.tag === "Fix"         && "bg-warn/10 text-warn",
                      )}>
                        {entry.tag}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] text-ink-700 leading-snug">{entry.text}</div>
                        <div className="text-[10px] text-ink-400 mt-0.5">{entry.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────── */
function FilterPill({
  icon, label, value, onClick, dimmed = false,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  onClick?: () => void;
  dimmed?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-medium text-ink-400 uppercase tracking-[0.06em]">{label}</span>
      <button
        onClick={onClick}
        className={cn(
          "mt-0.5 inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-ink-200 bg-white text-[12px] font-medium hover:bg-ink-50 transition-colors",
          dimmed ? "text-ink-400" : "text-ink-700"
        )}
      >
        {icon && <span className="text-ink-400">{icon}</span>}
        {value}
        <ChevronDown size={11} className="text-ink-400" />
      </button>
    </div>
  );
}

function DropdownList({
  options, value, onSelect, onClose, width = "w-44",
}: {
  options: string[];
  value: string;
  onSelect: (v: string) => void;
  onClose: () => void;
  width?: string;
}) {
  return (
    <div className={cn("absolute left-0 top-12 card shadow-pop z-40 py-1 overflow-y-auto max-h-64", width)}>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => { onSelect(opt); onClose(); }}
          className={cn(
            "w-full text-left px-3 py-2 text-[12px] hover:bg-ink-50 flex items-center gap-2",
            opt === value && "font-semibold text-brand-700"
          )}
        >
          {opt === value
            ? <CheckCircle2 size={12} className="text-good shrink-0" />
            : <span className="w-[12px] shrink-0" />}
          {opt}
        </button>
      ))}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  trailing,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  trailing?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-2 text-sm hover:bg-ink-50 flex items-center gap-2.5 text-ink-700"
    >
      <Icon size={14} className="text-ink-400 shrink-0" />
      <span className="flex-1">{label}</span>
      {trailing && <span className="text-[11px] text-ink-400">{trailing}</span>}
    </button>
  );
}
