import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Award,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Globe,
  Key,
  Link2,
  Plug,
  RefreshCw,
  Settings,
  ShieldCheck,
  Webhook,
  X,
  Zap,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

type Category = "all" | "data" | "accounting" | "bms" | "reporting" | "sustainability";
type IntgStatus = "connected" | "configured" | "available" | "coming-soon";
type AuthType = "oauth" | "api-key" | "webhook";

type Integration = {
  id: string;
  name: string;
  category: Exclude<Category, "all">;
  tagline: string;
  description: string;
  authType: AuthType;
  dataFields: string[];
  setupSteps: string[];
  pricingTier: "included" | "paid" | "coming-soon";
  status: IntgStatus;
  lastSync?: string;
  health?: "good" | "warn" | "error";
};

type Programme = {
  id: string;
  name: string;
  body: string;
  region: string;
  status: "enrolled" | "pending" | "available";
};

/* ------------------------------------------------------------------ */
/* Constants                                                            */
/* ------------------------------------------------------------------ */

const INTEGRATIONS: Integration[] = [
  {
    id: "i1", name: "QuickBooks Online", category: "accounting",
    tagline: "Sync procurement spend for Scope 3 Cat 1 & Cat 2 automatically.",
    description: "Hotel Optimizer connects to QuickBooks Online via OAuth 2.0, pulling invoice line items nightly. Spend is mapped to emission categories using your configured cost-centre taxonomy, enabling automated Scope 3 Cat 1 & Cat 2 calculations without manual CSV exports.",
    authType: "oauth", pricingTier: "included", status: "connected", lastSync: "Today 02:14", health: "good",
    dataFields: ["Invoice line items", "Vendor classification", "Cost centres", "Currency"],
    setupSteps: ["Connect via OAuth", "Map cost centres to emission categories", "Set nightly sync schedule", "Review first import"],
  },
  {
    id: "i2", name: "Xero", category: "accounting",
    tagline: "Pull purchase invoices for automated scope 3 calculations.",
    description: "Pull purchase invoices from Xero directly into Hotel Optimizer. Supplier spend is automatically classified against Scope 3 categories using the GHG Protocol purchase-based method.",
    authType: "oauth", pricingTier: "included", status: "available",
    dataFields: ["Purchase invoices", "Supplier names", "Account codes"],
    setupSteps: ["Authorise via Xero OAuth", "Map account codes", "Enable auto-import"],
  },
  {
    id: "i3", name: "Workday Financials", category: "accounting",
    tagline: "Enterprise ERP integration via API key.",
    description: "Connect Workday Financials to pull purchase orders and cost allocation data for Scope 3 calculation. Supports multi-entity hotel groups with subsidiary mapping.",
    authType: "api-key", pricingTier: "paid", status: "available",
    dataFields: ["Purchase orders", "Cost allocation", "Vendor master"],
    setupSteps: ["Generate API key in Workday", "Configure field mapping", "Set sync frequency"],
  },
  {
    id: "i4", name: "Opera Cloud (PMS)", category: "data",
    tagline: "Inject per-stay carbon footprint into booking confirmations.",
    description: "Bi-directional integration with Opera Cloud: Hotel Optimizer reads occupancy, room type, and length-of-stay data to calculate per-stay HCMI carbon footprints, then injects the result back into the booking confirmation email template.",
    authType: "api-key", pricingTier: "included", status: "connected", lastSync: "Today 06:00", health: "good",
    dataFields: ["Occupancy", "Room type", "Length of stay", "Guest count"],
    setupSteps: ["Generate Opera Cloud API key", "Configure webhook endpoint", "Map room types to intensity bands", "Enable footprint injection"],
  },
  {
    id: "i5", name: "Siemens Desigo BMS", category: "bms",
    tagline: "Real-time energy and HVAC data from building management systems.",
    description: "Connect to Siemens Desigo via BACnet/IP or REST adapter. Energy meter readings, chiller performance, and HVAC runtimes flow directly into Hotel Optimizer — eliminating manual meter reads and enabling sub-hourly granularity for energy intensity calculations.",
    authType: "api-key", pricingTier: "paid", status: "connected", lastSync: "1 min ago", health: "warn",
    dataFields: ["Energy meter readings", "HVAC runtime", "Chiller COP", "Zone temperatures"],
    setupSteps: ["Install BACnet/IP adapter", "Whitelist Hotel Optimizer IP", "Configure meter mapping", "Validate first 24h data"],
  },
  {
    id: "i6", name: "Schneider EcoStruxure", category: "bms",
    tagline: "Sub-hourly energy metering for precise intensity reporting.",
    description: "Pull metering data from Schneider EcoStruxure at 15-minute intervals. Data is validated against expected ranges and anomalies are flagged automatically in the Review & Approval queue.",
    authType: "webhook", pricingTier: "paid", status: "available",
    dataFields: ["kWh readings", "Demand peaks", "Power factor"],
    setupSteps: ["Configure EcoStruxure webhook", "Set payload format", "Add to Hotel Optimizer receiver"],
  },
  {
    id: "i7", name: "Cvent CSN", category: "reporting",
    tagline: "Publish verified sustainability data to the Cvent Supplier Network.",
    description: "Automatically push approved sustainability metrics to your Cvent CSN supplier profile. Buyers searching on Cvent see your verified Hotel Optimizer data — no manual data entry, always up to date.",
    authType: "api-key", pricingTier: "included", status: "connected", lastSync: "Today 00:05", health: "good",
    dataFields: ["Energy intensity", "Water intensity", "Carbon per stay", "Certifications"],
    setupSteps: ["Add Cvent API key", "Map metric fields", "Enable scheduled push"],
  },
  {
    id: "i8", name: "Power BI", category: "reporting",
    tagline: "Live dashboard feed via OData endpoint.",
    description: "Connect Power BI to the Hotel Optimizer OData endpoint for live sustainability dashboards. Supports DirectQuery for real-time reporting or scheduled import for large property portfolios.",
    authType: "api-key", pricingTier: "included", status: "configured", lastSync: "2 days ago", health: "good",
    dataFields: ["All performance metrics", "Property metadata", "Trend series"],
    setupSteps: ["Copy OData URL", "Add API key in Power BI", "Build your reports"],
  },
  {
    id: "i9", name: "Booking.com Sustainability Badge", category: "reporting",
    tagline: "Sync certification status for the Booking.com sustainability badge.",
    description: "Keep your Booking.com sustainability badge in sync automatically. Hotel Optimizer pushes certification status and key metrics after each approval cycle — no manual updates required.",
    authType: "webhook", pricingTier: "included", status: "configured",
    dataFields: ["Certification status", "Key metrics", "Badge tier"],
    setupSteps: ["Register webhook in Booking.com Extranet", "Add secret to Hotel Optimizer", "Test delivery"],
  },
  {
    id: "i10", name: "HRS GreenStay", category: "sustainability",
    tagline: "Qualify for HRS corporate buyer sustainability programme.",
    description: "Connect Hotel Optimizer to the HRS GreenStay programme to expose verified sustainability data to HRS's corporate buyer network. Properties that meet programme thresholds receive the GreenStay badge.",
    authType: "api-key", pricingTier: "paid", status: "available",
    dataFields: ["Energy intensity", "Carbon per stay", "Waste diversion"],
    setupSteps: ["Apply to HRS GreenStay", "Add programme API key", "Submit for validation"],
  },
  {
    id: "i11", name: "Salesforce Net Zero Cloud", category: "reporting",
    tagline: "Coming soon — push scope 3 data into Salesforce NZC.",
    description: "Planned integration to push Hotel Optimizer scope 1, 2, and 3 data directly into Salesforce Net Zero Cloud for enterprise-wide carbon accounting.",
    authType: "oauth", pricingTier: "coming-soon", status: "coming-soon",
    dataFields: ["Scope 1/2/3 totals", "Property breakdown"],
    setupSteps: [],
  },
  {
    id: "i12", name: "SAP S/4HANA", category: "accounting",
    tagline: "Coming soon — enterprise ERP procurement data sync.",
    description: "Planned SAP S/4HANA connector for large enterprise hotel groups needing procurement-to-emission automation at scale.",
    authType: "api-key", pricingTier: "coming-soon", status: "coming-soon",
    dataFields: [],
    setupSteps: [],
  },
];

