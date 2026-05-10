import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Users,
  Target,
  ShieldCheck,
  BookOpen,
  AlertCircle,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = "hotels" | "groups" | "targets" | "users" | "rules" | "escalations";

// ── Mock data ────────────────────────────────────────────────────────────────

const HOTELS = [
  { id: "h1", name: "The Pavilion London", location: "London, UK", rooms: 312, status: "active", group: "UK Flagships", tier: "Full Reporting", lastData: "2 days ago" },
  { id: "h2", name: "Grand Harbour Lisbon", location: "Lisbon, PT", rooms: 248, status: "active", group: "Southern Europe", tier: "Full Reporting", lastData: "1 day ago" },
  { id: "h3", name: "Skyline Dubai", location: "Dubai, UAE", rooms: 520, status: "active", group: "Middle East", tier: "Full Reporting", lastData: "Today" },
  { id: "h4", name: "Bay View Singapore", location: "Singapore, SG", rooms: 410, status: "active", group: "Asia Pacific", tier: "Full Reporting", lastData: "3 days ago" },
  { id: "h5", name: "The Montrose Paris", location: "Paris, FR", rooms: 180, status: "active", group: "Western Europe", tier: "Full Reporting", lastData: "Today" },
  { id: "h6", name: "Marina Residences Barcelona", location: "Barcelona, ES", rooms: 205, status: "active", group: "Southern Europe", tier: "Light Reporting", lastData: "5 days ago" },
  { id: "h7", name: "Peaks Resort Zermatt", location: "Zermatt, CH", rooms: 94, status: "inactive", group: "Western Europe", tier: "Light Reporting", lastData: "12 days ago" },
  { id: "h8", name: "Oceanfront Cape Town", location: "Cape Town, ZA", rooms: 168, status: "active", group: "Africa", tier: "Full Reporting", lastData: "2 days ago" },
];

const GROUPS = [
  { id: "g1", name: "UK Flagships", hotels: 1, lead: "Sarah Chen", framework: "GRI + CDP", note: "Full disclosure required" },
  { id: "g2", name: "Southern Europe", hotels: 2, lead: "Marco Rossi", framework: "GRI", note: "Quarterly targets" },
  { id: "g3", name: "Middle East", hotels: 1, lead: "Layla Al-Hassan", framework: "GRI + UNGC", note: "Custom intensity targets" },
  { id: "g4", name: "Asia Pacific", hotels: 1, lead: "Jin Park", framework: "GRI + CDP", note: "" },
  { id: "g5", name: "Western Europe", hotels: 2, lead: "Sophie Müller", framework: "GRI + EU Taxonomy", note: "EU reporting mandatory" },
  { id: "g6", name: "Africa", hotels: 1, lead: "Thabo Nkosi", framework: "GRI", note: "" },
];

const TARGETS = [
  { id: "t1", pillar: "Energy", metric: "Energy Intensity", baseline: "22.1 kWh / room night", current: "18.4", target2025: "17.0", target2030: "12.0", unit: "kWh / room night", status: "on-track" },
  { id: "t2", pillar: "Carbon", metric: "Carbon Intensity", baseline: "4.1 kg CO₂e / room night", current: "2.9", target2025: "2.8", target2030: "1.5", unit: "kg CO₂e / room night", status: "on-track" },
  { id: "t3", pillar: "Water", metric: "Water Intensity", baseline: "415 L / guest night", current: "392", target2025: "385", target2030: "310", unit: "L / guest night", status: "at-risk" },
  { id: "t4", pillar: "Waste", metric: "Diversion Rate", baseline: "48%", current: "61%", target2025: "70%", target2030: "90%", unit: "% diverted", status: "at-risk" },
  { id: "t5", pillar: "Social", metric: "Fair Wage Compliance", baseline: "72%", current: "89%", target2025: "95%", target2030: "100%", unit: "% properties compliant", status: "on-track" },
  { id: "t6", pillar: "Governance", metric: "Policy Attestations", baseline: "60%", current: "85%", target2025: "90%", target2030: "100%", unit: "% complete", status: "on-track" },
];

