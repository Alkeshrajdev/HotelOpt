import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Award,
  CheckCircle2,
  Clock,
  Droplet,
  Eye,
  EyeOff,
  ExternalLink,
  Globe,
  GripVertical,
  Languages,
  Leaf,
  Lock,
  LogIn,
  LogOut,
  Mail,
  MessageSquare,
  Plus,
  PowerOff,
  QrCode,
  Recycle,
  Send,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Sun,
  Trash2,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Tabs from "@/components/ui/Tabs";
import StatusPipeline from "@/components/shared/StatusPipeline";
import { PORTFOLIO_HOTELS } from "@/lib/mock";
import { cn } from "@/lib/utils";

const PROPERTY_NAMES = PORTFOLIO_HOTELS.map((h) => h.name);
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

type Tab = "overview" | "public" | "campaigns" | "surveys" | "ecopoints";

type PublishStatus = "draft" | "pending" | "live" | "disabled";
const STATUS_LABEL: Record<PublishStatus, string> = { draft: "Draft", pending: "Pending approval", live: "Live", disabled: "Disabled" };
const STATUS_TONE:  Record<PublishStatus, "neutral" | "warn" | "good" | "bad"> = { draft: "neutral", pending: "warn", live: "good", disabled: "bad" };

type PublicMetric = { name: string; value: string; delta?: number; source: string; lastApproved: string; isPublic: boolean; brdSafe: boolean };

type CampaignStatus = "active" | "draft" | "completed";
type Channel        = "email" | "qr" | "push";

type Campaign = {
  id: string;
  name: string;
  channel: Channel;
  property: string;
  reach: number;
  openRate: number;
  status: CampaignStatus;
  scheduled: string;
};

type QuestionType = "rating" | "yesno" | "text";
type SurveyQuestion = { id: string; type: QuestionType; text: string };

type Verbatim = { text: string; sentiment: "positive" | "neutral" | "negative" };

type EcoAction = { id: string; label: string; points: number };
type PointsEntry = { guest: string; action: string; points: number; date: string; redeemed: boolean };

/* ------------------------------------------------------------------ */
/* Constants                                                            */
/* ------------------------------------------------------------------ */

const METRIC_REGISTRY: PublicMetric[] = [
  { name: "Energy use per stay",   value: "12.4 kWh",     delta: -8,  source: "Energy data", lastApproved: "2026-04-29", isPublic: true,  brdSafe: true },
  { name: "Water per stay",        value: "184 L",          delta: -5,  source: "Water data",  lastApproved: "2026-04-28", isPublic: true,  brdSafe: true },
  { name: "Waste per stay",        value: "0.42 kg",        delta: -12, source: "Waste data",  lastApproved: "2026-04-26", isPublic: true,  brdSafe: true },
  { name: "Carbon per stay",       value: "8.2 kgCO₂e",    delta: -9,  source: "HCMI v1.2",  lastApproved: "2026-04-25", isPublic: true,  brdSafe: true },
  { name: "Renewable share",       value: "12%",            delta: 3,   source: "Energy data", lastApproved: "2026-04-29", isPublic: false, brdSafe: true },
  { name: "Diversion (excl/incl WtE)", value: "42% / 54%",  delta: 5,   source: "Waste data",  lastApproved: "2026-04-26", isPublic: false, brdSafe: true },
  { name: "Total Scope 3",         value: "24,853 tCO₂e",   delta: -2,  source: "Supplier data", lastApproved: "2026-04-12", isPublic: false, brdSafe: false },
  { name: "Supplier EFs",          value: "54 active",      delta: 12,  source: "Supplier portal", lastApproved: "2026-04-22", isPublic: false, brdSafe: false },
];

const CAMPAIGNS: Campaign[] = [
  { id: "c1", name: "Spring Eco Stay 2026",         channel: "email", property: "Skyline Dubai",   reach: 3840, openRate: 48, status: "active",    scheduled: "2026-04-01" },
  { id: "c2", name: "Towel Reuse Drive — May",       channel: "qr",    property: "Peaks Resort Zermatt",     reach: 620,  openRate: 61, status: "active",    scheduled: "2026-05-01" },
  { id: "c3", name: "EV Charging Awareness",         channel: "push",  property: "Marina Residences Barcelona",  reach: 1240, openRate: 33, status: "draft",     scheduled: "2026-06-01" },
  { id: "c4", name: "Earth Day Challenge",           channel: "email", property: "All properties",     reach: 9200, openRate: 52, status: "completed", scheduled: "2026-04-22" },
  { id: "c5", name: "Plant-Based Menu Spotlight",   channel: "push",  property: "The Pavilion London",  reach: 880,  openRate: 29, status: "draft",     scheduled: "2026-05-15" },
];

const CHANNEL_ICON: Record<Channel, React.ReactNode> = {
  email: <Mail size={12} />,
  qr:    <QrCode size={12} />,
  push:  <Smartphone size={12} />,
};
const CHANNEL_LABEL: Record<Channel, string> = { email: "Email", qr: "In-room QR", push: "App push" };

const INITIAL_QUESTIONS: SurveyQuestion[] = [
  { id: "q1", type: "rating", text: "How would you rate your overall sustainability experience?" },
  { id: "q2", type: "yesno",  text: "Did you participate in our linen-reuse programme?" },
  { id: "q3", type: "text",   text: "Any suggestions for how we can improve our eco-initiatives?" },
];

const VERBATIMS: Verbatim[] = [
  { text: "The renewable energy commitment is genuinely impressive — well communicated at check-in.", sentiment: "positive" },
  { text: "Towel reuse incentive is a nice touch. Would love an in-app tracker.", sentiment: "positive" },
  { text: "QR code in the room didn't work on my phone initially.", sentiment: "negative" },
  { text: "Good overall, though more plant-based breakfast options would be great.", sentiment: "neutral" },
  { text: "Carbon footprint summary in the checkout email was a pleasant surprise.", sentiment: "positive" },
];

