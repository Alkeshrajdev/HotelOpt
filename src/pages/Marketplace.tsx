// Solutions Hub — integrations, sustainability programmes, renewable energy & offsets, advisory services.

import { useState } from "react";
import {
  Activity, AlertCircle, AlertTriangle, ArrowRight, Award, Bot, Building2,
  CheckCircle2, ChevronDown, ChevronRight, Clock, Cpu, Download, ExternalLink,
  FileCheck2, FilePlus2, Globe, Info, Key, Leaf, Link2, Plug, Plus,
  RefreshCw, Search, Settings, ShieldCheck, Sparkles, Sun, Trash2,
  TrendingDown, Users, Webhook, X, Zap,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

/* ================================================================== */
/* Types                                                                */
/* ================================================================== */

type Tab = "all" | "integrations" | "programmes" | "offsets" | "advisory";

type IntgCategory = "accounting" | "pms" | "bms" | "reporting" | "sustainability";
type IntgStatus   = "connected" | "configured" | "available" | "recommended" | "coming-soon";
type AuthType     = "oauth" | "api-key" | "webhook" | "manual";
type SetupEffort  = "easy" | "medium" | "it-required";
type PricingTier  = "included" | "paid" | "coming-soon";

type Integration = {
  id: string;
  name: string;
  category: IntgCategory;
  tagline: string;
  description: string;
  businessValue: string;
  authType: AuthType;
  setupEffort: SetupEffort;
  dataFields: string[];
  setupSteps: string[];
  pricingTier: PricingTier;
  status: IntgStatus;
  lastSync?: string;
  health?: "good" | "warn" | "error";
  relatedModules?: string[];
  recommended?: boolean;
  recommendedReason?: string;
};

type Programme = {
  id: string;
  name: string;
  body: string;
  purpose: string;
  region: string;
  status: "enrolled" | "pending" | "available";
  relatedModule?: string;
  evidenceRequired?: boolean;
};

type OffsetRequest = {
  id: string;
  type: "I-REC / EAC" | "Carbon Credit" | "EKOenergy" | "Claim Advisory" | "Retirement";
  property: string;
  quantity: string;
  purpose: string;
  status: "Draft" | "Quote requested" | "Quote shared" | "Pending approval" | "Approved" | "Retired" | "Completed";
  requestedBy: string;
  lastUpdated: string;
};

type AdvisoryService = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  deliverable: string;
  effort: string;
  pricingTier: PricingTier;
};

/* ================================================================== */
/* Mock data                                                            */
/* ================================================================== */

const INTEGRATIONS: Integration[] = [
  {
    id: "i1", name: "QuickBooks Online", category: "accounting",
    tagline: "Sync procurement spend for Scope 3 supplier emissions automatically.",
    description: "Hotel Optimizer connects to QuickBooks Online via OAuth 2.0, pulling invoice line items nightly. Spend is mapped to emission categories using your configured cost-centre taxonomy.",
    businessValue: "Automates Scope 3 purchased goods and services calculations — no manual CSV exports.",
    authType: "oauth", setupEffort: "easy", pricingTier: "included", status: "connected",
    lastSync: "Today 02:14", health: "good",
    dataFields: ["Invoice line items", "Vendor classification", "Cost centres", "Currency"],
    setupSteps: ["Connect via OAuth", "Map cost centres to emission categories", "Set nightly sync schedule", "Review first import"],
    relatedModules: ["Data Capture", "Performance"],
  },
  {
    id: "i2", name: "Xero", category: "accounting",
    tagline: "Pull purchase invoices for automated supplier emissions calculations.",
    description: "Pull purchase invoices from Xero directly into Hotel Optimizer. Supplier spend is automatically classified against Scope 3 categories using the GHG Protocol purchase-based method.",
    businessValue: "Covers Scope 3 Cat 1 (purchased goods) and Cat 2 (capital goods) without manual data entry.",
    authType: "oauth", setupEffort: "easy", pricingTier: "included", status: "available",
    recommended: true, recommendedReason: "Scope 3 procurement data is incomplete — connect Xero to fill the gap.",
    dataFields: ["Purchase invoices", "Supplier names", "Account codes", "Tax details"],
    setupSteps: ["Authorise via Xero OAuth", "Map account codes to emission categories", "Enable auto-import"],
    relatedModules: ["Data Capture", "Performance"],
  },
  {
    id: "i3", name: "SAP S/4HANA", category: "accounting",
    tagline: "Enterprise ERP procurement data sync for large hotel groups.",
    description: "Connect SAP S/4HANA to pull purchase orders and cost allocation data for Scope 3 calculation. Supports multi-entity hotel groups with subsidiary mapping.",
    businessValue: "Enterprise-grade Scope 3 automation across complex ownership and brand structures.",
    authType: "api-key", setupEffort: "it-required", pricingTier: "paid", status: "coming-soon",
    dataFields: ["Purchase orders", "Cost allocation", "Vendor master"],
    setupSteps: ["Generate API key in SAP", "Configure field mapping", "Set sync frequency"],
    relatedModules: ["Data Capture", "Performance"],
  },
  {
    id: "i4", name: "Workday Financials", category: "accounting",
    tagline: "Pull cost allocation and vendor data from Workday.",
    description: "Connect Workday Financials to pull purchase orders and cost allocation data for Scope 3 calculation. Supports multi-entity hotel groups with subsidiary mapping.",
    businessValue: "Automates procurement-to-emission calculations for HR-adjacent spend categories.",
    authType: "api-key", setupEffort: "it-required", pricingTier: "paid", status: "available",
    dataFields: ["Purchase orders", "Cost allocation", "Vendor master"],
    setupSteps: ["Generate API key in Workday", "Configure field mapping", "Set sync frequency"],
    relatedModules: ["Data Capture"],
  },
  {
    id: "i5", name: "Opera Cloud (PMS)", category: "pms",
    tagline: "Inject per-stay carbon footprint into booking confirmations.",
    description: "Bi-directional integration with Opera Cloud: Hotel Optimizer reads occupancy, room type, and length-of-stay data to calculate HCMI carbon footprints, then injects the result back into booking confirmation emails.",
    businessValue: "Provides accurate per-stay footprint for HCMI reporting and guest carbon disclosure.",
    authType: "api-key", setupEffort: "medium", pricingTier: "included", status: "connected",
    lastSync: "Today 06:00", health: "good",
    dataFields: ["Occupancy", "Room type", "Length of stay", "Guest count"],
    setupSteps: ["Generate Opera Cloud API key", "Configure webhook endpoint", "Map room types to intensity bands", "Enable footprint injection"],
    relatedModules: ["Data Capture", "Guest Engagement"],
  },
  {
    id: "i6", name: "Siemens Desigo BMS", category: "bms",
    tagline: "Real-time energy and HVAC data from building management systems.",
    description: "Connect to Siemens Desigo via BACnet/IP or REST adapter. Energy meter readings, chiller performance, and HVAC runtimes flow directly — eliminating manual reads and enabling sub-hourly granularity.",
    businessValue: "Replaces manual meter reads with automated, sub-hourly energy data for high-accuracy intensity reporting.",
    authType: "api-key", setupEffort: "it-required", pricingTier: "paid", status: "connected",
    lastSync: "1 min ago", health: "warn",
    dataFields: ["Energy meter readings", "HVAC runtime", "Chiller COP", "Zone temperatures"],
    setupSteps: ["Install BACnet/IP adapter", "Whitelist Hotel Optimizer IP", "Configure meter mapping", "Validate first 24h data"],
    relatedModules: ["Data Capture", "Performance"],
    recommended: true, recommendedReason: "Energy data for 3 properties is still entered manually — BMS connection would automate this.",
  },
  {
    id: "i7", name: "Schneider EcoStruxure", category: "bms",
    tagline: "Sub-hourly energy metering for precise intensity reporting.",
    description: "Pull metering data from Schneider EcoStruxure at 15-minute intervals. Data is validated against expected ranges and anomalies are flagged automatically in the Review & Approval queue.",
    businessValue: "High-frequency metering improves Genuine Performance accuracy and catches anomalies early.",
    authType: "webhook", setupEffort: "it-required", pricingTier: "paid", status: "available",
    dataFields: ["kWh readings", "Demand peaks", "Power factor"],
    setupSteps: ["Configure EcoStruxure webhook", "Set payload format", "Add to Hotel Optimizer receiver"],
    relatedModules: ["Data Capture", "Performance"],
  },
  {
    id: "i8", name: "Power BI", category: "reporting",
    tagline: "Live sustainability dashboard feed via OData endpoint.",
    description: "Connect Power BI to the Hotel Optimizer OData endpoint for live sustainability dashboards. Supports DirectQuery for real-time reporting or scheduled import for large property portfolios.",
    businessValue: "Enables custom executive dashboards and board-level ESG reporting without manual exports.",
    authType: "api-key", setupEffort: "easy", pricingTier: "included", status: "configured",
    lastSync: "2 days ago", health: "good",
    dataFields: ["All performance metrics", "Property metadata", "Trend series"],
    setupSteps: ["Copy OData URL from Admin → API keys", "Add API key in Power BI", "Build your reports"],
    relatedModules: ["Reports & Disclosure"],
  },
  {
    id: "i9", name: "Booking.com Sustainability Badge", category: "reporting",
    tagline: "Auto-sync certification status for the Booking.com sustainability badge.",
    description: "Keep your Booking.com sustainability badge in sync automatically. Hotel Optimizer pushes certification status and key metrics after each approval cycle — no manual updates required.",
    businessValue: "Reduces OTA listing maintenance and keeps guest-facing sustainability claims current.",
    authType: "webhook", setupEffort: "easy", pricingTier: "included", status: "configured",
    dataFields: ["Certification status", "Key sustainability metrics", "Badge tier"],
    setupSteps: ["Register webhook in Booking.com Extranet", "Add secret to Hotel Optimizer", "Test delivery"],
    relatedModules: ["Certifications", "Guest Engagement"],
  },
  {
    id: "i10", name: "Cvent Supplier Network", category: "reporting",
    tagline: "Publish verified sustainability data to the Cvent buyer network.",
    description: "Automatically push approved sustainability metrics to your Cvent CSN supplier profile. Buyers searching on Cvent see your verified Hotel Optimizer data — always up to date.",
    businessValue: "Wins corporate and MICE business by exposing verified sustainability credentials to procurement teams.",
    authType: "api-key", setupEffort: "easy", pricingTier: "included", status: "connected",
    lastSync: "Today 00:05", health: "good",
    dataFields: ["Energy intensity", "Water intensity", "Carbon per stay", "Certifications"],
    setupSteps: ["Add Cvent API key", "Map metric fields", "Enable scheduled push"],
    relatedModules: ["Reports & Disclosure", "Certifications"],
  },
  {
    id: "i11", name: "HRS GreenStay", category: "sustainability",
    tagline: "Qualify for HRS corporate buyer sustainability programme.",
    description: "Connect Hotel Optimizer to the HRS GreenStay programme to expose verified sustainability data to HRS's corporate buyer network. Properties that meet thresholds receive the GreenStay badge.",
    businessValue: "Access to HRS corporate buyer demand that requires verified sustainability performance.",
    authType: "api-key", setupEffort: "easy", pricingTier: "paid", status: "available",
    dataFields: ["Energy intensity", "Carbon per stay", "Waste diversion"],
    setupSteps: ["Apply to HRS GreenStay", "Add programme API key", "Submit for validation"],
    relatedModules: ["Certifications", "Reports & Disclosure"],
  },
  {
    id: "i12", name: "Salesforce Net Zero Cloud", category: "reporting",
    tagline: "Coming soon — push scope data into Salesforce NZC.",
    description: "Planned integration to push Hotel Optimizer Scope 1, 2, and 3 data directly into Salesforce Net Zero Cloud for enterprise-wide carbon accounting.",
    businessValue: "Unifies hotel sustainability data into corporate-wide carbon platforms.",
    authType: "oauth", setupEffort: "it-required", pricingTier: "coming-soon", status: "coming-soon",
    dataFields: [], setupSteps: [],
    relatedModules: ["Reports & Disclosure"],
  },
];