const PROGRAMMES: Programme[] = [
  { id: "p1", name: "GSTC Industry Criteria",    body: "Global Sustainable Tourism Council",  region: "Global",     status: "enrolled"   },
  { id: "p2", name: "Green Globe Certification",  body: "Green Globe International",           region: "Global",     status: "enrolled"   },
  { id: "p3", name: "EarthCheck",                 body: "EarthCheck Pty Ltd",                  region: "APAC · EMEA",status: "pending"    },
  { id: "p4", name: "Cvent Supplier Network",     body: "Cvent Inc.",                          region: "Americas · EMEA", status: "enrolled" },
  { id: "p5", name: "HRS GreenStay",              body: "HRS Group",                           region: "EMEA",       status: "available"  },
];

const CATEGORY_LABELS: Record<Category, string> = {
  all: "All", data: "Data connectors", accounting: "Accounting",
  bms: "BMS / IoT", reporting: "Reporting", sustainability: "Sustainability",
};

const STATUS_TONE: Record<IntgStatus, "good" | "info" | "neutral" | "warn"> = {
  connected: "good", configured: "info", available: "neutral", "coming-soon": "warn",
};
const STATUS_LABEL: Record<IntgStatus, string> = {
  connected: "Connected", configured: "Configured", available: "Available", "coming-soon": "Coming soon",
};