const RATING_DIST = [12, 8, 15, 24, 41]; // 1–5 star distribution %

const ECO_ACTIONS: EcoAction[] = [
  { id: "ea1", label: "Towel reuse (3+ nights)",         points: 50 },
  { id: "ea2", label: "Opt-out housekeeping",             points: 30 },
  { id: "ea3", label: "EV charging used",                 points: 40 },
  { id: "ea4", label: "Plant-based meal ordered",         points: 20 },
  { id: "ea5", label: "Sustainability survey completed",  points: 25 },
];

const POINTS_LEDGER: PointsEntry[] = [
  { guest: "Guest #G-1821", action: "Towel reuse (3+ nights)",        points: 50, date: "2026-04-28", redeemed: false },
  { guest: "Guest #G-0944", action: "Opt-out housekeeping",            points: 30, date: "2026-04-27", redeemed: true  },
  { guest: "Guest #G-2203", action: "EV charging used",                points: 40, date: "2026-04-27", redeemed: false },
  { guest: "Guest #G-1550", action: "Plant-based meal ordered",        points: 20, date: "2026-04-26", redeemed: false },
  { guest: "Guest #G-0715", action: "Sustainability survey completed", points: 25, date: "2026-04-25", redeemed: true  },
  { guest: "Guest #G-3301", action: "Towel reuse (3+ nights)",        points: 50, date: "2026-04-24", redeemed: false },
];

const NPS_SCORE = 42;

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function GuestEngagement() {
  const [tab, setTab] = useState<Tab>("overview");
  const [property, setProperty] = useState(PROPERTY_NAMES[0] ?? "Skyline Dubai");

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Guest experience"
        title="Guest Engagement"
        actions={
          <>
            {/* Property selector — scopes the page to one hotel */}
            <select
              className="h-9 px-3 rounded-lg border border-ink-200 bg-white text-[13px] font-medium text-ink-900 max-w-[200px]"
              value={property}
              onChange={(e) => setProperty(e.target.value)}
              aria-label="Property"
            >
              {PROPERTY_NAMES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <button className="btn-secondary"><QrCode size={14} /> Print lobby QR</button>
            <button className="btn-primary" onClick={() => setTab("public")}><ExternalLink size={14} /> Open public page</button>
          </>
        }
      />

      <Tabs
        ariaLabel="Guest engagement sections"
        items={[
          { key: "overview", label: "Overview" },
          { key: "public", label: "Public page" },
          { key: "campaigns", label: "Campaigns" },
          { key: "surveys", label: "Surveys & Feedback" },
          { key: "ecopoints", label: "Eco-points" },
        ]}
        value={tab}
        onChange={(k) => setTab(k as Tab)}
      />

      {tab === "overview"  && <OverviewTab property={property} onJump={setTab} />}
      {tab === "public"    && <PublicPageTab property={property} />}
      {tab === "campaigns" && <CampaignsTab property={property} />}
      {tab === "surveys"   && <SurveysTab property={property} />}
      {tab === "ecopoints" && <EcoPointsTab />}
    </div>
  );
}

/* ================================================================== */
/* Tab 1 — Public page (existing content)                              */
/* ================================================================== */