const PROGRAMMES: Programme[] = [
  {
    id: "p1", name: "GSTC Industry Criteria", body: "Global Sustainable Tourism Council",
    purpose: "Align hotel operations to globally recognised sustainable tourism criteria for buyers, certification bodies, and GDS systems.",
    region: "Global", status: "enrolled", relatedModule: "Certifications",
  },
  {
    id: "p2", name: "Green Globe Certification", body: "Green Globe International",
    purpose: "Certify hotels against global sustainability criteria covering energy, water, waste, community, and supply chain.",
    region: "Global", status: "enrolled", relatedModule: "Certifications", evidenceRequired: true,
  },
  {
    id: "p3", name: "EarthCheck", body: "EarthCheck Pty Ltd",
    purpose: "Benchmarked environmental management certification aligned to APEC Tourism Working Group and ISO 14001.",
    region: "APAC · EMEA", status: "pending", relatedModule: "Certifications", evidenceRequired: true,
  },
  {
    id: "p4", name: "Cvent Supplier Network", body: "Cvent Inc.",
    purpose: "Expose verified sustainability metrics to corporate MICE buyers who require sustainability data at RFP stage.",
    region: "Americas · EMEA", status: "enrolled", relatedModule: "Reports & Disclosure",
  },
  {
    id: "p5", name: "HRS GreenStay", body: "HRS Group",
    purpose: "Qualify for the HRS GreenStay badge, which is required by corporate clients using the HRS platform for hotel sourcing.",
    region: "EMEA", status: "available", relatedModule: "Certifications",
  },
  {
    id: "p6", name: "Booking.com Sustainability Programme", body: "Booking.com",
    purpose: "Display verified sustainability credentials on Booking.com property listings to attract eco-conscious guests.",
    region: "Global", status: "enrolled", relatedModule: "Guest Engagement",
  },
];

const OFFSET_REQUESTS: OffsetRequest[] = [
  { id: "OR-001", type: "I-REC / EAC", property: "All Properties", quantity: "2,500 MWh", purpose: "Scope 2 market-based reporting", status: "Quote shared",      requestedBy: "A. Smits",  lastUpdated: "2026-04-28" },
  { id: "OR-002", type: "Carbon Credit", property: "Greenview Resort", quantity: "1,000 tCO₂e", purpose: "Residual emissions FY2025",  status: "Pending approval", requestedBy: "J. Patel",  lastUpdated: "2026-04-22" },
  { id: "OR-003", type: "I-REC / EAC", property: "Mountain Lodge",   quantity: "180 MWh",    purpose: "Green Globe certification",   status: "Approved",         requestedBy: "A. Smits",  lastUpdated: "2026-04-15" },
  { id: "OR-004", type: "Claim Advisory", property: "Portfolio",    quantity: "—",           purpose: "Review Scope 2 public claim",  status: "Completed",        requestedBy: "M. Torres", lastUpdated: "2026-03-30" },
  { id: "OR-005", type: "Carbon Credit", property: "City Centre Hotel", quantity: "50 tCO₂e", purpose: "Event offset — APAC summit", status: "Draft",           requestedBy: "R. Tan",    lastUpdated: "2026-04-30" },
];

const ADVISORY_SERVICES: AdvisoryService[] = [
  {
    id: "a1", name: "Decarbonisation Roadmap",
    tagline: "Tailored net-zero pathway for your portfolio.",
    description: "Our advisors work with your data in Hotel Optimizer to produce a property-by-property decarbonisation roadmap — prioritised by ROI, carbon impact, and certification relevance.",
    deliverable: "Written roadmap + Hotel Optimizer action plan upload",
    effort: "4–6 weeks", pricingTier: "paid",
  },
  {
    id: "a2", name: "Claim Review & Approval",
    tagline: "Expert review before any public sustainability claim.",
    description: "Before publishing renewable energy, carbon neutral, or net-zero claims on your website, reports, or OTA profiles, our advisory team reviews them for accuracy, completeness, and compliance with ISEAL and GHG Protocol guidance.",
    deliverable: "Claim review report + approved wording",
    effort: "5–10 business days", pricingTier: "paid",
  },
  {
    id: "a3", name: "GHG Inventory Assurance",
    tagline: "Independent verification of your GHG inventory.",
    description: "Third-party limited or reasonable assurance of your GHG inventory, aligned to ISAE 3410 and GHG Protocol Corporate Standard. Assurance statement suitable for annual reports and ESG disclosures.",
    deliverable: "Assurance statement + signed letter",
    effort: "3–6 weeks", pricingTier: "paid",
  },
  {
    id: "a4", name: "Certification Readiness Sprint",
    tagline: "Structured gap-close support for Green Globe, EarthCheck, or LEED.",
    description: "A focused engagement to close evidence and data gaps before your certification audit — working directly in Hotel Optimizer to upload, review, and approve required evidence.",
    deliverable: "Evidence checklist, gap-close report, certification submission support",
    effort: "2–4 weeks", pricingTier: "paid",
  },
];

/* ================================================================== */
/* Helpers                                                              */
/* ================================================================== */

const INTG_STATUS_TONE: Record<IntgStatus, "good" | "info" | "brand" | "neutral" | "warn"> = {
  connected: "good", configured: "info", available: "neutral", recommended: "brand", "coming-soon": "warn",
};
const INTG_STATUS_LABEL: Record<IntgStatus, string> = {
  connected: "Connected", configured: "Configured", available: "Available",
  recommended: "Recommended", "coming-soon": "Coming soon",
};
const AUTH_LABEL: Record<AuthType, string> = {
  oauth: "OAuth 2.0", "api-key": "API key", webhook: "Webhook", manual: "Manual upload",
};
const SETUP_LABEL: Record<SetupEffort, string> = {
  easy: "Easy setup", medium: "Medium", "it-required": "IT support needed",
};
const SETUP_TONE: Record<SetupEffort, "good" | "warn" | "neutral"> = {
  easy: "good", medium: "warn", "it-required": "neutral",
};
const PRICING_LABEL: Record<PricingTier, string> = {
  included: "Included", paid: "Paid add-on", "coming-soon": "Coming soon",
};
const PROG_TONE: Record<Programme["status"], "good" | "warn" | "neutral"> = {
  enrolled: "good", pending: "warn", available: "neutral",
};
const PROG_LABEL: Record<Programme["status"], string> = {
  enrolled: "Enrolled", pending: "Pending", available: "Available",
};
const REQUEST_TONE: Record<OffsetRequest["status"], "good" | "info" | "warn" | "neutral" | "brand"> = {
  "Draft": "neutral", "Quote requested": "info", "Quote shared": "brand",
  "Pending approval": "warn", "Approved": "good", "Retired": "good", "Completed": "good",
};
const HEALTH_COLOR: Record<NonNullable<Integration["health"]>, string> = {
  good: "text-good", warn: "text-warn", error: "text-bad",
};