const AUTH_ICON: Record<AuthType, React.ReactNode> = {
  oauth:    <Globe size={11} />,
  "api-key": <Key size={11} />,
  webhook:  <Webhook size={11} />,
};
const AUTH_LABEL: Record<AuthType, string> = { oauth: "OAuth 2.0", "api-key": "API key", webhook: "Webhook" };

const PROG_TONE: Record<Programme["status"], "good" | "warn" | "neutral"> = { enrolled: "good", pending: "warn", available: "neutral" };
const PROG_LABEL: Record<Programme["status"], string> = { enrolled: "Enrolled", pending: "Pending", available: "Available" };

const HEALTH_ICON: Record<NonNullable<Integration["health"]>, React.ReactNode> = {
  good:  <Activity size={12} className="text-good" />,
  warn:  <AlertTriangle size={12} className="text-warn" />,
  error: <AlertTriangle size={12} className="text-bad" />,
};

/* ================================================================== */
/* Page                                                                 */
/* ================================================================== */

export default function Marketplace() {
  const [category, setCategory]   = useState<Category>("all");
  const [drawerId, setDrawerId]   = useState<string | null>(null);

  const connected = INTEGRATIONS.filter((i) => i.status === "connected" || i.status === "configured");
  const filtered  = INTEGRATIONS.filter((i) =>
    (category === "all" || i.category === category) && i.status !== "connected" && i.status !== "configured"
  );

  const drawerIntg = drawerId ? INTEGRATIONS.find((i) => i.id === drawerId) ?? null : null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Integrations & programmes · FR-18"
        title="Marketplace"
        subtitle="Connect data sources, accounting systems, BMS/IoT sensors, reporting destinations, and sustainability programmes."
      />

      {/* My integrations */}
      {connected.length > 0 && (
        <Card>
          <CardHeader title="My integrations" hint="Active connections — live health status" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-5">
            {connected.map((i) => (
              <div key={i.id} className="rounded-xl border border-ink-200 p-4 flex items-start gap-3 hover:bg-ink-50/40">
                <div className="w-9 h-9 rounded-lg bg-brand-50 grid place-items-center text-brand-700 shrink-0">
                  <Plug size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-[13px] text-ink-900 truncate">{i.name}</div>
                    <Badge tone={STATUS_TONE[i.status]}>{STATUS_LABEL[i.status]}</Badge>
                  </div>
                  {i.lastSync && (
                    <div className="text-[11px] text-ink-500 mt-0.5 flex items-center gap-1.5">
                      {i.health && HEALTH_ICON[i.health]}
                      <Clock size={9} /> Last sync: {i.lastSync}
                    </div>
                  )}
                </div>
                <button
                  className="btn-ghost h-7 px-2 text-[12px] text-ink-700 shrink-0"
                  onClick={() => setDrawerId(i.id)}
                >
                  <Settings size={11} /> Manage
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Category filters */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn("tab capitalize text-[12px]", category === c && "tab-active")}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {/* Integration grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((i) => (
          <IntegrationCard key={i.id} intg={i} onOpen={() => setDrawerId(i.id)} />
        ))}
      </div>

      {/* Sustainability programmes */}
      <Card>
        <CardHeader title="Sustainability programmes" hint="Certifications · buyer networks · verified data feeds" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-5">
          {PROGRAMMES.map((p) => (
            <div key={p.id} className="rounded-xl border border-ink-200 p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-50 grid place-items-center text-brand-700 shrink-0">
                <Award size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="font-semibold text-[13px] text-ink-900 truncate">{p.name}</div>
                  <Badge tone={PROG_TONE[p.status]}>{PROG_LABEL[p.status]}</Badge>
                </div>
                <div className="text-[11px] text-ink-500">{p.body}</div>
                <div className="text-[10px] text-ink-400 mt-0.5 flex items-center gap-1">
                  <Globe size={9} /> {p.region}
                </div>
              </div>
              <button className="btn-ghost h-7 px-2 text-[12px] text-brand-700 shrink-0">
                {p.status === "enrolled" ? <><Settings size={11} /> Manage</> : <><ArrowRight size={11} /> Enrol</>}
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Detail drawer */}
      {drawerIntg && (
        <IntegrationDrawer intg={drawerIntg} onClose={() => setDrawerId(null)} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Integration card                                                     */
/* ------------------------------------------------------------------ */

function IntegrationCard({ intg, onOpen }: { intg: Integration; onOpen: () => void }) {
  const isComing = intg.status === "coming-soon";
  return (
    <div className={cn("rounded-xl border border-ink-200 p-4 flex flex-col gap-3", isComing && "opacity-60")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-ink-100 grid place-items-center text-ink-500 shrink-0">
            <Plug size={16} />
          </div>
          <div>
            <div className="font-semibold text-[13px] text-ink-900">{intg.name}</div>
            <div className="text-[10px] text-ink-400 capitalize">{CATEGORY_LABELS[intg.category]}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge tone={STATUS_TONE[intg.status]}>{STATUS_LABEL[intg.status]}</Badge>
          <Badge tone={intg.pricingTier === "included" ? "good" : intg.pricingTier === "paid" ? "info" : "neutral"} className="text-[10px]">
            {intg.pricingTier === "included" ? "Included" : intg.pricingTier === "paid" ? "Paid add-on" : "Coming soon"}
          </Badge>
        </div>
      </div>
      <p className="text-[12px] text-ink-600 leading-snug flex-1">{intg.tagline}</p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-ink-400 inline-flex items-center gap-1">
          {AUTH_ICON[intg.authType]} {AUTH_LABEL[intg.authType]}
        </span>
        {!isComing && (
          <button className="btn-primary h-7 px-3 text-[12px]" onClick={onOpen}>
            {intg.status === "available" ? <><Zap size={11} /> Connect</> : <><Settings size={11} /> Configure</>}
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Detail drawer                                                        */
/* ------------------------------------------------------------------ */

function IntegrationDrawer({ intg, onClose }: { intg: Integration; onClose: () => void }) {
  const [stepsOpen, setStepsOpen] = useState(true);

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-ink-900/30 backdrop-blur-[2px]" />
      <div
        className="relative h-full w-full max-w-md bg-white shadow-2xl flex flex-col border-l border-ink-200 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-ink-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 grid place-items-center text-brand-700 shrink-0">
              <Plug size={18} />
            </div>
            <div>
              <div className="font-bold text-ink-900">{intg.name}</div>
              <div className="text-[11px] text-ink-500 flex items-center gap-2 mt-0.5">
                <Badge tone={STATUS_TONE[intg.status]}>{STATUS_LABEL[intg.status]}</Badge>
                <span className="inline-flex items-center gap-1">{AUTH_ICON[intg.authType]} {AUTH_LABEL[intg.authType]}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-md hover:bg-ink-100 shrink-0">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-5 space-y-5">
          {/* Status row */}
          {intg.lastSync && (
            <div className="flex items-center gap-3 rounded-xl border border-ink-200 px-4 py-3">
              {intg.health && HEALTH_ICON[intg.health]}
              <div className="flex-1 text-[12px] text-ink-700">
                <span className="font-medium">Last sync:</span> {intg.lastSync}
              </div>
              <button className="btn-ghost h-7 px-2 text-[12px] text-brand-700"><RefreshCw size={11} /> Sync now</button>
            </div>
          )}

          {/* Description */}
          <div>
            <div className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide mb-1.5">About</div>
            <p className="text-[13px] text-ink-700 leading-relaxed">{intg.description}</p>
          </div>

          {/* Data fields synced */}
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

          {/* Setup steps */}
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

          {/* Pricing */}
          <div className="rounded-xl border border-ink-200 p-4">
            <div className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide mb-1">Pricing</div>
            <div className="text-[13px] text-ink-800 font-medium">
              {intg.pricingTier === "included" ? "Included in your current plan" :
               intg.pricingTier === "paid"     ? "Paid add-on — contact your account manager" :
                                                  "Coming soon — join the waitlist"}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-ink-200 flex gap-2">
          {intg.status === "connected" && (
            <button className="btn-secondary flex-1"><Settings size={14} /> Edit settings</button>
          )}
          {intg.status === "configured" && (
            <button className="btn-primary flex-1"><CheckCircle2 size={14} /> Activate</button>
          )}
          {intg.status === "available" && intg.pricingTier !== "coming-soon" && (
            <button className="btn-primary flex-1"><Zap size={14} /> Connect now</button>
          )}
          <button className="btn-ghost" onClick={onClose}>
            <ExternalLink size={13} /> Docs
          </button>
        </div>
      </div>
    </div>
  );
}