function PublicPageTab({ property }: { property: string }) {
  const [status, setStatus]   = useState<PublishStatus>("live");
  const [metrics, setMetrics] = useState<PublicMetric[]>(METRIC_REGISTRY);
  const [language, setLanguage] = useState("en");
  const region = PORTFOLIO_HOTELS.find((h) => h.name === property)?.region ?? "";
  const domain = `${slug(property)}.hotel-optimizer.com`;

  function toggleMetric(name: string) {
    setMetrics((ms) => ms.map((m) => m.name === name && m.brdSafe ? { ...m, isPublic: !m.isPublic } : m));
  }

  return (
    <div className="space-y-4">
      <Card className="card-pad">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-500 mb-1">Publishing status</div>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
              <span className="text-sm text-ink-700">{property} · {domain}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {status === "draft"    && <button className="btn-primary" onClick={() => setStatus("pending")}><Send size={14} /> Submit for approval</button>}
            {status === "pending"  && <><button className="btn bg-bad text-white hover:bg-red-700" onClick={() => setStatus("draft")}>Reject</button><button className="btn-primary" onClick={() => setStatus("live")}><CheckCircle2 size={14} /> Approve &amp; publish</button></>}
            {status === "live"     && <button className="btn bg-bad text-white hover:bg-red-700" onClick={() => setStatus("disabled")}><PowerOff size={14} /> Disable</button>}
            {status === "disabled" && <button className="btn-primary" onClick={() => setStatus("pending")}>Re-publish</button>}
          </div>
        </div>
        <div className="mt-4">
          <StatusPipeline
            steps={[{ key: "draft", label: "Draft" }, { key: "pending", label: "Pending approval" }, { key: "live", label: "Live" }, { key: "disabled", label: "Disabled" }]}
            active={status === "draft" ? 0 : status === "pending" ? 1 : status === "live" ? 2 : 3}
            size="sm"
          />
        </div>
      </Card>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-7">
          <CardHeader title={`Public sustainability page — ${property}`} hint="Branded · verified · provenance-signed"
            right={
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-ink-500 inline-flex items-center gap-1"><Languages size={12} /> Language</span>
                <select className="h-8 px-2 rounded-md border border-ink-200 text-[12px] font-medium" value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="en">English</option><option value="fr">Français</option><option value="es">Español</option><option value="de">Deutsch</option>
                </select>
              </div>
            }
          />
          <div className="p-6">
            <div className="rounded-2xl border border-ink-200 overflow-hidden">
              <div className="h-40 bg-gradient-to-br from-brand-700 to-brand-500 text-white p-6 flex flex-col justify-end">
                <div className="text-[12px] uppercase tracking-wide opacity-90">{property}{region ? ` · ${region}` : ""}</div>
                <div className="text-2xl font-extrabold">A more sustainable stay</div>
                <div className="text-sm opacity-90">All metrics independently verified through Hotel Optimizer.</div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
                {metrics.filter((m) => m.isPublic).slice(0, 4).map((m) => (
                  <div key={m.name} className="rounded-xl border border-ink-200 p-3">
                    <div className="text-[11px] text-ink-500">{m.name}</div>
                    <div className="text-xl font-bold text-ink-900 mt-0.5">{m.value}</div>
                    {m.delta != null && <div className={cn("text-[11px] font-semibold mt-0.5", m.delta < 0 ? "text-good" : "text-bad")}>{m.delta < 0 ? "" : "+"}{m.delta}% vs last year</div>}
                  </div>
                ))}
              </div>
              <div className="px-4 pb-3 flex flex-wrap gap-2">
                <Badge tone="brand">Green Globe certified</Badge>
                <Badge tone="brand">GSTC criteria 78%</Badge>
              </div>
              <div className="px-4 pb-3 text-[11px] text-ink-500 inline-flex items-center gap-1">
                <Lock size={11} /> Provenance signed · last refreshed 2026-04-29
              </div>
            </div>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-5">
          <CardHeader title="Public-safe metrics" hint="Property SM controls show/hide per metric." />
          <ul className="p-4 space-y-2 text-sm">
            {metrics.map((m) => (
              <li key={m.name} className={cn("rounded-xl border p-3", m.brdSafe ? "border-ink-200" : "border-ink-200 bg-ink-50/50 opacity-80")}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium text-ink-900 text-[12px]">{m.name}</div>
                    <div className="text-[10px] text-ink-500 inline-flex items-center gap-1.5 mt-0.5">
                      <ShieldCheck size={9} className="text-good" />{m.source} · <Clock size={9} /> {m.lastApproved}
                    </div>
                  </div>
                  {m.brdSafe ? (
                    <button onClick={() => toggleMetric(m.name)} className={cn("btn h-7 px-2 text-[11px] shrink-0", m.isPublic ? "bg-good text-white" : "bg-ink-100 text-ink-700 hover:bg-ink-200")}>
                      {m.isPublic ? <><Eye size={10} /> Public</> : <><EyeOff size={10} /> Hidden</>}
                    </button>
                  ) : <Badge tone="bad"><Lock size={10} /> Internal only</Badge>}
                </div>
              </li>
            ))}
          </ul>
          <div className="px-4 pb-4"><button className="btn-secondary w-full"><Share2 size={14} /> Share preview link</button></div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Per-stay carbon footprint preview" hint="HCMI-aligned · booking confirmation" right={<Badge tone="info"><Globe size={11} /> PMS-driven</Badge>} />
        <div className="grid grid-cols-3 gap-4 p-5">
          {[["Standard room · 2 nights","14.6 kgCO₂e"],["Pool villa · 3 nights","38.4 kgCO₂e"],["Suite · 5 nights","62.1 kgCO₂e"]].map(([l,v]) => (
            <div key={l} className="rounded-xl border border-ink-200 p-4 bg-gradient-to-br from-brand-50 to-white">
              <div className="text-[11px] text-ink-500">{l}</div>
              <div className="text-2xl font-extrabold text-brand-800 mt-1">{v}</div>
            </div>
          ))}
        </div>
      </Card>

      <RenewableClaimsPanel />
    </div>
  );
}

/* ================================================================== */
/* Renewable Energy & Carbon claims panel                              */
/* ================================================================== */

type ClaimStep = "certificate" | "wording" | "visibility";
type ClaimStatus = "awaiting-wording" | "awaiting-visibility" | "live" | "rejected";

type RenewableClaim = {
  id: string;
  certType: "I-REC" | "EAC" | "VCS";
  period: string;
  claimWording: string;
  status: ClaimStatus;
};

const INITIAL_CLAIMS: RenewableClaim[] = [
  {
    id: "rc1",
    certType: "I-REC",
    period: "Jan–Dec 2025",
    claimWording: "Powered by 100% renewable electricity (I-REC certified, serial I-REC-AP-2025-001–012)",
    status: "awaiting-visibility",
  },
  {
    id: "rc2",
    certType: "EAC",
    period: "Q1 2026",
    claimWording: "Renewable electricity from European grid (EAC verified, Q1 2026)",
    status: "awaiting-wording",
  },
  {
    id: "rc3",
    certType: "VCS",
    period: "FY 2025",
    claimWording: "Residual Scope 1 emissions fully offset with Gold Standard certified credits",
    status: "live",
  },
];

const CLAIM_STEPS: { key: ClaimStep; label: string }[] = [
  { key: "certificate", label: "Certificate issued" },
  { key: "wording",     label: "Claim wording approved" },
  { key: "visibility",  label: "Public visibility approved" },
];

const CLAIM_STATUS_ACTIVE: Record<ClaimStatus, number> = {
  "awaiting-wording":     0,
  "awaiting-visibility":  1,
  "live":                 2,
  "rejected":             0,
};

const CLAIM_STATUS_TONE: Record<ClaimStatus, "good" | "warn" | "info" | "bad"> = {
  "awaiting-wording":    "warn",
  "awaiting-visibility": "warn",
  "live":                "good",
  "rejected":            "bad",
};
const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  "awaiting-wording":    "Awaiting wording approval",
  "awaiting-visibility": "Awaiting visibility approval",
  "live":                "Live on public page",
  "rejected":            "Rejected",
};