const INTG_CAT_LABELS: Record<IntgCategory, string> = {
  accounting: "Accounting", pms: "Property Management", bms: "BMS / IoT",
  reporting: "Reporting & Disclosure", sustainability: "Sustainability",
};

/* ================================================================== */
/* Main page                                                            */
/* ================================================================== */

export default function SolutionsHub() {
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pricingFilter, setPricingFilter] = useState("all");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [showIREC, setShowIREC] = useState(false);
  const [showCarbon, setShowCarbon] = useState(false);
  const [summaryFilter, setSummaryFilter] = useState<string | null>(null);

  const activeIntegrations = INTEGRATIONS.filter(
    (i) => i.status === "connected" || i.status === "configured"
  );
  const recommended = INTEGRATIONS.filter((i) => i.recommended);
  const available = INTEGRATIONS.filter(
    (i) => i.status === "available" || i.status === "coming-soon"
  );

  const filteredIntegrations = INTEGRATIONS.filter((i) => {
    const matchStatus = statusFilter === "all" || i.status === statusFilter;
    const matchPricing = pricingFilter === "all" || i.pricingTier === pricingFilter;
    const matchSearch = !search ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.tagline.toLowerCase().includes(search.toLowerCase());
    const matchSummary = !summaryFilter
      || (summaryFilter === "active" && (i.status === "connected" || i.status === "configured"))
      || (summaryFilter === "recommended" && i.recommended)
      || (summaryFilter === "available" && (i.status === "available" || i.status === "coming-soon"));
    return matchStatus && matchPricing && matchSearch && matchSummary;
  });

  const TABS: { key: Tab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "integrations", label: "Integrations" },
    { key: "programmes", label: "Sustainability Programmes" },
    { key: "offsets", label: "Renewable Energy & Offsets" },
    { key: "advisory", label: "Advisory Services" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Solutions Hub"
        title="Solutions Hub"
        subtitle="Connect systems, activate sustainability programmes, purchase renewable energy certificates or carbon credits, and access advisory support to improve reporting, certification, and decarbonisation performance."
      />

      {/* ── Summary tiles ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { key: "active",      label: "Active integrations",       value: activeIntegrations.length, hint: "connected or configured", tone: "good",   icon: Plug },
          { key: "recommended", label: "Recommended for you",       value: recommended.length,        hint: "based on current data gaps", tone: "brand",  icon: Sparkles },
          { key: "pending",     label: "Pending requests",          value: OFFSET_REQUESTS.filter(r => !["Completed","Cancelled"].includes(r.status)).length, hint: "awaiting approval or quote", tone: "warn", icon: Clock },
          { key: "available",   label: "Available add-ons",         value: available.length,          hint: "ready to activate",        tone: "neutral", icon: Zap },
        ].map(({ key, label, value, hint, icon: Icon }) => (
          <button
            key={key}
            onClick={() => {
              setSummaryFilter(summaryFilter === key ? null : key);
              if (key === "pending") { setTab("offsets"); return; }
              setTab("integrations");
            }}
            className={cn(
              "card p-5 text-left hover:shadow-pop transition-all",
              summaryFilter === key && "ring-2 ring-brand-700"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <Icon size={16} className="text-ink-500" />
              {summaryFilter === key && <X size={12} className="text-ink-400" />}
            </div>
            <div className="text-2xl font-bold text-ink-900 tabular-nums">{value}</div>
            <div className="text-[13px] font-semibold text-ink-700 mt-0.5">{label}</div>
            <div className="text-[11px] text-ink-400 mt-0.5">{hint}</div>
          </button>
        ))}
      </div>

      {/* ── Tab strip ── */}
      <div className="flex items-center gap-1 flex-wrap border-b border-ink-200 -mb-3 pb-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSummaryFilter(null); }}
            className={cn(
              "px-4 py-2.5 text-[13px] font-semibold transition-colors border-b-2 -mb-px",
              tab === t.key
                ? "border-brand-700 text-brand-700"
                : "border-transparent text-ink-500 hover:text-ink-900"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Filter bar (shown for All, Integrations) ── */}
      {(tab === "all" || tab === "integrations") && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              className="input pl-8 h-9 text-[13px] w-full"
              placeholder="Search integrations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="input h-9 text-[13px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="connected">Connected</option>
            <option value="configured">Configured</option>
            <option value="available">Available</option>
            <option value="recommended">Recommended</option>
            <option value="coming-soon">Coming soon</option>
          </select>
          <select className="input h-9 text-[13px]" value={pricingFilter} onChange={(e) => setPricingFilter(e.target.value)}>
            <option value="all">All pricing</option>
            <option value="included">Included</option>
            <option value="paid">Paid add-on</option>
            <option value="coming-soon">Coming soon</option>
          </select>
        </div>
      )}

      {/* ── Tab content ── */}
      {tab === "all" && (
        <AllTab
          activeIntegrations={activeIntegrations}
          recommended={recommended}
          programmes={PROGRAMMES}
          requests={OFFSET_REQUESTS}
          onOpenIntg={setDrawerId}
          onOpenIREC={() => setShowIREC(true)}
          onOpenCarbon={() => setShowCarbon(true)}
          onSwitchTab={setTab}
        />
      )}

      {tab === "integrations" && (
        <IntegrationsTab integrations={filteredIntegrations} onOpen={setDrawerId} />
      )}

      {tab === "programmes" && (
        <ProgrammesTab programmes={PROGRAMMES} />
      )}

      {tab === "offsets" && (
        <OffsetsTab
          requests={OFFSET_REQUESTS}
          onOpenIREC={() => setShowIREC(true)}
          onOpenCarbon={() => setShowCarbon(true)}
          pendingOnly={summaryFilter === "pending"}
        />
      )}

      {tab === "advisory" && (
        <AdvisoryTab services={ADVISORY_SERVICES} />
      )}

      {/* ── Drawers ── */}
      {drawerId && (
        <IntegrationDrawer
          intg={INTEGRATIONS.find((i) => i.id === drawerId)!}
          onClose={() => setDrawerId(null)}
        />
      )}
      {showIREC && <IRECRequestDrawer onClose={() => setShowIREC(false)} />}
      {showCarbon && <CarbonCreditDrawer onClose={() => setShowCarbon(false)} />}
    </div>
  );
}

/* ================================================================== */
/* All tab                                                              */
/* ================================================================== */

