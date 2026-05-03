import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Award,
  BarChart2,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  ExternalLink,
  Globe,
  GripVertical,
  Languages,
  Leaf,
  Lock,
  Mail,
  MessageSquare,
  Minus,
  Plus,
  PowerOff,
  QrCode,
  Send,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import StatusPipeline from "@/components/shared/StatusPipeline";
import { GUEST_PAGE_METRICS } from "@/lib/mock";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

type Tab = "public" | "campaigns" | "surveys" | "ecopoints";

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
  { name: "Energy use per stay",   value: "12.4 kWh",     delta: -8,  source: "FR-3.1", lastApproved: "2026-04-29", isPublic: true,  brdSafe: true },
  { name: "Water per stay",        value: "184 L",          delta: -5,  source: "FR-3.2", lastApproved: "2026-04-28", isPublic: true,  brdSafe: true },
  { name: "Waste per stay",        value: "0.42 kg",        delta: -12, source: "FR-3.3", lastApproved: "2026-04-26", isPublic: true,  brdSafe: true },
  { name: "Carbon per stay (HCMI)",value: "8.2 kgCO₂e",    delta: -9,  source: "HCMI v1.2", lastApproved: "2026-04-25", isPublic: true, brdSafe: true },
  { name: "Renewable share",       value: "78%",            delta: 3,   source: "FR-3.1", lastApproved: "2026-04-29", isPublic: false, brdSafe: true },
  { name: "Diversion rate",        value: "64%",            delta: 5,   source: "FR-3.3", lastApproved: "2026-04-26", isPublic: false, brdSafe: true },
  { name: "Total Scope 3",         value: "22,640 tCO₂e",   delta: -2,  source: "FR-7",   lastApproved: "2026-04-12", isPublic: false, brdSafe: false },
  { name: "Supplier EFs",          value: "54 active",      delta: 12,  source: "FR-15",  lastApproved: "2026-04-22", isPublic: false, brdSafe: false },
];

const CAMPAIGNS: Campaign[] = [
  { id: "c1", name: "Spring Eco Stay 2026",         channel: "email", property: "Greenview Resort",   reach: 3840, openRate: 48, status: "active",    scheduled: "2026-04-01" },
  { id: "c2", name: "Towel Reuse Drive — May",       channel: "qr",    property: "Mountain Lodge",     reach: 620,  openRate: 61, status: "active",    scheduled: "2026-05-01" },
  { id: "c3", name: "EV Charging Awareness",         channel: "push",  property: "Palm Beach Resort",  reach: 1240, openRate: 33, status: "draft",     scheduled: "2026-06-01" },
  { id: "c4", name: "Earth Day Challenge",           channel: "email", property: "All properties",     reach: 9200, openRate: 52, status: "completed", scheduled: "2026-04-22" },
  { id: "c5", name: "Plant-Based Menu Spotlight",   channel: "push",  property: "City Centre Hotel",  reach: 880,  openRate: 29, status: "draft",     scheduled: "2026-05-15" },
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
  const [tab, setTab] = useState<Tab>("public");

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Public surfaces · FR-17"
        title="Guest Engagement"
        subtitle="Public sustainability page, campaigns, guest surveys, eco-points, and per-stay carbon footprints (HCMI)."
        actions={
          <>
            <button className="btn-secondary"><QrCode size={14} /> Print lobby QR</button>
            <button className="btn-primary"><ExternalLink size={14} /> Open public page</button>
          </>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-ink-200 pb-0">
        {([
          ["public",    "Public page"],
          ["campaigns", "Campaigns"],
          ["surveys",   "Surveys & Feedback"],
          ["ecopoints", "Eco-points"],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn("tab text-[13px] pb-3 px-4", tab === key && "tab-active")}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "public"    && <PublicPageTab />}
      {tab === "campaigns" && <CampaignsTab />}
      {tab === "surveys"   && <SurveysTab />}
      {tab === "ecopoints" && <EcoPointsTab />}
    </div>
  );
}

/* ================================================================== */
/* Tab 1 — Public page (existing content)                              */
/* ================================================================== */

function PublicPageTab() {
  const [status, setStatus]   = useState<PublishStatus>("live");
  const [metrics, setMetrics] = useState<PublicMetric[]>(METRIC_REGISTRY);
  const [language, setLanguage] = useState("en");

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
              <span className="text-sm text-ink-700">Greenview Resort · greenview-resort.hotel-optimizer.com</span>
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
          <CardHeader title="Public sustainability page — Greenview Resort" hint="Branded · verified · provenance-signed"
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
                <div className="text-[12px] uppercase tracking-wide opacity-90">Greenview Resort · Bali</div>
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
          {[["Bali · Standard · 2 nights","14.6 kgCO₂e"],["Bali · Pool villa · 3 nights","38.4 kgCO₂e"],["Bali · Suite · 5 nights","62.1 kgCO₂e"]].map(([l,v]) => (
            <div key={l} className="rounded-xl border border-ink-200 p-4 bg-gradient-to-br from-brand-50 to-white">
              <div className="text-[11px] text-ink-500">{l}</div>
              <div className="text-2xl font-extrabold text-brand-800 mt-1">{v}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ================================================================== */
/* Tab 2 — Campaigns                                                   */
/* ================================================================== */

type CampaignForm = { name: string; channel: Channel; property: string; template: string; scheduled: string };
const CAMPAIGN_INITIAL: CampaignForm = { name: "", channel: "email", property: "Greenview Resort", template: "eco-stay", scheduled: "" };

function CampaignsTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(CAMPAIGNS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState<CampaignForm>(CAMPAIGN_INITIAL);

  function set<K extends keyof CampaignForm>(k: K, v: CampaignForm[K]) { setForm((f) => ({ ...f, [k]: v })); }

  function openNew() { setEditId(null); setForm(CAMPAIGN_INITIAL); setModalOpen(true); }
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
                {["Greenview Resort","Mountain Lodge","Palm Beach Resort","City Centre Hotel","All properties"].map((p) => (
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

function SurveysTab() {
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
          <CardHeader title="Survey builder" hint="Active survey — Greenview Resort" />
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