function RenewableClaimsPanel() {
  const [claims, setClaims] = useState<RenewableClaim[]>(INITIAL_CLAIMS);

  function approve(id: string) {
    setClaims((cs) => cs.map((c) => {
      if (c.id !== id) return c;
      if (c.status === "awaiting-wording") return { ...c, status: "awaiting-visibility" };
      if (c.status === "awaiting-visibility") return { ...c, status: "live" };
      return c;
    }));
  }

  function reject(id: string) {
    setClaims((cs) => cs.map((c) => c.id === id ? { ...c, status: "rejected" } : c));
  }

  const liveCount = claims.filter((c) => c.status === "live").length;
  const pendingCount = claims.filter((c) => c.status.startsWith("awaiting")).length;

  return (
    <Card>
      <CardHeader
        title="Renewable Energy & Carbon claims"
        hint="Claims only appear on the public page and in campaign materials after all three approvals are complete."
        right={
          <Link to="/marketplace" className="btn-ghost h-7 px-2 text-[11px] text-brand-700 flex items-center gap-1">
            Manage certificates <ExternalLink size={11} />
          </Link>
        }
      />
      <div className="grid grid-cols-3 gap-px bg-ink-100 border-t border-ink-100">
        <div className="bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Sun size={14} className="text-warn" />
            <span className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide">Total claims</span>
          </div>
          <div className="text-2xl font-bold text-ink-900">{claims.length}</div>
        </div>
        <div className="bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={14} className="text-good" />
            <span className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide">Live on public page</span>
          </div>
          <div className="text-2xl font-bold text-good">{liveCount}</div>
        </div>
        <div className="bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className="text-warn" />
            <span className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide">Awaiting approval</span>
          </div>
          <div className="text-2xl font-bold text-warn">{pendingCount}</div>
        </div>
      </div>
      <div className="p-4 space-y-4">
        {claims.map((claim) => (
          <div
            key={claim.id}
            className={cn(
              "rounded-xl border p-4 space-y-3",
              claim.status === "live" ? "border-good/30 bg-good/5"
              : claim.status === "rejected" ? "border-bad/30 bg-bad/5"
              : "border-warn/30 bg-warn/5"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-9 h-9 rounded-lg grid place-items-center shrink-0",
                claim.certType === "I-REC" || claim.certType === "EAC" ? "bg-warn/10 text-warn" : "bg-good/10 text-good"
              )}>
                {claim.certType === "VCS" ? <Leaf size={16} /> : <Sun size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge tone={claim.certType === "I-REC" || claim.certType === "EAC" ? "warn" : "good"}>{claim.certType}</Badge>
                  <Badge tone={CLAIM_STATUS_TONE[claim.status]}>{CLAIM_STATUS_LABEL[claim.status]}</Badge>
                  <span className="text-[11px] text-ink-500">{claim.period}</span>
                </div>
                <div className="text-sm font-medium text-ink-900 italic">"{claim.claimWording}"</div>
              </div>
            </div>

            <StatusPipeline
              steps={CLAIM_STEPS}
              active={CLAIM_STATUS_ACTIVE[claim.status]}
              size="sm"
            />

            {claim.status.startsWith("awaiting") && (
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 text-[11px] text-ink-600 bg-white rounded-lg border border-ink-200 px-3 py-2">
                  {claim.status === "awaiting-wording"
                    ? "Sustainability Manager — please review and approve the claim wording above before it can be set live."
                    : "Sustainability Manager — please approve public visibility. Once approved, this claim will appear on the guest page and in campaign templates."}
                </div>
                <button
                  className="btn bg-bad text-white hover:bg-red-700 h-8 px-3 text-[12px] shrink-0"
                  onClick={() => reject(claim.id)}
                >
                  Reject
                </button>
                <button
                  className="btn-primary h-8 px-3 text-[12px] shrink-0"
                  onClick={() => approve(claim.id)}
                >
                  <CheckCircle2 size={13} />
                  {claim.status === "awaiting-wording" ? "Approve wording" : "Approve & publish"}
                </button>
              </div>
            )}
            {claim.status === "live" && (
              <div className="flex items-center gap-1.5 text-[12px] text-good">
                <CheckCircle2 size={13} /> All three approvals complete — visible on public page and available in campaign templates.
              </div>
            )}
            {claim.status === "rejected" && (
              <div className="flex items-center gap-1.5 text-[12px] text-bad">
                <AlertTriangle size={13} /> Claim rejected — revise wording in Solutions Hub and resubmit.
                <Link to="/marketplace" className="ml-1 underline font-semibold">Solutions Hub</Link>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="px-5 pb-4 border-t border-ink-100 pt-3 text-[11px] text-ink-500 flex items-start gap-1.5">
        <Lock size={11} className="mt-0.5 shrink-0 text-brand-700" />
        Claims never appear publicly until: (1) the underlying certificate is active in Solutions Hub, (2) the claim wording is approved by a Sustainability Manager, and (3) public visibility is explicitly approved. All approvals are logged in the audit trail.
      </div>
    </Card>
  );
}

/* ================================================================== */
/* Tab 2 — Campaigns                                                   */
/* ================================================================== */

type CampaignForm = { name: string; channel: Channel; property: string; template: string; scheduled: string };
const CAMPAIGN_INITIAL: CampaignForm = { name: "", channel: "email", property: "Skyline Dubai", template: "eco-stay", scheduled: "" };

function CampaignsTab({ property }: { property: string }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(CAMPAIGNS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState<CampaignForm>({ ...CAMPAIGN_INITIAL, property });

  function set<K extends keyof CampaignForm>(k: K, v: CampaignForm[K]) { setForm((f) => ({ ...f, [k]: v })); }

  function openNew() { setEditId(null); setForm({ ...CAMPAIGN_INITIAL, property }); setModalOpen(true); }
  function openEdit(c: Campaign) {
    setEditId(c.id);
    setForm({ name: c.name, channel: c.channel, property: c.property, template: "eco-stay", scheduled: c.scheduled });
    setModalOpen(true);
  }

  function save() {
    if (!form.name) return;
    if (editId) {
      setCampaigns((cs) => cs.map((c) => c.id === editId ? { ...c, name: form.name, channel: form.channel, property: form.property, scheduled: form.scheduled } : c));
    } else {
      const nc: Campaign = { id: "c-" + Date.now(), name: form.name, channel: form.channel, property: form.property, reach: 0, openRate: 0, status: "draft", scheduled: form.scheduled };
      setCampaigns((cs) => [nc, ...cs]);
    }
    setModalOpen(false);
  }

  const CAMP_STATUS_TONE: Record<CampaignStatus, "good" | "neutral" | "info"> = { active: "good", draft: "neutral", completed: "info" };

  return (
    <>
      <Card>
        <CardHeader title="Campaigns" hint="Email · In-room QR · App push" right={<button className="btn-primary" onClick={openNew}><Plus size={14} /> New campaign</button>} />
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Campaign</th>
                <th className="table-th">Channel</th>
                <th className="table-th">Property</th>
                <th className="table-th">Reach</th>
                <th className="table-th">Open rate</th>
                <th className="table-th">Scheduled</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-ink-50/60">
                  <td className="table-td font-medium text-ink-900">{c.name}</td>
                  <td className="table-td">
                    <span className="inline-flex items-center gap-1 text-[12px] text-ink-600">
                      {CHANNEL_ICON[c.channel]} {CHANNEL_LABEL[c.channel]}
                    </span>
                  </td>
                  <td className="table-td text-ink-700 text-[12px]">{c.property}</td>
                  <td className="table-td font-mono text-[12px]">{c.reach.toLocaleString()}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-ink-100 overflow-hidden">
                        <div className={cn("h-full rounded-full", c.openRate >= 40 ? "bg-good" : "bg-warn")} style={{ width: `${c.openRate}%` }} />
                      </div>
                      <span className="text-[12px] font-semibold tabular-nums">{c.openRate}%</span>
                    </div>
                  </td>
                  <td className="table-td text-ink-600 text-[12px]">{c.scheduled}</td>
                  <td className="table-td"><Badge tone={CAMP_STATUS_TONE[c.status]} className="capitalize">{c.status}</Badge></td>
                  <td className="table-td text-right pr-6">
                    <button className="btn-ghost h-7 px-2 text-[12px] text-brand-700" onClick={() => openEdit(c)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit campaign" : "New campaign"} size="md">
        <div className="space-y-4 p-5">
          <div>
            <label className="block text-[12px] font-medium text-ink-700 mb-1">Campaign name</label>
            <input className="input w-full" placeholder="e.g. Spring Eco Stay 2026" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-ink-700 mb-1">Channel</label>
              <select className="input w-full" value={form.channel} onChange={(e) => set("channel", e.target.value as Channel)}>
                <option value="email">Email</option>
                <option value="qr">In-room QR</option>
                <option value="push">App push</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-ink-700 mb-1">Property</label>
              <select className="input w-full" value={form.property} onChange={(e) => set("property", e.target.value)}>
                {[...PROPERTY_NAMES, "All properties"].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-ink-700 mb-1">Template</label>
              <select className="input w-full" value={form.template} onChange={(e) => set("template", e.target.value)}>
                <option value="eco-stay">Eco Stay highlights</option>
                <option value="towel-reuse">Towel reuse drive</option>
                <option value="ev">EV charging awareness</option>
                <option value="earth-day">Earth Day challenge</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-ink-700 mb-1">Schedule date</label>
              <input type="date" className="input w-full" value={form.scheduled} onChange={(e) => set("scheduled", e.target.value)} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5 pt-2 border-t border-ink-200">
          <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={!form.name}>Save campaign</button>
        </div>
      </Modal>
    </>
  );
}

/* ================================================================== */
/* Tab 3 — Surveys & Feedback                                          */
/* ================================================================== */

function SurveysTab({ property }: { property: string }) {
  const [questions, setQuestions] = useState<SurveyQuestion[]>(INITIAL_QUESTIONS);
  const [adding, setAdding]       = useState<QuestionType | null>(null);
  const [newText, setNewText]     = useState("");

  function addQuestion() {
    if (!adding || !newText.trim()) return;
    setQuestions((qs) => [...qs, { id: "q-" + Date.now(), type: adding, text: newText.trim() }]);
    setNewText("");
    setAdding(null);
  }

  function removeQuestion(id: string) { setQuestions((qs) => qs.filter((q) => q.id !== id)); }
  function moveUp(i: number)   { if (i === 0) return; setQuestions((qs) => { const a = [...qs]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a; }); }
  function moveDown(i: number) { setQuestions((qs) => { if (i >= qs.length - 1) return qs; const a = [...qs]; [a[i], a[i+1]] = [a[i+1], a[i]]; return a; }); }

  const Q_TONE: Record<QuestionType, "info" | "good" | "neutral"> = { rating: "info", yesno: "good", text: "neutral" };
  const Q_LABEL: Record<QuestionType, string> = { rating: "Rating scale", yesno: "Yes / No", text: "Open text" };
  const npsLeft  = Math.round((200 - NPS_SCORE) / 2 - 6); // approx pin %
  const npsColor = NPS_SCORE >= 50 ? "text-good" : NPS_SCORE >= 0 ? "text-warn" : "text-bad";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-12 gap-4">
        {/* Survey builder */}
        <Card className="col-span-12 lg:col-span-6">
          <CardHeader title="Survey builder" hint={`Active survey — ${property}`} />
          <div className="p-4 space-y-2">
            {questions.map((q, i) => (
              <div key={q.id} className="flex items-center gap-2 rounded-xl border border-ink-200 px-3 py-2.5 bg-white hover:bg-ink-50/40">
                <GripVertical size={14} className="text-ink-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-ink-900 truncate">{q.text}</div>
                  {q.type === "text" && <div className="text-[10px] text-ink-400 mt-0.5">Max 500 characters</div>}
                </div>
                <Badge tone={Q_TONE[q.type]} className="shrink-0 text-[10px]">{Q_LABEL[q.type]}</Badge>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button onClick={() => moveUp(i)}   className="w-6 h-6 grid place-items-center rounded hover:bg-ink-100 text-ink-400"><ArrowUp size={11} /></button>
                  <button onClick={() => moveDown(i)} className="w-6 h-6 grid place-items-center rounded hover:bg-ink-100 text-ink-400"><ArrowDown size={11} /></button>
                  <button onClick={() => removeQuestion(q.id)} className="w-6 h-6 grid place-items-center rounded hover:bg-bad/10 text-ink-400 hover:text-bad"><Trash2 size={11} /></button>
                </div>
              </div>
            ))}
          </div>

          {/* Add question */}
          {adding ? (
            <div className="px-4 pb-4 space-y-2">
              <textarea
                autoFocus
                className="input w-full resize-none text-[13px]"
                rows={2}
                placeholder={`Enter your ${Q_LABEL[adding].toLowerCase()} question…`}
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                maxLength={adding === "text" ? 200 : 120}
              />
              {adding === "text" && <div className="text-[10px] text-ink-400">{newText.length}/200 chars</div>}
              <div className="flex gap-2">
                <button className="btn-primary text-[12px] h-8" onClick={addQuestion} disabled={!newText.trim()}>Add question</button>
                <button className="btn-secondary text-[12px] h-8" onClick={() => { setAdding(null); setNewText(""); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="px-4 pb-4 flex gap-2 flex-wrap">
              {(["rating","yesno","text"] as QuestionType[]).map((t) => (
                <button key={t} onClick={() => setAdding(t)} className="btn-ghost h-8 text-[12px] border border-ink-200">
                  <Plus size={12} /> {Q_LABEL[t]}
                </button>
              ))}
            </div>
          )}

          <div className="px-4 pb-4 border-t border-ink-200 pt-3 flex gap-2">
            <button className="btn-primary text-[12px] h-8"><Send size={12} /> Publish survey</button>
            <button className="btn-secondary text-[12px] h-8">Save draft</button>
          </div>
        </Card>

        {/* Response analytics */}
        <Card className="col-span-12 lg:col-span-6">
          <CardHeader title="Response analytics" hint="April 2026 · 184 responses" />
          <div className="p-5 space-y-5">
            {/* NPS gauge */}
            <div>
              <div className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide mb-2">Net Promoter Score</div>
              <div className="flex items-center gap-4">
                <div className={cn("text-5xl font-extrabold tabular-nums", npsColor)}>+{NPS_SCORE}</div>
                <div className="flex-1">
                  <div className="relative h-4 rounded-full overflow-hidden flex">
                    <div className="bg-bad   flex-1 h-full" style={{ flex: "0 0 33%" }} />
                    <div className="bg-warn  flex-1 h-full" style={{ flex: "0 0 17%" }} />
                    <div className="bg-good  flex-1 h-full" style={{ flex: "0 0 50%" }} />
                  </div>
                  {/* Pin */}
                  <div className="relative h-0">
                    <div className="absolute -top-5 w-3 h-3 rounded-full bg-ink-900 border-2 border-white shadow" style={{ left: `calc(${(NPS_SCORE + 100) / 2}% - 6px)` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-ink-400 mt-1.5">
                    <span>−100</span><span>0</span><span>+100</span>
                  </div>
                  <div className="flex gap-3 mt-1.5 text-[10px]">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-bad inline-block" /> Detractor</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-warn inline-block" /> Passive</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-good inline-block" /> Promoter</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rating distribution */}
            <div>
              <div className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide mb-2">Overall rating distribution</div>
              <div className="flex items-end gap-1.5 h-20">
                {RATING_DIST.map((pct, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={cn("w-full rounded-t", i >= 3 ? "bg-good" : i === 2 ? "bg-warn" : "bg-bad")}
                      style={{ height: `${pct * 1.5}px` }}
                    />
                    <div className="text-[10px] text-ink-500 flex items-center gap-0.5">
                      {i + 1}<Star size={8} className="fill-current" />
                    </div>
                    <div className="text-[10px] font-semibold text-ink-700">{pct}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Verbatim quotes */}
      <Card>
        <CardHeader title="Top verbatim quotes" hint="Sentiment-scored · anonymised · April 2026" />
        <ul className="p-4 space-y-2">
          {VERBATIMS.map((v, i) => {
            const tone = v.sentiment === "positive" ? "good" : v.sentiment === "negative" ? "bad" : "neutral";
            return (
              <li key={i} className="flex items-start gap-3 rounded-xl border border-ink-200 px-4 py-3">
                <MessageSquare size={14} className="text-ink-400 shrink-0 mt-0.5" />
                <p className="text-sm text-ink-800 flex-1">"{v.text}"</p>
                <Badge tone={tone} className="shrink-0 capitalize">{v.sentiment}</Badge>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

/* ================================================================== */
/* Tab 4 — Eco-points                                                  */
/* ================================================================== */

function EcoPointsTab() {
  const [ledger] = useState<PointsEntry[]>(POINTS_LEDGER);
  const totalIssued   = ledger.reduce((s, e) => s + e.points, 0);
  const totalRedeemed = ledger.filter((e) => e.redeemed).reduce((s, e) => s + e.points, 0);

  return (
    <div className="space-y-4">
      {/* Eco actions catalogue */}
      <Card>
        <CardHeader title="Eco-points catalogue" hint="Points awarded per qualifying guest action" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-5">
          {ECO_ACTIONS.map((a) => (
            <div key={a.id} className="rounded-xl border border-ink-200 p-4 text-center hover:bg-ink-50/60">
              <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-700 grid place-items-center mx-auto mb-2">
                <Leaf size={15} />
              </div>
              <div className="text-[11px] font-medium text-ink-800 leading-snug">{a.label}</div>
              <div className="mt-2 text-xl font-extrabold text-brand-700">{a.points}</div>
              <div className="text-[10px] text-ink-400">pts</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-3">
        <Tile label="Total issued" value={totalIssued.toLocaleString()} hint="pts this period" tone="info" />
        <Tile label="Redeemed"     value={totalRedeemed.toLocaleString()} hint="pts converted" tone="good" />
        <Tile label="Redemption rate" value={`${Math.round(totalRedeemed / totalIssued * 100)}%`} hint="of issued points" tone="warn" />
      </div>

      {/* Ledger */}
      <Card>
        <CardHeader title="Points ledger" hint="Per-guest entries — anonymised · April 2026" />
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Guest (anon.)</th>
                <th className="table-th">Action</th>
                <th className="table-th">Points</th>
                <th className="table-th">Date</th>
                <th className="table-th">Redemption</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((e, i) => (
                <tr key={i} className="hover:bg-ink-50/60">
                  <td className="table-td font-mono text-[12px] text-ink-700">{e.guest}</td>
                  <td className="table-td text-[12px] text-ink-800">{e.action}</td>
                  <td className="table-td">
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700">
                      <Award size={11} /> {e.points} pts
                    </span>
                  </td>
                  <td className="table-td text-ink-500 text-[12px]">{e.date}</td>
                  <td className="table-td">
                    {e.redeemed
                      ? <Badge tone="good"><CheckCircle2 size={10} /> Redeemed</Badge>
                      : <Badge tone="neutral">Pending</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ================================================================== */
/* Tab 0 — Overview (pulse · collective impact · journey map)          */
/* ================================================================== */

// Guest eco-action impact: per-occurrence factors × monthly counts → collective
// impact. Numbers are illustrative but internally consistent.
const GUEST_ACTIONS: { label: string; count: number; co2: number; water: number; waste: number; icon: typeof Leaf }[] = [
  { label: "Towel & linen reuse",  count: 1240, co2: 0.6, water: 45, waste: 0,   icon: Recycle },
  { label: "Housekeeping opt-out", count: 980,  co2: 0.9, water: 30, waste: 0.1, icon: Sparkles },
  { label: "EV charging",          count: 320,  co2: 4.2, water: 0,  waste: 0,   icon: Zap },
  { label: "Plant-based meals",    count: 760,  co2: 1.6, water: 0,  waste: 0,   icon: Leaf },
  { label: "Survey completed",     count: 184,  co2: 0,   water: 0,  waste: 0,   icon: MessageSquare },
];

type Touchpoint = { label: string; metric: string; active: boolean };
const JOURNEY: { stage: string; icon: typeof Leaf; points: Touchpoint[] }[] = [
  { stage: "Pre-stay", icon: LogIn, points: [
    { label: "Booking confirmation footprint", metric: "PMS-driven · every booking", active: true },
    { label: "Pre-arrival eco-tips email",     metric: "48% open rate", active: true },
  ] },
  { stage: "In-stay", icon: Smartphone, points: [
    { label: "In-room QR sustainability page", metric: "2,140 scans / 30d", active: true },
    { label: "Towel & linen reuse",            metric: "31% opt-in", active: true },
    { label: "Eco-points program",             metric: "3,484 actions", active: true },
  ] },
  { stage: "Post-stay", icon: LogOut, points: [
    { label: "Checkout carbon summary",  metric: "emailed at checkout", active: true },
    { label: "Sustainability survey",    metric: "NPS +42 · 184 resp", active: true },
    { label: "Guest review request",     metric: "not configured", active: false },
  ] },
];

function fmtK(n: number): string { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n); }

function OverviewTab({ property, onJump }: { property: string; onJump: (t: Tab) => void }) {
  const impact = GUEST_ACTIONS.reduce(
    (a, x) => ({ co2: a.co2 + x.co2 * x.count, water: a.water + x.water * x.count, waste: a.waste + x.waste * x.count, actions: a.actions + x.count }),
    { co2: 0, water: 0, waste: 0, actions: 0 }
  );
  const reach = CAMPAIGNS.reduce((s, c) => s + c.reach, 0);

  return (
    <div className="space-y-4">
      {/* Engagement pulse */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <PulseTile label="Public page" value="Live" sub={`${slug(property)}.hotel-optimizer.com`} tone="good" icon={<Globe size={15} />} onClick={() => onJump("public")} />
        <PulseTile label="Guest reach · 30d" value={fmtK(reach)} sub="across campaigns" tone="info" icon={<Mail size={15} />} onClick={() => onJump("campaigns")} />
        <PulseTile label="Net Promoter Score" value={`+${NPS_SCORE}`} sub="184 responses" tone={NPS_SCORE >= 50 ? "good" : "warn"} icon={<Star size={15} />} onClick={() => onJump("surveys")} />
        <PulseTile label="Eco-actions · 30d" value={impact.actions.toLocaleString()} sub="guest actions" tone="info" icon={<Leaf size={15} />} onClick={() => onJump("ecopoints")} />
        <PulseTile label="QR scans · 30d" value="2,140" sub="in-room + lobby" tone="info" icon={<QrCode size={15} />} />
      </div>

      {/* Collective guest impact — the star widget */}
      <Card>
        <CardHeader
          title="Collective guest impact"
          hint={`What guests at ${property} achieved this month through their eco-actions`}
          right={<button className="btn-secondary text-[12px] h-8"><Share2 size={13} /> Share impact</button>}
        />
        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-gradient-to-br from-brand-700 to-brand-500 text-white p-5 flex flex-col justify-center">
            <div className="text-[12px] uppercase tracking-wide opacity-90">Together, our guests saved</div>
            <div className="text-4xl font-extrabold mt-1 tabular-nums">{(impact.co2 / 1000).toFixed(1)} t</div>
            <div className="text-sm opacity-90">CO₂e avoided this month</div>
            <div className="mt-3 flex gap-5">
              <div><div className="font-bold text-lg tabular-nums">{Math.round(impact.water / 1000)} m³</div><div className="opacity-80 text-[11px]">water saved</div></div>
              <div><div className="font-bold text-lg tabular-nums">{Math.round(impact.waste)} kg</div><div className="opacity-80 text-[11px]">waste diverted</div></div>
              <div><div className="font-bold text-lg tabular-nums">{impact.actions.toLocaleString()}</div><div className="opacity-80 text-[11px]">guest actions</div></div>
            </div>
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2 content-start">
            {GUEST_ACTIONS.filter((a) => a.co2 > 0 || a.water > 0).map((a) => {
              const Icon = a.icon;
              const co2 = a.co2 * a.count;
              const detail = co2 >= 1 ? `${co2.toFixed(0)} kg CO₂e` : `${Math.round((a.water * a.count) / 1000)} m³ water`;
              return (
                <div key={a.label} className="rounded-xl border border-ink-200 p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 grid place-items-center shrink-0"><Icon size={16} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-semibold text-ink-900 truncate">{a.label}</div>
                    <div className="text-[11px] text-ink-500">{a.count.toLocaleString()} actions · {detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="px-5 pb-4 text-[11px] text-ink-400 flex items-center gap-1.5">
          <Users size={11} /> Aggregated from anonymised guest eco-actions · use in marketing and ESG reporting with the "Share impact" pack.
        </div>
      </Card>

      {/* Guest journey touchpoint map */}
      <Card>
        <CardHeader title="Guest journey — sustainability touchpoints" hint="Where sustainability reaches the guest across the stay, and which touchpoints are live." />
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          {JOURNEY.map((s, si) => {
            const Icon = s.icon;
            return (
              <div key={s.stage}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-ink-100 text-ink-600 grid place-items-center"><Icon size={14} /></div>
                  <div className="text-[13px] font-semibold text-ink-900">{s.stage}</div>
                  {si < JOURNEY.length - 1 && <ArrowRight size={14} className="text-ink-300 ml-auto hidden md:block" />}
                </div>
                <div className="space-y-2">
                  {s.points.map((p) => (
                    <div key={p.label} className={cn("rounded-xl border p-3", p.active ? "border-ink-200" : "border-dashed border-ink-300 bg-ink-50/50")}>
                      <div className="flex items-center gap-2">
                        {p.active ? <CheckCircle2 size={13} className="text-good shrink-0" /> : <Plus size={13} className="text-ink-400 shrink-0" />}
                        <span className={cn("text-[12px] font-medium", p.active ? "text-ink-900" : "text-ink-500")}>{p.label}</span>
                      </div>
                      <div className="text-[11px] mt-0.5 ml-5">
                        {p.active ? <span className="text-ink-500">{p.metric}</span> : <span className="text-brand-700 inline-flex items-center gap-0.5">Set up <TrendingUp size={10} /></span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function PulseTile({ label, value, sub, tone, icon, onClick }: { label: string; value: string; sub?: string; tone: "good" | "warn" | "info"; icon: React.ReactNode; onClick?: () => void }) {
  const v = tone === "good" ? "text-good" : tone === "warn" ? "text-amber-700" : "text-ink-900";
  const inner = (
    <>
      <div className="flex items-center justify-between"><span className="text-[11px] text-ink-500">{label}</span><span className="text-ink-300">{icon}</span></div>
      <div className={cn("text-xl font-bold mt-1 tabular-nums", v)}>{value}</div>
      {sub && <div className="text-[10px] text-ink-400 truncate">{sub}</div>}
    </>
  );
  if (onClick) return <button onClick={onClick} className="text-left rounded-xl border border-ink-200 bg-white p-3 w-full hover:shadow-card hover:border-brand-200 transition">{inner}</button>;
  return <div className="rounded-xl border border-ink-200 bg-white p-3">{inner}</div>;
}

/* ------------------------------------------------------------------ */
/* Shared small components                                              */
/* ------------------------------------------------------------------ */

function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone: "good" | "warn" | "info" | "bad" | "neutral" }) {
  const border = tone === "good" ? "border-good/20" : tone === "warn" ? "border-warn/20" : tone === "bad" ? "border-bad/20" : "border-ink-200";
  const text   = tone === "good" ? "text-good"      : tone === "warn" ? "text-warn"      : tone === "bad" ? "text-bad"      : "text-brand-700";
  return (
    <div className={cn("rounded-2xl border bg-white p-4", border)}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-500">{label}</div>
      <div className={cn("text-3xl font-extrabold mt-1 tabular-nums", text)}>{value}</div>
      {hint && <div className="text-[11px] text-ink-400 mt-0.5">{hint}</div>}
    </div>
  );
}