function AllTab({
  activeIntegrations, recommended, programmes, requests, onOpenIntg, onOpenIREC, onOpenCarbon, onSwitchTab,
}: {
  activeIntegrations: Integration[];
  recommended: Integration[];
  programmes: Programme[];
  requests: OffsetRequest[];
  onOpenIntg: (id: string) => void;
  onOpenIREC: () => void;
  onOpenCarbon: () => void;
  onSwitchTab: (tab: Tab) => void;
}) {
  return (
    <div className="space-y-6">

      {/* Active connections */}
      {activeIntegrations.length > 0 && (
        <Card>
          <CardHeader
            title="Active connections"
            hint="live health status"
            right={
              <button onClick={() => onSwitchTab("integrations")} className="text-[12px] font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1">
                View all <ChevronRight size={11} />
              </button>
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-5">
            {activeIntegrations.map((i) => (
              <div key={i.id} className="rounded-xl border border-ink-200 p-4 flex items-center gap-3 hover:bg-ink-50/40">
                <div className={cn("w-2 h-2 rounded-full shrink-0", i.health === "good" ? "bg-good" : i.health === "warn" ? "bg-warn" : "bg-bad")} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[13px] text-ink-900 truncate">{i.name}</div>
                  {i.lastSync && (
                    <div className="text-[11px] text-ink-400 mt-0.5 flex items-center gap-1">
                      <Clock size={9} /> Last sync: {i.lastSync}
                    </div>
                  )}
                </div>
                <Badge tone={INTG_STATUS_TONE[i.status]}>{INTG_STATUS_LABEL[i.status]}</Badge>
                <button onClick={() => onOpenIntg(i.id)} className="btn-ghost h-7 px-2 text-[12px] shrink-0">
                  <Settings size={11} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recommended for your portfolio */}
      {recommended.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={13} className="text-brand-700" />
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-500">Recommended for your portfolio</span>
            <div className="h-px flex-1 bg-ink-100" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommended.map((i) => (
              <div key={i.id} className="rounded-xl border border-brand-200 bg-brand-50/30 p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-100 grid place-items-center text-brand-700 shrink-0">
                  <Plug size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-[13px] text-ink-900">{i.name}</span>
                    <Badge tone="brand">Recommended</Badge>
                  </div>
                  {i.recommendedReason && (
                    <p className="text-[12px] text-ink-600 leading-snug mb-2">{i.recommendedReason}</p>
                  )}
                  <p className="text-[11px] text-ink-500">{i.businessValue}</p>
                </div>
                <button className="btn-primary h-7 px-3 text-[12px] shrink-0" onClick={() => onOpenIntg(i.id)}>
                  Connect
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Renewable Energy & Offsets quick actions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sun size={13} className="text-warn" />
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-500">Renewable Energy & Offsets</span>
          <div className="h-px flex-1 bg-ink-100" />
          <button onClick={() => onSwitchTab("offsets")} className="text-[11px] font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1 shrink-0">
            View all <ChevronRight size={11} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-ink-200 bg-white p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-warn/10 grid place-items-center text-warn shrink-0">
              <Sun size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[13px] text-ink-900 mb-1">Request I-RECs / EACs</div>
              <p className="text-[12px] text-ink-500 leading-snug">Renewable energy certificates for Scope 2 market-based reporting and certification evidence.</p>
            </div>
            <button className="btn-primary h-7 px-3 text-[12px] shrink-0" onClick={onOpenIREC}>Start</button>
          </div>
          <div className="rounded-xl border border-ink-200 bg-white p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-good/10 grid place-items-center text-good shrink-0">
              <Leaf size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[13px] text-ink-900 mb-1">Request Carbon Credits</div>
              <p className="text-[12px] text-ink-500 leading-snug">Residual emissions compensation through verified carbon projects — Verra, Gold Standard, and more.</p>
            </div>
            <button className="btn-primary h-7 px-3 text-[12px] shrink-0" onClick={onOpenCarbon}>Start</button>
          </div>
        </div>
        {/* Pending requests mini-table */}
        {requests.filter(r => !["Completed","Cancelled"].includes(r.status)).length > 0 && (
          <div className="mt-3 rounded-xl border border-ink-200 overflow-hidden">
            <div className="bg-ink-50 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-500">Open requests</div>
            {requests.filter(r => !["Completed","Cancelled"].includes(r.status)).slice(0, 3).map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 border-t border-ink-100 text-[12px]">
                <span className="text-ink-400 font-mono">{r.id}</span>
                <span className="font-medium text-ink-800 flex-1 truncate">{r.type} — {r.property}</span>
                <span className="text-ink-500">{r.quantity}</span>
                <Badge tone={REQUEST_TONE[r.status]}>{r.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sustainability programmes compact */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Award size={13} className="text-good" />
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-500">Sustainability Programmes</span>
          <div className="h-px flex-1 bg-ink-100" />
          <button onClick={() => onSwitchTab("programmes")} className="text-[11px] font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1 shrink-0">
            View all <ChevronRight size={11} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {programmes.slice(0, 3).map((p) => (
            <div key={p.id} className="rounded-xl border border-ink-200 p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-50 grid place-items-center text-brand-700 shrink-0">
                <Award size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[13px] text-ink-900 truncate">{p.name}</div>
                <div className="text-[11px] text-ink-400 flex items-center gap-1 mt-0.5"><Globe size={9} />{p.region}</div>
              </div>
              <Badge tone={PROG_TONE[p.status]}>{PROG_LABEL[p.status]}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Integrations tab                                                     */
/* ================================================================== */

function IntegrationsTab({ integrations, onOpen }: { integrations: Integration[]; onOpen: (id: string) => void }) {
  const grouped = (["accounting", "pms", "bms", "reporting", "sustainability"] as IntgCategory[]).map((cat) => ({
    cat,
    items: integrations.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0);

  if (integrations.length === 0) {
    return (
      <div className="py-12 text-center text-ink-400 text-sm">
        No integrations match your filters.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(({ cat, items }) => (
        <div key={cat}>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-400 mb-3">{INTG_CAT_LABELS[cat]}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {items.map((i) => (
              <IntegrationCard key={i.id} intg={i} onOpen={() => onOpen(i.id)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================================================================== */
/* Programmes tab                                                       */
/* ================================================================== */

function ProgrammesTab({ programmes }: { programmes: Programme[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {programmes.map((p) => (
        <div key={p.id} className="rounded-xl border border-ink-200 bg-white p-5 flex flex-col gap-3 hover:shadow-pop transition-all">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-brand-50 grid place-items-center text-brand-700 shrink-0">
                <Award size={16} />
              </div>
              <div>
                <div className="font-semibold text-[13px] text-ink-900">{p.name}</div>
                <div className="text-[10px] text-ink-400 mt-0.5">{p.body}</div>
              </div>
            </div>
            <Badge tone={PROG_TONE[p.status]}>{PROG_LABEL[p.status]}</Badge>
          </div>
          <p className="text-[12px] text-ink-600 leading-snug flex-1">{p.purpose}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-ink-400 flex items-center gap-1"><Globe size={9} /> {p.region}</span>
            {p.relatedModule && (
              <span className="text-[10px] text-ink-400 flex items-center gap-1"><Link2 size={9} /> {p.relatedModule}</span>
            )}
            {p.evidenceRequired && (
              <span className="text-[10px] text-warn flex items-center gap-1"><FileCheck2 size={9} /> Evidence required</span>
            )}
          </div>
          <button className={cn("btn-secondary h-8 px-4 text-[12px] justify-center", p.status === "enrolled" && "border-brand-200 text-brand-700")}>
            {p.status === "enrolled" ? <><Settings size={12} /> Manage</> : p.status === "pending" ? <><Clock size={12} /> In progress</> : <><ArrowRight size={12} /> Enrol</>}
          </button>
        </div>
      ))}
    </div>
  );
}

/* ================================================================== */
/* Renewable Energy & Offsets tab                                       */
/* ================================================================== */

function OffsetsTab({
  requests, onOpenIREC, onOpenCarbon, pendingOnly,
}: {
  requests: OffsetRequest[];
  onOpenIREC: () => void;
  onOpenCarbon: () => void;
  pendingOnly?: boolean;
}) {
  const completed = requests.filter(r => ["Retired","Completed"].includes(r.status));
  const open      = requests.filter(r => !["Retired","Completed","Cancelled"].includes(r.status));
  const shown     = pendingOnly ? open : requests;

  const summaryTiles = [
    { label: "I-RECs / EACs requested", value: requests.filter(r => r.type === "I-REC / EAC").length, icon: Sun },
    { label: "Carbon credits requested", value: requests.filter(r => r.type === "Carbon Credit").length, icon: Leaf },
    { label: "Pending approvals", value: open.filter(r => r.status === "Pending approval").length, icon: Clock },
    { label: "Certificates issued", value: completed.length, icon: FileCheck2 },
    { label: "Retired instruments", value: requests.filter(r => r.status === "Retired").length, icon: CheckCircle2 },
    { label: "Est. emissions covered", value: "1,000 tCO₂e", icon: TrendingDown },
  ];

  return (
    <div className="space-y-6">

      {/* Section header */}
      <div className="rounded-xl bg-ink-50 border border-ink-200 p-4">
        <div className="text-[13px] font-semibold text-ink-800 mb-1">Renewable Energy & Offsets</div>
        <p className="text-[12px] text-ink-500 leading-relaxed">
          Request renewable energy certificates, carbon credits, retirement support, and claim review services for credible reporting, certification, and decarbonisation claims.
          All requests go through an internal approval workflow before purchase and retirement.
        </p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {summaryTiles.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-4 text-center">
            <Icon size={16} className="text-ink-400 mx-auto mb-2" />
            <div className="text-xl font-bold text-ink-900 tabular-nums">{value}</div>
            <div className="text-[10px] text-ink-500 mt-0.5 leading-snug">{label}</div>
          </div>
        ))}
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[
          {
            icon: Sun, iconBg: "bg-warn/10 text-warn",
            title: "Request I-RECs / EACs",
            desc: "Renewable electricity certificates for Scope 2 market-based reporting, certification evidence, and RE100 / corporate buyer requirements.",
            cta: "Start request", action: onOpenIREC, primary: true,
          },
          {
            icon: Leaf, iconBg: "bg-good/10 text-good",
            title: "Request Carbon Credits",
            desc: "Verified carbon credits (Verra, Gold Standard) for residual emissions compensation, event offsets, and guest stay footprint programmes.",
            cta: "Start request", action: onOpenCarbon, primary: true,
          },
          {
            icon: Award, iconBg: "bg-brand-50 text-brand-700",
            title: "EKOenergy / Green Label",
            desc: "Premium renewable energy label for LEED, Green Globe, and corporate buyer requirements that need independently audited green electricity evidence.",
            cta: "Check options", action: () => {}, primary: false,
          },
          {
            icon: FileCheck2, iconBg: "bg-info/10 text-info",
            title: "Certificate Retirement",
            desc: "Retire existing certificates or credits under the correct beneficiary name. Retirement evidence is automatically linked to reports and certifications.",
            cta: "Start retirement", action: () => {}, primary: false,
          },
          {
            icon: ShieldCheck, iconBg: "bg-pillar-gov/10 text-pillar-gov",
            title: "Claim Advisory",
            desc: "Expert review of renewable energy or carbon claims before use in reports, websites, or OTA profiles. Prevents greenwashing exposure.",
            cta: "Request review", action: () => {}, primary: false,
          },
        ].map(({ icon: Icon, iconBg, title, desc, cta, action, primary }) => (
          <div key={title} className="rounded-xl border border-ink-200 bg-white p-5 flex flex-col gap-3 hover:shadow-pop transition-all">
            <div className={cn("w-10 h-10 rounded-xl grid place-items-center shrink-0", iconBg)}>
              <Icon size={18} />
            </div>
            <div>
              <div className="font-semibold text-[14px] text-ink-900 mb-1">{title}</div>
              <p className="text-[12px] text-ink-500 leading-snug">{desc}</p>
            </div>
            <button
              className={cn("mt-auto h-8 px-4 text-[12px] justify-center", primary ? "btn-primary" : "btn-secondary")}
              onClick={action}
            >
              {cta}
            </button>
          </div>
        ))}
      </div>

      {/* Request tracker */}
      <Card>
        <CardHeader
          title="Request tracker"
          hint="all requests — sorted by last update"
          right={
            <div className="flex items-center gap-2">
              <button className="btn-secondary h-7 px-3 text-[12px]" onClick={onOpenIREC}>
                <Plus size={12} /> New request
              </button>
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Request ID</th>
                <th className="table-th">Type</th>
                <th className="table-th">Property</th>
                <th className="table-th">Quantity</th>
                <th className="table-th">Purpose</th>
                <th className="table-th">Status</th>
                <th className="table-th">Requested by</th>
                <th className="table-th">Last updated</th>
                <th className="table-th text-right pr-6">Action</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="hover:bg-ink-50/60">
                  <td className="table-td font-mono text-ink-500 text-[11px]">{r.id}</td>
                  <td className="table-td font-medium text-ink-800">{r.type}</td>
                  <td className="table-td text-ink-600">{r.property}</td>
                  <td className="table-td tabular-nums font-semibold text-ink-800">{r.quantity}</td>
                  <td className="table-td text-ink-600 max-w-[160px] truncate">{r.purpose}</td>
                  <td className="table-td"><Badge tone={REQUEST_TONE[r.status]}>{r.status}</Badge></td>
                  <td className="table-td text-ink-600">{r.requestedBy}</td>
                  <td className="table-td text-ink-500">{r.lastUpdated}</td>
                  <td className="table-td text-right pr-6">
                    <button className="btn-secondary h-7 px-3 text-[12px] text-brand-700 border-brand-200 hover:bg-brand-50">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Completed instruments */}
      {completed.length > 0 && (
        <Card>
          <CardHeader title="Completed instruments" hint="certificates issued and available as evidence" />
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-ink-50">
                  <th className="table-th">Type</th>
                  <th className="table-th">Quantity</th>
                  <th className="table-th">Property</th>
                  <th className="table-th">Purpose</th>
                  <th className="table-th">Last updated</th>
                  <th className="table-th">Certificate</th>
                  <th className="table-th text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody>
                {completed.map((r) => (
                  <tr key={r.id} className="hover:bg-ink-50/60">
                    <td className="table-td font-medium text-ink-800">{r.type}</td>
                    <td className="table-td tabular-nums font-semibold text-ink-800">{r.quantity}</td>
                    <td className="table-td text-ink-600">{r.property}</td>
                    <td className="table-td text-ink-600 max-w-[160px] truncate">{r.purpose}</td>
                    <td className="table-td text-ink-500">{r.lastUpdated}</td>
                    <td className="table-td">
                      <button className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700 hover:underline">
                        <Download size={11} /> Download
                      </button>
                    </td>
                    <td className="table-td text-right pr-6">
                      <button className="btn-secondary h-7 px-3 text-[12px] text-brand-700 border-brand-200 hover:bg-brand-50">
                        View evidence
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ================================================================== */
/* Advisory tab                                                         */
/* ================================================================== */

function AdvisoryTab({ services }: { services: AdvisoryService[] }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-ink-50 border border-ink-200 p-4 flex items-start gap-3">
        <Bot size={16} className="text-brand-700 shrink-0 mt-0.5" />
        <p className="text-[13px] text-ink-700 leading-relaxed">
          Advisory services are delivered by Hotel Optimizer's sustainability consulting team. All engagements use your live platform data directly — no data export required. Outputs are uploaded back into the platform as evidence.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((s) => (
          <div key={s.id} className="rounded-xl border border-ink-200 bg-white p-5 flex flex-col gap-4 hover:shadow-pop transition-all">
            <div>
              <div className="font-semibold text-[14px] text-ink-900 mb-1">{s.name}</div>
              <p className="text-[12px] text-ink-500 italic mb-2">{s.tagline}</p>
              <p className="text-[13px] text-ink-700 leading-relaxed">{s.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-ink-50 px-3 py-2">
                <div className="text-[10px] text-ink-400 uppercase font-semibold mb-0.5">Deliverable</div>
                <div className="text-[12px] text-ink-700 font-medium">{s.deliverable}</div>
              </div>
              <div className="rounded-lg bg-ink-50 px-3 py-2">
                <div className="text-[10px] text-ink-400 uppercase font-semibold mb-0.5">Typical effort</div>
                <div className="text-[12px] text-ink-700 font-medium">{s.effort}</div>
              </div>
            </div>
            <button className="btn-secondary h-8 px-4 text-[12px] justify-center mt-auto">
              <ArrowRight size={12} /> Request engagement
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Integration card                                                     */
/* ================================================================== */

function IntegrationCard({ intg, onOpen }: { intg: Integration; onOpen: () => void }) {
  const isComing = intg.status === "coming-soon";
  return (
    <div className={cn(
      "rounded-xl border border-ink-200 bg-white p-4 flex flex-col gap-3 hover:shadow-pop transition-all",
      isComing && "opacity-60",
      intg.recommended && "border-brand-200 bg-brand-50/20"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={cn("w-9 h-9 rounded-lg grid place-items-center shrink-0", intg.recommended ? "bg-brand-100 text-brand-700" : "bg-ink-100 text-ink-500")}>
            <Plug size={16} />
          </div>
          <div>
            <div className="font-semibold text-[13px] text-ink-900">{intg.name}</div>
            <div className="text-[10px] text-ink-400">{INTG_CAT_LABELS[intg.category]}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge tone={INTG_STATUS_TONE[intg.status]}>{INTG_STATUS_LABEL[intg.status]}</Badge>
        </div>
      </div>
      <p className="text-[12px] text-ink-600 leading-snug flex-1">{intg.tagline}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge tone={intg.pricingTier === "included" ? "good" : intg.pricingTier === "paid" ? "info" : "neutral"} className="text-[10px]">
          {PRICING_LABEL[intg.pricingTier]}
        </Badge>
        <Badge tone={SETUP_TONE[intg.setupEffort]} className="text-[10px]">
          {SETUP_LABEL[intg.setupEffort]}
        </Badge>
      </div>
      <div className="flex items-center justify-between gap-2 mt-auto">
        {intg.lastSync && (
          <span className={cn("text-[10px] flex items-center gap-1", intg.health ? HEALTH_COLOR[intg.health] : "text-ink-400")}>
            <Activity size={10} /> {intg.lastSync}
          </span>
        )}
        {!isComing && (
          <button className={cn("btn-primary h-7 px-3 text-[12px] ml-auto")} onClick={onOpen}>
            {intg.status === "connected" || intg.status === "configured"
              ? <><Settings size={11} /> Manage</>
              : <><Zap size={11} /> Connect</>}
          </button>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Integration detail drawer                                            */
/* ================================================================== */

function IntegrationDrawer({ intg, onClose }: { intg: Integration; onClose: () => void }) {
  const [stepsOpen, setStepsOpen] = useState(true);

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-ink-900/30 backdrop-blur-[2px]" />
      <div
        className="relative h-full w-full max-w-md bg-white shadow-2xl flex flex-col border-l border-ink-200 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-ink-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 grid place-items-center text-brand-700 shrink-0">
              <Plug size={18} />
            </div>
            <div>
              <div className="font-bold text-ink-900">{intg.name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge tone={INTG_STATUS_TONE[intg.status]}>{INTG_STATUS_LABEL[intg.status]}</Badge>
                <span className="text-[11px] text-ink-400">{AUTH_LABEL[intg.authType]}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-md hover:bg-ink-100 shrink-0">
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5 overflow-y-auto">
          {intg.lastSync && (
            <div className="flex items-center gap-3 rounded-xl border border-ink-200 px-4 py-3">
              <Activity size={13} className={intg.health ? HEALTH_COLOR[intg.health] : "text-ink-400"} />
              <div className="flex-1 text-[12px] text-ink-700">
                <span className="font-medium">Last sync:</span> {intg.lastSync}
              </div>
              <button className="btn-ghost h-7 px-2 text-[12px] text-brand-700"><RefreshCw size={11} /> Sync now</button>
            </div>
          )}

          <div>
            <div className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide mb-1.5">What it does</div>
            <p className="text-[13px] text-ink-700 leading-relaxed">{intg.description}</p>
          </div>

          <div className="rounded-lg bg-brand-50 border border-brand-100 px-4 py-3">
            <div className="text-[10px] font-semibold text-brand-700 uppercase tracking-wide mb-1">Business value</div>
            <p className="text-[13px] text-brand-800">{intg.businessValue}</p>
          </div>

          {intg.dataFields.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <Link2 size={11} /> Data fields synced
              </div>
              <div className="flex flex-wrap gap-1.5">
                {intg.dataFields.map((f) => (
                  <span key={f} className="text-[11px] bg-brand-50 text-brand-700 border border-brand-100 rounded-md px-2 py-1">{f}</span>
                ))}
              </div>
            </div>
          )}

          {intg.relatedModules && intg.relatedModules.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide mb-1.5">Related platform modules</div>
              <div className="flex flex-wrap gap-1.5">
                {intg.relatedModules.map((m) => (
                  <span key={m} className="text-[11px] bg-ink-100 text-ink-600 rounded-md px-2 py-1">{m}</span>
                ))}
              </div>
            </div>
          )}

          {intg.setupSteps.length > 0 && (
            <div>
              <button
                onClick={() => setStepsOpen((v) => !v)}
                className="w-full flex items-center justify-between text-[11px] font-semibold text-ink-500 uppercase tracking-wide mb-1.5"
              >
                <span className="flex items-center gap-1.5"><ShieldCheck size={11} /> Setup steps</span>
                <ChevronDown size={11} className={cn("transition-transform", stepsOpen && "rotate-180")} />
              </button>
              {stepsOpen && (
                <ol className="space-y-2">
                  {intg.setupSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[12px] text-ink-700">
                      <span className="w-5 h-5 rounded-full bg-brand-50 text-brand-700 grid place-items-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          <div className="rounded-xl border border-ink-200 p-4 grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] font-semibold text-ink-400 uppercase tracking-wide mb-0.5">Pricing</div>
              <div className="text-[13px] font-semibold text-ink-800">{PRICING_LABEL[intg.pricingTier]}</div>
              {intg.pricingTier === "paid" && <div className="text-[11px] text-ink-500 mt-0.5">Contact your account manager</div>}
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-400 uppercase tracking-wide mb-0.5">Setup effort</div>
              <div className="text-[13px] font-semibold text-ink-800">{SETUP_LABEL[intg.setupEffort]}</div>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-ink-200 flex gap-2 shrink-0">
          {intg.status === "connected" && <button className="btn-secondary flex-1"><Settings size={14} /> Edit settings</button>}
          {intg.status === "configured" && <button className="btn-primary flex-1"><CheckCircle2 size={14} /> Activate</button>}
          {intg.status === "available" && intg.pricingTier !== "coming-soon" && (
            <button className="btn-primary flex-1"><Zap size={14} /> Connect now</button>
          )}
          <button className="btn-ghost" onClick={onClose}><ExternalLink size={13} /> Docs</button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* I-REC / EAC Request wizard                                          */
/* ================================================================== */

const IREC_PURPOSES = [
  "Scope 2 market-based reporting",
  "Renewable electricity claim",
  "ESG / sustainability report",
  "Green Globe / certification evidence",
  "Corporate buyer requirement",
  "Net zero / decarbonisation target support",
  "Other",
];

const IREC_STEPS = [
  "Purpose", "Consumption", "Preferences", "Beneficiary", "Claim guidance", "Submit",
];

function IRECRequestDrawer({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    purpose: "", year: "2025", country: "", property: "All Properties",
    consumptionKwh: "", source: "platform-data", fullCoverage: true,
    technology: "no-preference", countryPref: "local", vintage: "2025",
    ekoEnergy: false, certCompat: "",
    legalEntity: "", beneficiaryName: "", reportingPeriod: "FY 2025",
    retirementPurpose: "", claimText: "", contactEmail: "",
    confirmed: false, submitted: false,
  });

  const mwhRequired = form.consumptionKwh ? Math.ceil(parseFloat(form.consumptionKwh) / 1000) : 0;
  const update = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  if (form.submitted) {
    return (
      <DrawerShell title="I-REC / EAC Request" subtitle="Quote requested" onClose={onClose}>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-good/10 grid place-items-center text-good">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <div className="font-bold text-ink-900 text-lg">Request submitted</div>
            <p className="text-[13px] text-ink-500 mt-1 leading-relaxed">
              Your I-REC / EAC request has been logged with status <strong>Quote requested</strong>. The platform team will prepare options within 2 business days.
            </p>
          </div>
          <div className="w-full rounded-xl bg-ink-50 border border-ink-200 p-4 text-left space-y-1.5 text-[12px]">
            <div className="flex justify-between"><span className="text-ink-500">Purpose</span><span className="font-medium text-ink-800">{form.purpose}</span></div>
            <div className="flex justify-between"><span className="text-ink-500">Quantity</span><span className="font-medium text-ink-800">{mwhRequired.toLocaleString()} MWh</span></div>
            <div className="flex justify-between"><span className="text-ink-500">Property</span><span className="font-medium text-ink-800">{form.property}</span></div>
            <div className="flex justify-between"><span className="text-ink-500">Technology</span><span className="font-medium text-ink-800">{form.technology}</span></div>
            <div className="flex justify-between"><span className="text-ink-500">Vintage</span><span className="font-medium text-ink-800">{form.vintage}</span></div>
          </div>
          <button className="btn-primary w-full justify-center" onClick={onClose}>Close</button>
        </div>
      </DrawerShell>
    );
  }

  return (
    <DrawerShell title="Request I-RECs / EACs" subtitle="Renewable electricity certificates" onClose={onClose}>
      {/* Step indicator */}
      <div className="px-5 py-3 border-b border-ink-100 shrink-0">
        <div className="flex items-center gap-0">
          {IREC_STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={cn(
                "w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold transition-colors",
                i < step ? "bg-good text-white" : i === step ? "bg-brand-700 text-white" : "bg-ink-100 text-ink-400"
              )}>
                {i < step ? <CheckCircle2 size={12} /> : i + 1}
              </div>
              {i < IREC_STEPS.length - 1 && (
                <div className={cn("flex-1 h-px w-8 mx-0.5", i < step ? "bg-good" : "bg-ink-200")} />
              )}
            </div>
          ))}
        </div>
        <div className="text-[11px] font-semibold text-ink-600 mt-1.5">{IREC_STEPS[step]}</div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Step 0 — Purpose */}
        {step === 0 && (
          <>
            <p className="text-[13px] text-ink-600">What is the purpose of this certificate request?</p>
            {IREC_PURPOSES.map((p) => (
              <label key={p} className={cn(
                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                form.purpose === p ? "border-brand-700 bg-brand-50" : "border-ink-200 hover:border-ink-300"
              )}>
                <input type="radio" name="purpose" value={p} checked={form.purpose === p}
                  onChange={() => update("purpose", p)} className="accent-brand-700" />
                <span className="text-[13px] text-ink-800">{p}</span>
              </label>
            ))}
          </>
        )}

        {/* Step 1 — Consumption */}
        {step === 1 && (
          <>
            <p className="text-[13px] text-ink-600">Enter the electricity consumption to be covered by certificates.</p>
            <div className="space-y-3">
              <div>
                <label className="field-label">Reporting year</label>
                <select className="input w-full" value={form.year} onChange={(e) => update("year", e.target.value)}>
                  {["2023","2024","2025","2026"].map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Property</label>
                <select className="input w-full" value={form.property} onChange={(e) => update("property", e.target.value)}>
                  {["All Properties","Greenview Resort","Mountain Lodge","City Centre Hotel","Palm Beach Resort"].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Electricity consumption (kWh)</label>
                <input className="input w-full" type="number" placeholder="e.g. 2500000"
                  value={form.consumptionKwh} onChange={(e) => update("consumptionKwh", e.target.value)} />
              </div>
              <div>
                <label className="field-label">Data source</label>
                <select className="input w-full" value={form.source} onChange={(e) => update("source", e.target.value)}>
                  <option value="platform-data">Hotel Optimizer approved data</option>
                  <option value="utility-bill">Utility bill</option>
                  <option value="meter">Meter reading</option>
                  <option value="uploaded">Uploaded data</option>
                </select>
              </div>
            </div>
            {mwhRequired > 0 && (
              <div className="rounded-xl bg-brand-50 border border-brand-100 p-4 space-y-1.5 text-[13px]">
                <div className="flex justify-between font-medium">
                  <span className="text-brand-700">Required certificates</span>
                  <span className="text-brand-900 font-bold">{mwhRequired.toLocaleString()} MWh</span>
                </div>
                <div className="flex justify-between text-brand-600">
                  <span>Coverage</span><span>{form.fullCoverage ? "100%" : "Partial"}</span>
                </div>
                <div className="text-[11px] text-brand-500">
                  Electricity consumption: {parseFloat(form.consumptionKwh || "0").toLocaleString()} kWh = {mwhRequired.toLocaleString()} I-RECs required
                </div>
              </div>
            )}
          </>
        )}

        {/* Step 2 — Preferences */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-[13px] text-ink-600">Select certificate preferences. The platform will match available options.</p>
            <div>
              <label className="field-label">Technology preference</label>
              <select className="input w-full" value={form.technology} onChange={(e) => update("technology", e.target.value)}>
                {["no-preference","Solar","Wind","Hydro","Biomass"].map(t => <option key={t} value={t}>{t === "no-preference" ? "No preference" : t}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Country / origin preference</label>
              <select className="input w-full" value={form.countryPref} onChange={(e) => update("countryPref", e.target.value)}>
                <option value="local">Local (same country as property)</option>
                <option value="regional">Regional</option>
                <option value="global">Global</option>
              </select>
            </div>
            <div>
              <label className="field-label">Vintage year</label>
              <select className="input w-full" value={form.vintage} onChange={(e) => update("vintage", e.target.value)}>
                {["2023","2024","2025","2026"].map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="accent-brand-700" checked={form.ekoEnergy}
                onChange={(e) => update("ekoEnergy", e.target.checked)} />
              <span className="text-[13px] text-ink-700">Request EKOenergy label (premium renewable energy label)</span>
            </label>
            <div>
              <label className="field-label">Certification compatibility requirement</label>
              <select className="input w-full" value={form.certCompat} onChange={(e) => update("certCompat", e.target.value)}>
                <option value="">None / not required</option>
                <option value="leed">LEED</option>
                <option value="green-globe">Green Globe</option>
                <option value="re100">RE100</option>
                <option value="esg">Internal ESG policy</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 3 — Beneficiary */}
        {step === 3 && (
          <div className="space-y-3">
            <div className="rounded-lg bg-warn/10 border border-warn/25 p-3 flex items-start gap-2 text-[12px] text-warn">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              Please confirm beneficiary name carefully. Once certificates are retired, changes may not be possible.
            </div>
            <div>
              <label className="field-label">Legal entity name</label>
              <input className="input w-full" placeholder="e.g. Acme Hotels Ltd" value={form.legalEntity}
                onChange={(e) => update("legalEntity", e.target.value)} />
            </div>
            <div>
              <label className="field-label">Beneficiary name (appears on certificate)</label>
              <input className="input w-full" placeholder="Name as it should appear on the certificate"
                value={form.beneficiaryName} onChange={(e) => update("beneficiaryName", e.target.value)} />
            </div>
            <div>
              <label className="field-label">Reporting period</label>
              <select className="input w-full" value={form.reportingPeriod} onChange={(e) => update("reportingPeriod", e.target.value)}>
                {["FY 2023","FY 2024","FY 2025","CY 2025"].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Retirement purpose</label>
              <input className="input w-full" placeholder="e.g. Scope 2 market-based reporting FY2025"
                value={form.retirementPurpose} onChange={(e) => update("retirementPurpose", e.target.value)} />
            </div>
            <div>
              <label className="field-label">Contact email</label>
              <input className="input w-full" type="email" placeholder="name@company.com"
                value={form.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} />
            </div>
          </div>
        )}

        {/* Step 4 — Claim guidance */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-ink-200 bg-ink-50 p-4 space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Claim guidance</div>
              {[
                "I-RECs / EACs support renewable electricity and Scope 2 market-based reporting.",
                "They should not be used to claim full carbon neutrality unless remaining emissions and other requirements are also addressed.",
                "Claims should be reviewed before public disclosure on websites, OTA profiles, or guest-facing materials.",
                "Guest-facing renewable energy claims require approval by an authorised user within the platform.",
              ].map((g) => (
                <div key={g} className="flex items-start gap-2 text-[12px] text-ink-600">
                  <Info size={13} className="text-info shrink-0 mt-0.5" />
                  {g}
                </div>
              ))}
            </div>
            <label className={cn(
              "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors",
              form.confirmed ? "border-brand-700 bg-brand-50" : "border-ink-200"
            )}>
              <input type="checkbox" className="accent-brand-700 mt-0.5" checked={form.confirmed}
                onChange={(e) => update("confirmed", e.target.checked)} />
              <span className="text-[13px] text-ink-800">
                I confirm that the claim purpose and beneficiary details are correct, and I understand the guidance above.
              </span>
            </label>
          </div>
        )}

        {/* Step 5 — Summary */}
        {step === 5 && (
          <div className="space-y-4">
            <p className="text-[13px] text-ink-600">Review your request before submitting. The platform team will prepare a quote within 2 business days.</p>
            <div className="rounded-xl border border-ink-200 divide-y divide-ink-100 text-[13px]">
              {[
                ["Purpose", form.purpose],
                ["Reporting year", form.year],
                ["Property", form.property],
                ["Consumption", `${parseFloat(form.consumptionKwh || "0").toLocaleString()} kWh`],
                ["Required certificates", `${mwhRequired.toLocaleString()} MWh`],
                ["Technology", form.technology],
                ["Vintage", form.vintage],
                ["EKOenergy label", form.ekoEnergy ? "Yes" : "No"],
                ["Beneficiary", form.beneficiaryName || "—"],
                ["Legal entity", form.legalEntity || "—"],
                ["Reporting period", form.reportingPeriod],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between px-4 py-2.5">
                  <span className="text-ink-500">{k}</span>
                  <span className="font-medium text-ink-800">{v}</span>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-info/10 border border-info/25 p-3 text-[12px] text-info">
              After submission, status will be set to <strong>Quote requested</strong>. You will be notified when a quote is ready for review and approval.
            </div>
          </div>
        )}
      </div>

      {/* Footer navigation */}
      <div className="p-5 border-t border-ink-200 flex items-center justify-between gap-3 shrink-0">
        <button
          className="btn-secondary"
          onClick={() => step === 0 ? onClose() : setStep((s) => s - 1)}
        >
          {step === 0 ? "Cancel" : "Back"}
        </button>
        <div className="text-[11px] text-ink-400">Step {step + 1} of {IREC_STEPS.length}</div>
        {step < IREC_STEPS.length - 1 ? (
          <button
            className="btn-primary"
            disabled={step === 0 && !form.purpose || step === 4 && !form.confirmed}
            onClick={() => setStep((s) => s + 1)}
          >
            Next
          </button>
        ) : (
          <button className="btn-primary" onClick={() => update("submitted", true)}>
            Submit request
          </button>
        )}
      </div>
    </DrawerShell>
  );
}

/* ================================================================== */
/* Carbon Credit Request wizard                                         */
/* ================================================================== */

const CARBON_PURPOSES = [
  "Residual emissions after reduction actions",
  "Event carbon offset",
  "Guest stay footprint offset",
  "Corporate ESG report",
  "Net zero claim support",
  "Certification requirement",
  "Voluntary compensation",
  "Other",
];

const CARBON_STEPS = [
  "Purpose", "Emissions", "Preferences", "Guidance", "Beneficiary", "Submit",
];

function CarbonCreditDrawer({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    purpose: "", emissions: "", scope: "Scope 1",
    year: "2025", property: "All Properties", fullOffset: true,
    standard: "no-preference", projectType: "no-preference", geoPreference: "",
    vintage: "2025", removalPreference: "no-preference", budget: "",
    legalEntity: "", beneficiaryName: "", retirementPurpose: "", claimText: "", contactEmail: "",
    confirmed: false, submitted: false,
  });

  const update = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  if (form.submitted) {
    return (
      <DrawerShell title="Carbon Credit Request" subtitle="Quote requested" onClose={onClose}>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-good/10 grid place-items-center text-good">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <div className="font-bold text-ink-900 text-lg">Request submitted</div>
            <p className="text-[13px] text-ink-500 mt-1 leading-relaxed">
              Your carbon credit request has been logged with status <strong>Quote requested</strong>.
            </p>
          </div>
          <div className="w-full rounded-xl bg-ink-50 border border-ink-200 p-4 text-left space-y-1.5 text-[12px]">
            <div className="flex justify-between"><span className="text-ink-500">Purpose</span><span className="font-medium text-ink-800">{form.purpose}</span></div>
            <div className="flex justify-between"><span className="text-ink-500">Emissions</span><span className="font-medium text-ink-800">{form.emissions} tCO₂e</span></div>
            <div className="flex justify-between"><span className="text-ink-500">Property</span><span className="font-medium text-ink-800">{form.property}</span></div>
          </div>
          <button className="btn-primary w-full justify-center" onClick={onClose}>Close</button>
        </div>
      </DrawerShell>
    );
  }

  return (
    <DrawerShell title="Request Carbon Credits" subtitle="Verified emission reductions" onClose={onClose}>
      {/* Step indicator */}
      <div className="px-5 py-3 border-b border-ink-100 shrink-0">
        <div className="flex items-center gap-0">
          {CARBON_STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={cn(
                "w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold transition-colors",
                i < step ? "bg-good text-white" : i === step ? "bg-brand-700 text-white" : "bg-ink-100 text-ink-400"
              )}>
                {i < step ? <CheckCircle2 size={12} /> : i + 1}
              </div>
              {i < CARBON_STEPS.length - 1 && (
                <div className={cn("h-px w-6 mx-0.5", i < step ? "bg-good" : "bg-ink-200")} />
              )}
            </div>
          ))}
        </div>
        <div className="text-[11px] font-semibold text-ink-600 mt-1.5">{CARBON_STEPS[step]}</div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Step 0 — Purpose */}
        {step === 0 && (
          <>
            <p className="text-[13px] text-ink-600">What is the purpose of this carbon credit request?</p>
            {CARBON_PURPOSES.map((p) => (
              <label key={p} className={cn(
                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                form.purpose === p ? "border-brand-700 bg-brand-50" : "border-ink-200 hover:border-ink-300"
              )}>
                <input type="radio" name="carbon-purpose" value={p} checked={form.purpose === p}
                  onChange={() => update("purpose", p)} className="accent-brand-700" />
                <span className="text-[13px] text-ink-800">{p}</span>
              </label>
            ))}
          </>
        )}

        {/* Step 1 — Emissions */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-[13px] text-ink-600">Enter the emissions quantity to be offset.</p>
            <div>
              <label className="field-label">Emissions quantity (tCO₂e)</label>
              <input className="input w-full" type="number" placeholder="e.g. 1000"
                value={form.emissions} onChange={(e) => update("emissions", e.target.value)} />
            </div>
            <div>
              <label className="field-label">Emission scope / source</label>
              <select className="input w-full" value={form.scope} onChange={(e) => update("scope", e.target.value)}>
                {["Scope 1","Scope 2 residual","Scope 3","Event footprint","Guest stay footprint","Other"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Property</label>
              <select className="input w-full" value={form.property} onChange={(e) => update("property", e.target.value)}>
                {["All Properties","Greenview Resort","Mountain Lodge","City Centre Hotel"].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Reporting year</label>
              <select className="input w-full" value={form.year} onChange={(e) => update("year", e.target.value)}>
                {["2023","2024","2025"].map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
            {form.emissions && (
              <div className="rounded-xl bg-good/10 border border-good/25 p-4 space-y-1 text-[13px]">
                <div className="flex justify-between font-medium">
                  <span className="text-good">Credits required</span>
                  <span className="font-bold text-good">{parseFloat(form.emissions).toLocaleString()} tCO₂e</span>
                </div>
                <div className="text-[11px] text-ink-500">1 carbon credit = 1 tonne CO₂e avoided or removed</div>
              </div>
            )}
          </div>
        )}

        {/* Step 2 — Preferences */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-[13px] text-ink-600">Select your credit preferences. We will match available projects.</p>
            <div>
              <label className="field-label">Preferred standard</label>
              <select className="input w-full" value={form.standard} onChange={(e) => update("standard", e.target.value)}>
                <option value="no-preference">No preference</option>
                <option value="verra">Verra (VCS)</option>
                <option value="gold-standard">Gold Standard</option>
                <option value="other-approved">Other approved standard</option>
              </select>
            </div>
            <div>
              <label className="field-label">Project type</label>
              <select className="input w-full" value={form.projectType} onChange={(e) => update("projectType", e.target.value)}>
                <option value="no-preference">No preference</option>
                <option value="nature-based">Nature-based (forests, blue carbon)</option>
                <option value="renewable-energy">Renewable energy</option>
                <option value="energy-efficiency">Energy efficiency</option>
                <option value="cookstove">Cookstove / clean cooking</option>
                <option value="waste-management">Waste management</option>
              </select>
            </div>
            <div>
              <label className="field-label">Removal vs avoidance preference</label>
              <select className="input w-full" value={form.removalPreference} onChange={(e) => update("removalPreference", e.target.value)}>
                <option value="no-preference">No preference</option>
                <option value="removal">Carbon removal preferred</option>
                <option value="avoidance">Avoidance / reduction</option>
              </select>
            </div>
            <div>
              <label className="field-label">Budget range (optional)</label>
              <input className="input w-full" placeholder="e.g. USD 5,000 – 15,000"
                value={form.budget} onChange={(e) => update("budget", e.target.value)} />
            </div>
          </div>
        )}

        {/* Step 3 — Guidance */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-warn/30 bg-warn/5 p-4 space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wide text-warn">Reduction-first guidance</div>
              {[
                "Carbon credits should be used for residual emissions after reduction efforts — not as a substitute for them.",
                "Purchasing credits does not automatically create a 'carbon neutral' or 'net zero' claim. Public claims require expert review and approval.",
                "Credits should be retired in the correct registry under the correct beneficiary name.",
                "Guest-facing or public claims must be reviewed and approved before publication.",
              ].map((g) => (
                <div key={g} className="flex items-start gap-2 text-[12px] text-ink-600">
                  <AlertTriangle size={13} className="text-warn shrink-0 mt-0.5" />
                  {g}
                </div>
              ))}
            </div>
            <label className={cn(
              "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors",
              form.confirmed ? "border-brand-700 bg-brand-50" : "border-ink-200"
            )}>
              <input type="checkbox" className="accent-brand-700 mt-0.5" checked={form.confirmed}
                onChange={(e) => update("confirmed", e.target.checked)} />
              <span className="text-[13px] text-ink-800">
                I understand that carbon credits should support credible residual emissions compensation and that public claims require review and approval.
              </span>
            </label>
          </div>
        )}

        {/* Step 4 — Beneficiary */}
        {step === 4 && (
          <div className="space-y-3">
            <div className="rounded-lg bg-warn/10 border border-warn/25 p-3 flex items-start gap-2 text-[12px] text-warn">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              Please confirm beneficiary name and retirement purpose carefully. Once credits are retired, changes may not be possible.
            </div>
            <div>
              <label className="field-label">Legal entity name</label>
              <input className="input w-full" placeholder="e.g. Acme Hotels Ltd"
                value={form.legalEntity} onChange={(e) => update("legalEntity", e.target.value)} />
            </div>
            <div>
              <label className="field-label">Beneficiary name (on retirement certificate)</label>
              <input className="input w-full" placeholder="Name as it should appear on the certificate"
                value={form.beneficiaryName} onChange={(e) => update("beneficiaryName", e.target.value)} />
            </div>
            <div>
              <label className="field-label">Retirement purpose</label>
              <input className="input w-full" placeholder="e.g. Residual emissions FY2025"
                value={form.retirementPurpose} onChange={(e) => update("retirementPurpose", e.target.value)} />
            </div>
            <div>
              <label className="field-label">Contact email</label>
              <input className="input w-full" type="email" placeholder="name@company.com"
                value={form.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} />
            </div>
          </div>
        )}

        {/* Step 5 — Summary */}
        {step === 5 && (
          <div className="space-y-4">
            <p className="text-[13px] text-ink-600">Review your request. The platform team will prepare credit options within 3 business days.</p>
            <div className="rounded-xl border border-ink-200 divide-y divide-ink-100 text-[13px]">
              {[
                ["Purpose", form.purpose],
                ["Emissions quantity", `${form.emissions} tCO₂e`],
                ["Scope / source", form.scope],
                ["Property", form.property],
                ["Reporting year", form.year],
                ["Standard", form.standard],
                ["Project type", form.projectType],
                ["Beneficiary", form.beneficiaryName || "—"],
                ["Retirement purpose", form.retirementPurpose || "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between px-4 py-2.5">
                  <span className="text-ink-500">{k}</span>
                  <span className="font-medium text-ink-800">{v}</span>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-info/10 border border-info/25 p-3 text-[12px] text-info">
              Status will be set to <strong>Quote requested</strong>. You will receive credit options to compare before any approval or purchase.
            </div>
          </div>
        )}
      </div>

      <div className="p-5 border-t border-ink-200 flex items-center justify-between gap-3 shrink-0">
        <button
          className="btn-secondary"
          onClick={() => step === 0 ? onClose() : setStep((s) => s - 1)}
        >
          {step === 0 ? "Cancel" : "Back"}
        </button>
        <div className="text-[11px] text-ink-400">Step {step + 1} of {CARBON_STEPS.length}</div>
        {step < CARBON_STEPS.length - 1 ? (
          <button
            className="btn-primary"
            disabled={(step === 0 && !form.purpose) || (step === 3 && !form.confirmed)}
            onClick={() => setStep((s) => s + 1)}
          >
            Next
          </button>
        ) : (
          <button className="btn-primary" onClick={() => update("submitted", true)}>
            Submit request
          </button>
        )}
      </div>
    </DrawerShell>
  );
}

/* ================================================================== */
/* Shared drawer shell                                                  */
/* ================================================================== */

function DrawerShell({
  title, subtitle, onClose, children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-ink-900/30 backdrop-blur-[2px]" />
      <div
        className="relative h-full w-full max-w-lg bg-white shadow-2xl flex flex-col border-l border-ink-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-200 shrink-0">
          <div>
            <div className="font-bold text-ink-900">{title}</div>
            <div className="text-[11px] text-ink-400 mt-0.5">{subtitle}</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-md hover:bg-ink-100">
            <X size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