const USERS = [
  { id: "u1", name: "Sarah Chen", email: "s.chen@acmehotels.com", role: "super_admin", properties: "All", lastLogin: "Today" },
  { id: "u2", name: "Marco Rossi", email: "m.rossi@acmehotels.com", role: "checker", properties: "Southern Europe", lastLogin: "Yesterday" },
  { id: "u3", name: "Jin Park", email: "j.park@acmehotels.com", role: "maker", properties: "Asia Pacific", lastLogin: "2 days ago" },
  { id: "u4", name: "Layla Al-Hassan", email: "l.alhassan@acmehotels.com", role: "checker", properties: "Middle East", lastLogin: "Today" },
  { id: "u5", name: "Sophie Müller", email: "s.muller@acmehotels.com", role: "maker", properties: "Western Europe", lastLogin: "3 days ago" },
  { id: "u6", name: "Thabo Nkosi", email: "t.nkosi@acmehotels.com", role: "property_sm", properties: "Africa", lastLogin: "1 week ago" },
];

const RULES = [
  { id: "r1", name: "Monthly Data Deadline", scope: "All properties", trigger: "End of month", action: "Lock submission window; flag overdue hotels", active: true },
  { id: "r2", name: "Outlier Detection — Energy", scope: "All properties", trigger: ">30% month-on-month spike", action: "Flag for checker review; block auto-approval", active: true },
  { id: "r3", name: "Outlier Detection — Water", scope: "All properties", trigger: ">25% month-on-month spike", action: "Flag for checker review", active: true },
  { id: "r4", name: "Missing Data Auto-Reminder", scope: "All properties", trigger: "7 days before deadline", action: "Email property manager; appear in review queue", active: true },
  { id: "r5", name: "Renewable Energy Verification", scope: "Full Reporting tier", trigger: "On submission of renewable claim", action: "Require certificate upload", active: false },
];

const ESCALATIONS = [
  { id: "e1", trigger: "Data not submitted — 3 days overdue", recipient: "Property Manager", channel: "Email", severity: "warn" },
  { id: "e2", trigger: "Data not submitted — 7 days overdue", recipient: "Group Lead", channel: "Email + In-app", severity: "bad" },
  { id: "e3", trigger: "Outlier flagged — awaiting review >48 hrs", recipient: "Checker", channel: "In-app", severity: "warn" },
  { id: "e4", trigger: "Approval queue >20 items", recipient: "Super Admin", channel: "Email + In-app", severity: "warn" },
  { id: "e5", trigger: "Report deadline <14 days — incomplete data", recipient: "Super Admin + Group Lead", channel: "Email + In-app", severity: "bad" },
  { id: "e6", trigger: "Certification renewal due in 30 days", recipient: "Super Admin", channel: "Email", severity: "info" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  checker: "Checker",
  maker: "Maker",
  property_sm: "Property SM",
};

const STATUS_BADGE: Record<string, string> = {
  "on-track": "bg-good/10 text-good",
  "at-risk": "bg-warn/10 text-warn",
  "off-track": "bg-bad/10 text-bad",
};
const STATUS_LABEL: Record<string, string> = {
  "on-track": "On Track",
  "at-risk": "At Risk",
  "off-track": "Off Track",
};

const SEV_BADGE: Record<string, string> = {
  info: "bg-brand-100 text-brand-700",
  warn: "bg-warn/10 text-warn",
  bad: "bg-bad/10 text-bad",
};
const SEV_LABEL: Record<string, string> = {
  info: "Info",
  warn: "Warning",
  bad: "Critical",
};

const PILLAR_COLOUR: Record<string, string> = {
  Energy: "text-pillar-energy",
  Carbon: "text-pillar-carbon",
  Water: "text-pillar-water",
  Waste: "text-pillar-waste",
  Social: "text-pillar-social",
  Governance: "text-pillar-gov",
};

// ── Sub-pages ─────────────────────────────────────────────────────────────────

function HotelsTab() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-ink-500">
          {HOTELS.filter(h => h.status === "active").length} active · {HOTELS.filter(h => h.status === "inactive").length} inactive · {HOTELS.reduce((s, h) => s + h.rooms, 0).toLocaleString()} total rooms
        </p>
        <button className="btn-primary flex items-center gap-1.5 text-[13px]">
          <Plus size={14} /> Add Hotel
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-ink-100">
              {["Hotel", "Location", "Rooms", "Group", "Tier", "Last Data", "Status", ""].map(h => (
                <th key={h} className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider py-2 px-3 first:pl-0 last:pr-0">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50">
            {HOTELS.map(h => (
              <tr key={h.id} className="hover:bg-ink-50/50 group">
                <td className="py-3 px-3 pl-0 font-medium text-ink-900">
                  <Link to={`/properties/${h.id}`} className="hover:text-brand-600 flex items-center gap-1">
                    {h.name} <ChevronRight size={12} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                  </Link>
                </td>
                <td className="py-3 px-3 text-ink-500">{h.location}</td>
                <td className="py-3 px-3 text-ink-700">{h.rooms.toLocaleString()}</td>
                <td className="py-3 px-3 text-ink-500">{h.group}</td>
                <td className="py-3 px-3">
                  <span className="chip bg-ink-100 text-ink-600">{h.tier}</span>
                </td>
                <td className="py-3 px-3 text-ink-500">{h.lastData}</td>
                <td className="py-3 px-3">
                  <span className={cn("chip", h.status === "active" ? "bg-good/10 text-good" : "bg-ink-100 text-ink-400")}>
                    {h.status === "active" ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-3 px-3 pr-0">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 rounded hover:bg-ink-100 text-ink-400 hover:text-ink-700"><Pencil size={13} /></button>
                    <button className="p-1 rounded hover:bg-bad/10 text-ink-400 hover:text-bad"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupsTab() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-ink-500">{GROUPS.length} groups · hotels assigned by region</p>
        <button className="btn-primary flex items-center gap-1.5 text-[13px]">
          <Plus size={14} /> New Group
        </button>
      </div>
      <div className="grid gap-3">
        {GROUPS.map(g => (
          <div key={g.id} className="rounded-xl border border-ink-100 bg-white p-4 flex items-start justify-between gap-4 hover:shadow-sm transition-shadow">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-ink-900 text-[14px]">{g.name}</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[12px] text-ink-500">
                <span>{g.hotels} hotel{g.hotels !== 1 ? "s" : ""}</span>
                <span>Lead: {g.lead}</span>
                <span>Framework: {g.framework}</span>
                {g.note && <span className="text-brand-600">{g.note}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button className="p-1.5 rounded hover:bg-ink-100 text-ink-400 hover:text-ink-700"><Pencil size={13} /></button>
              <button className="p-1.5 rounded hover:bg-bad/10 text-ink-400 hover:text-bad"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TargetsTab() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-ink-500">Portfolio-level targets · baseline year 2019</p>
        <button className="btn-primary flex items-center gap-1.5 text-[13px]">
          <Plus size={14} /> Add Target
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-ink-100">
              {["Pillar", "Metric", "Baseline", "Current", "2025 Target", "2030 Target", "Status", ""].map(h => (
                <th key={h} className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider py-2 px-3 first:pl-0 last:pr-0">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50">
            {TARGETS.map(t => (
              <tr key={t.id} className="hover:bg-ink-50/50 group">
                <td className="py-3 px-3 pl-0">
                  <span className={cn("font-semibold text-[12px]", PILLAR_COLOUR[t.pillar])}>{t.pillar}</span>
                </td>
                <td className="py-3 px-3 font-medium text-ink-900">{t.metric}</td>
                <td className="py-3 px-3 text-ink-500">{t.baseline}</td>
                <td className="py-3 px-3 font-semibold text-ink-900">{t.current} <span className="text-ink-400 font-normal">{t.unit.split("/")[1] ? `/ ${t.unit.split("/")[1].trim()}` : ""}</span></td>
                <td className="py-3 px-3 text-ink-700">{t.target2025}</td>
                <td className="py-3 px-3 text-ink-700">{t.target2030}</td>
                <td className="py-3 px-3">
                  <span className={cn("chip", STATUS_BADGE[t.status])}>{STATUS_LABEL[t.status]}</span>
                </td>
                <td className="py-3 px-3 pr-0">
                  <button className="p-1 rounded hover:bg-ink-100 text-ink-400 hover:text-ink-700 opacity-0 group-hover:opacity-100 transition-opacity"><Pencil size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersTab() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-ink-500">{USERS.length} users · roles control what each person can see and do</p>
        <button className="btn-primary flex items-center gap-1.5 text-[13px]">
          <Plus size={14} /> Invite User
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-ink-100">
              {["Name", "Email", "Role", "Access Scope", "Last Login", ""].map(h => (
                <th key={h} className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider py-2 px-3 first:pl-0 last:pr-0">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50">
            {USERS.map(u => (
              <tr key={u.id} className="hover:bg-ink-50/50 group">
                <td className="py-3 px-3 pl-0 font-medium text-ink-900">{u.name}</td>
                <td className="py-3 px-3 text-ink-500">{u.email}</td>
                <td className="py-3 px-3">
                  <span className={cn("chip", u.role === "super_admin" ? "bg-brand-100 text-brand-700" : "bg-ink-100 text-ink-600")}>
                    {ROLE_LABELS[u.role]}
                  </span>
                </td>
                <td className="py-3 px-3 text-ink-600">{u.properties}</td>
                <td className="py-3 px-3 text-ink-500">{u.lastLogin}</td>
                <td className="py-3 px-3 pr-0">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 rounded hover:bg-ink-100 text-ink-400 hover:text-ink-700"><Pencil size={13} /></button>
                    <button className="p-1 rounded hover:bg-bad/10 text-ink-400 hover:text-bad"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RulesTab() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-ink-500">Data quality rules applied automatically across the portfolio</p>
        <button className="btn-primary flex items-center gap-1.5 text-[13px]">
          <Plus size={14} /> New Rule
        </button>
      </div>
      <div className="grid gap-3">
        {RULES.map(r => (
          <div key={r.id} className={cn("rounded-xl border bg-white p-4 flex items-start justify-between gap-4", r.active ? "border-ink-100" : "border-ink-100 opacity-60")}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-ink-900 text-[14px]">{r.name}</span>
                <span className={cn("chip text-[10px]", r.active ? "bg-good/10 text-good" : "bg-ink-100 text-ink-400")}>
                  {r.active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 mt-2 text-[12px] text-ink-500">
                <span><span className="font-medium text-ink-700">Scope:</span> {r.scope}</span>
                <span><span className="font-medium text-ink-700">Trigger:</span> {r.trigger}</span>
                <span><span className="font-medium text-ink-700">Action:</span> {r.action}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button className="p-1.5 rounded hover:bg-ink-100 text-ink-400 hover:text-ink-700"><Pencil size={13} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EscalationsTab() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-ink-500">Automatic alerts triggered when thresholds are breached</p>
        <button className="btn-primary flex items-center gap-1.5 text-[13px]">
          <Plus size={14} /> Add Escalation
        </button>
      </div>
      <div className="grid gap-3">
        {ESCALATIONS.map(e => (
          <div key={e.id} className="rounded-xl border border-ink-100 bg-white p-4 flex items-center gap-4">
            <div className={cn("w-2 h-2 rounded-full shrink-0", e.severity === "bad" ? "bg-bad" : e.severity === "warn" ? "bg-warn" : "bg-brand-400")} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-ink-900 text-[13px]">{e.trigger}</div>
              <div className="flex gap-4 mt-0.5 text-[12px] text-ink-500">
                <span>To: {e.recipient}</span>
                <span>Via: {e.channel}</span>
              </div>
            </div>
            <span className={cn("chip shrink-0", SEV_BADGE[e.severity])}>{SEV_LABEL[e.severity]}</span>
            <button className="p-1.5 rounded hover:bg-ink-100 text-ink-400 hover:text-ink-700 shrink-0"><Pencil size={13} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab config ────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "hotels",      label: "Hotels",        icon: Building2 },
  { key: "groups",      label: "Groups",         icon: BookOpen },
  { key: "targets",     label: "Targets",        icon: Target },
  { key: "users",       label: "Users & Access", icon: Users },
  { key: "rules",       label: "Rules",          icon: ShieldCheck },
  { key: "escalations", label: "Escalations",    icon: AlertCircle },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PortfolioSetup() {
  const [tab, setTab] = useState<Tab>("hotels");

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Portfolio Setup</h1>
        <p className="text-sm text-ink-500 mt-1">
          Configure hotels, groups, targets, user access, data rules, and escalations.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-ink-100 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
                tab === t.key
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-ink-500 hover:text-ink-800 hover:border-ink-200"
              )}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-xl border border-ink-100 p-5 shadow-sm">
        {tab === "hotels"      && <HotelsTab />}
        {tab === "groups"      && <GroupsTab />}
        {tab === "targets"     && <TargetsTab />}
        {tab === "users"       && <UsersTab />}
        {tab === "rules"       && <RulesTab />}
        {tab === "escalations" && <EscalationsTab />}
      </div>
    </div>
  );
}
