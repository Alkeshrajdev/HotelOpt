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
  Settings,
  Mail,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "hotels" | "groups" | "targets" | "users" | "rules" | "escalations";

// ── Mock data ────────────────────────────────────────────────────────────────

const HOTELS = [
  { id: "h1", name: "The Pavilion London",         city: "London",    country: "UK",  brand: "Flagship Collection", type: "City Hotel",   rooms: 312, gfa: 24800, status: "active",   included: true,  dataApproved: 91, pendingRecords: 2,  reportStatus: "On Track", certStatus: "Current",    exclusion: "" },
  { id: "h2", name: "Grand Harbour Lisbon",        city: "Lisbon",    country: "PT",  brand: "Grand Collection",    type: "City Hotel",   rooms: 248, gfa: 19200, status: "active",   included: true,  dataApproved: 87, pendingRecords: 5,  reportStatus: "At Risk",  certStatus: "Renew Soon", exclusion: "" },
  { id: "h3", name: "Skyline Dubai",               city: "Dubai",     country: "UAE", brand: "Skyline Hotels",      type: "Resort",       rooms: 520, gfa: 42000, status: "active",   included: true,  dataApproved: 94, pendingRecords: 1,  reportStatus: "On Track", certStatus: "Current",    exclusion: "" },
  { id: "h4", name: "Bay View Singapore",          city: "Singapore", country: "SG",  brand: "Bay Collection",      type: "City Hotel",   rooms: 410, gfa: 32500, status: "active",   included: true,  dataApproved: 82, pendingRecords: 8,  reportStatus: "At Risk",  certStatus: "Current",    exclusion: "" },
  { id: "h5", name: "The Montrose Paris",          city: "Paris",     country: "FR",  brand: "Flagship Collection", type: "Boutique",     rooms: 180, gfa: 14200, status: "active",   included: true,  dataApproved: 96, pendingRecords: 0,  reportStatus: "On Track", certStatus: "Current",    exclusion: "" },
  { id: "h6", name: "Marina Residences Barcelona", city: "Barcelona", country: "ES",  brand: "Marina Collection",   type: "Resort",       rooms: 205, gfa: 16800, status: "active",   included: true,  dataApproved: 74, pendingRecords: 12, reportStatus: "Blocked",  certStatus: "Renew Soon", exclusion: "" },
  { id: "h7", name: "Peaks Resort Zermatt",        city: "Zermatt",   country: "CH",  brand: "Mountain Collection", type: "Ski Resort",   rooms: 94,  gfa: 8400,  status: "inactive", included: false, dataApproved: 41, pendingRecords: 0,  reportStatus: "—",        certStatus: "Expired",    exclusion: "Seasonal closure — reopening Dec 2025" },
  { id: "h8", name: "Oceanfront Cape Town",        city: "Cape Town", country: "ZA",  brand: "Ocean Collection",   type: "Resort",       rooms: 168, gfa: 13600, status: "active",   included: true,  dataApproved: 88, pendingRecords: 3,  reportStatus: "On Track", certStatus: "Current",    exclusion: "" },
  { id: "h9", name: "Airport Hotel Dubai",         city: "Dubai",     country: "UAE", brand: "Skyline Hotels",      type: "Airport",      rooms: 360, gfa: 28200, status: "active",   included: true,  dataApproved: 45, pendingRecords: 18, reportStatus: "Blocked",  certStatus: "At Risk",    exclusion: "" },
  { id: "h10",name: "Riverside Bangkok",           city: "Bangkok",   country: "TH",  brand: "River Collection",    type: "City Hotel",   rooms: 220, gfa: 17400, status: "onboarding", included: false, dataApproved: 12, pendingRecords: 0, reportStatus: "—",        certStatus: "—",          exclusion: "Onboarding incomplete — missing baseline data" },
];

const GROUPS = [
  { id: "g1", name: "UAE Portfolio",       type: "Country",      hotels: 2, owner: "Layla Al-Hassan", reporting: true  },
  { id: "g2", name: "Western Europe",      type: "Region",       hotels: 3, owner: "Sophie Müller",   reporting: true  },
  { id: "g3", name: "Southern Europe",     type: "Region",       hotels: 2, owner: "Marco Rossi",     reporting: true  },
  { id: "g4", name: "Asia Pacific",        type: "Region",       hotels: 2, owner: "Jin Park",         reporting: true  },
  { id: "g5", name: "Luxury Resorts",      type: "Hotel Type",   hotels: 4, owner: "Sarah Chen",       reporting: false },
  { id: "g6", name: "Managed Properties",  type: "Ownership",    hotels: 6, owner: "Sarah Chen",       reporting: true  },
  { id: "g7", name: "Owned Properties",    type: "Ownership",    hotels: 4, owner: "Sarah Chen",       reporting: true  },
  { id: "g8", name: "Africa",              type: "Region",       hotels: 1, owner: "Thabo Nkosi",      reporting: true  },
];

const TARGETS = [
  { id: "t1", name: "Energy Intensity Reduction",  area: "Energy",     baseYear: 2019, targetYear: 2030, targetVal: "12.0 kWh / room night",   current: "18.4 kWh",  gap: "6.4 kWh", hotels: "Airport Dubai, Marina Barcelona", status: "on-track",  owner: "Sarah Chen"     },
  { id: "t2", name: "Carbon Intensity Reduction",  area: "Carbon",     baseYear: 2019, targetYear: 2030, targetVal: "1.5 kg CO₂e / room night", current: "2.9 kg",    gap: "1.4 kg",  hotels: "Bay View Singapore",             status: "on-track",  owner: "Sarah Chen"     },
  { id: "t3", name: "Water Intensity Reduction",   area: "Water",      baseYear: 2019, targetYear: 2030, targetVal: "310 L / guest night",       current: "392 L",     gap: "82 L",    hotels: "Airport Dubai, Grand Harbour",   status: "at-risk",   owner: "Marco Rossi"    },
  { id: "t4", name: "Waste Diversion Rate",        area: "Waste",      baseYear: 2019, targetYear: 2028, targetVal: "90% diverted",              current: "61%",       gap: "29%",     hotels: "Marina Barcelona, Peaks Zermatt",status: "at-risk",   owner: "Sophie Müller"  },
  { id: "t5", name: "Fair Wage Compliance",        area: "Social",     baseYear: 2022, targetYear: 2030, targetVal: "100% compliant",            current: "89%",       gap: "11%",     hotels: "Riverside Bangkok",              status: "on-track",  owner: "Jin Park"       },
  { id: "t6", name: "Policy Attestations",         area: "Governance", baseYear: 2022, targetYear: 2030, targetVal: "100% complete",             current: "85%",       gap: "15%",     hotels: "Oceanfront Cape Town",           status: "on-track",  owner: "Sarah Chen"     },
  { id: "t7", name: "Approved Data Coverage",      area: "Data",       baseYear: 2023, targetYear: 2025, targetVal: "95% every month",           current: "86%",       gap: "9%",      hotels: "Airport Dubai, Bay View",        status: "at-risk",   owner: "Layla Al-Hassan"},
  { id: "t8", name: "Hotels Certified",            area: "Certification",baseYear:2024,targetYear: 2027, targetVal: "8 of 10 hotels",            current: "6 hotels",  gap: "2 hotels","hotels": "Peaks Zermatt, Riverside Bangkok",status:"at-risk", owner: "Sarah Chen"     },
];

const USERS = [
  { id: "u1", name: "Sarah Chen",      email: "s.chen@acmehotels.com",    role: "Portfolio Admin",             groups: "All",          hotels: "All",      modules: "All",                 lastActive: "Today",      status: "active" },
  { id: "u2", name: "Marco Rossi",     email: "m.rossi@acmehotels.com",   role: "Regional Manager",            groups: "Southern EU",  hotels: "3",        modules: "Dashboard, Perf, Data", lastActive: "Yesterday",  status: "active" },
  { id: "u3", name: "Jin Park",        email: "j.park@acmehotels.com",    role: "Corporate Sustainability",    groups: "Asia Pacific", hotels: "2",        modules: "Dashboard, Perf, Reports",lastActive: "2 days ago", status: "active" },
  { id: "u4", name: "Layla Al-Hassan", email: "l.alhassan@acmehotels.com","role":"Regional Manager",           groups: "UAE Portfolio",hotels: "2",        modules: "Dashboard, Perf, Data", lastActive: "Today",      status: "active" },
  { id: "u5", name: "Sophie Müller",   email: "s.muller@acmehotels.com",  role: "Corporate Sustainability",   groups: "Western EU",   hotels: "3",        modules: "Dashboard, Perf",     lastActive: "3 days ago", status: "active" },
  { id: "u6", name: "Thabo Nkosi",     email: "t.nkosi@acmehotels.com",   role: "Regional Manager",           groups: "Africa",       hotels: "1",        modules: "Dashboard",           lastActive: "1 week ago", status: "active" },
  { id: "u7", name: "PWC Audit Team",  email: "audit@pwc.com",            role: "Auditor / Verifier",         groups: "—",            hotels: "All",      modules: "Reports, Evidence",   lastActive: "—",          status: "pending", expiresIn: "30 days" },
  { id: "u8", name: "Finance Office",  email: "finance@acmehotels.com",   role: "Finance Viewer",             groups: "All",          hotels: "All",      modules: "Reports (read-only)", lastActive: "5 days ago", status: "active" },
];

const ESCALATIONS = [
  { id: "e1", rule: "Missing monthly data",    trigger: "Data not submitted by month-end",         l1: "Property Manager",   l2: "Group Lead",      l3: "Portfolio Admin",  delay1: "Day 1",  delay2: "Day 3",  delay3: "Day 7",  active: true  },
  { id: "e2", rule: "Overdue approval",         trigger: "Record waiting review > 3 days",          l1: "Checker",            l2: "Group Lead",      l3: "Portfolio Admin",  delay1: "Day 3",  delay2: "Day 7",  delay3: "Day 14", active: true  },
  { id: "e3", rule: "Outlier flagged",          trigger: ">30% spike not reviewed within 48 hrs",   l1: "Checker",            l2: "Group Lead",      l3: "—",                delay1: "48 hrs", delay2: "5 days", delay3: "—",      active: true  },
  { id: "e4", rule: "Evidence gap",            trigger: "Cert evidence gap open > 14 days",         l1: "Property Manager",   l2: "Corporate SM",    l3: "Portfolio Admin",  delay1: "14 days",delay2: "21 days",delay3: "30 days",active: true  },
  { id: "e5", rule: "Report blocker",          trigger: "Report blocked < 21 days before deadline", l1: "Corporate SM",       l2: "Portfolio Admin", l3: "—",                delay1: "21 days",delay2: "14 days",delay3: "—",      active: true  },
  { id: "e6", rule: "Certification renewal",   trigger: "Cert due for renewal in < 60 days",        l1: "Property Manager",   l2: "Corporate SM",    l3: "—",                delay1: "60 days",delay2: "30 days",delay3: "—",      active: true  },
  { id: "e7", rule: "Supplier non-response",   trigger: "Supplier data request > 14 days unanswered",l1:"Property Manager",  l2: "Corporate SM",    l3: "—",                delay1: "14 days",delay2: "28 days",delay3: "—",      active: false },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const AREA_COLOUR: Record<string, string> = {
  Energy: "text-pillar-energy", Carbon: "text-pillar-carbon", Water: "text-pillar-water",
  Waste: "text-pillar-waste", Social: "text-pillar-social", Governance: "text-pillar-gov",
  Data: "text-info", Certification: "text-brand-600",
};

const STATUS_BADGE: Record<string, string> = {
  "on-track": "bg-good/10 text-good", "at-risk": "bg-warn/10 text-warn", "off-track": "bg-bad/10 text-bad",
};
const STATUS_LABEL: Record<string, string> = { "on-track": "On Track", "at-risk": "At Risk", "off-track": "Off Track" };

const REPORT_BADGE: Record<string, string> = {
  "On Track": "bg-good/10 text-good", "At Risk": "bg-warn/10 text-warn",
  "Blocked": "bg-bad/10 text-bad", "—": "bg-ink-100 text-ink-400",
};

const CERT_BADGE: Record<string, string> = {
  "Current": "bg-good/10 text-good", "Renew Soon": "bg-warn/10 text-warn",
  "Expired": "bg-bad/10 text-bad", "At Risk": "bg-warn/10 text-warn", "—": "bg-ink-100 text-ink-400",
};

// ── Tab: Hotels ───────────────────────────────────────────────────────────────

function HotelsTab() {
  const included = HOTELS.filter(h => h.included).length;
  const ready    = HOTELS.filter(h => h.included && h.dataApproved >= 80).length;
  const missing  = HOTELS.filter(h => h.included && h.dataApproved < 80).length;
  const gaps     = HOTELS.filter(h => h.included && h.certStatus !== "Current" && h.certStatus !== "—").length;

  return (
    <div className="space-y-4">
      {/* Readiness summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Hotels in portfolio", val: included, colour: "text-ink-900" },
          { label: "Ready for reporting",  val: ready,    colour: "text-good"    },
          { label: "Missing data",         val: missing,  colour: "text-warn"    },
          { label: "Evidence gaps",        val: gaps,     colour: "text-warn"    },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-ink-100 bg-ink-50 p-3 text-center">
            <div className={cn("text-2xl font-extrabold", s.colour)}>{s.val}</div>
            <div className="text-[11px] text-ink-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">{HOTELS.length} hotels · {included} included in portfolio</p>
        <button className="btn-primary flex items-center gap-1.5 text-[13px]"><Plus size={14} /> Add Hotels to Portfolio</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-ink-100">
              {["Hotel", "Brand / Type", "Country", "Rooms", "GFA m²", "Approved %", "Pending", "Reports", "Certification", "In Portfolio", ""].map(h => (
                <th key={h} className="text-left text-[10px] font-semibold text-ink-400 uppercase tracking-wider py-2 px-2 first:pl-0 last:pr-0 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50">
            {HOTELS.map(h => (
              <tr key={h.id} className="hover:bg-ink-50/50 group">
                <td className="py-2.5 px-2 pl-0">
                  <Link to={`/properties/${h.id}`} className="font-medium text-ink-900 hover:text-brand-600 flex items-center gap-1 whitespace-nowrap">
                    {h.name} <ChevronRight size={11} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                  </Link>
                </td>
                <td className="py-2.5 px-2 text-ink-500">
                  <div className="text-[11px]">{h.brand}</div>
                  <div className="text-[10px] text-ink-400">{h.type}</div>
                </td>
                <td className="py-2.5 px-2 text-ink-500 whitespace-nowrap">{h.city}, {h.country}</td>
                <td className="py-2.5 px-2 text-ink-700 tabular-nums">{h.rooms.toLocaleString()}</td>
                <td className="py-2.5 px-2 text-ink-500 tabular-nums">{h.gfa.toLocaleString()}</td>
                <td className="py-2.5 px-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-12 h-1.5 rounded-full bg-ink-100 overflow-hidden">
                      <div className={cn("h-full rounded-full", h.dataApproved >= 80 ? "bg-good" : h.dataApproved >= 60 ? "bg-warn" : "bg-bad")} style={{ width: `${h.dataApproved}%` }} />
                    </div>
                    <span className={cn("font-semibold tabular-nums", h.dataApproved >= 80 ? "text-good" : h.dataApproved >= 60 ? "text-warn" : "text-bad")}>{h.dataApproved}%</span>
                  </div>
                </td>
                <td className="py-2.5 px-2 text-ink-500 tabular-nums">{h.pendingRecords > 0 ? <span className="text-warn font-medium">{h.pendingRecords}</span> : <span className="text-ink-300">—</span>}</td>
                <td className="py-2.5 px-2">
                  <span className={cn("chip text-[10px]", REPORT_BADGE[h.reportStatus])}>{h.reportStatus}</span>
                </td>
                <td className="py-2.5 px-2">
                  <span className={cn("chip text-[10px]", CERT_BADGE[h.certStatus])}>{h.certStatus}</span>
                </td>
                <td className="py-2.5 px-2">
                  {h.included ? (
                    <span className="chip bg-good/10 text-good text-[10px]">Yes</span>
                  ) : (
                    <div>
                      <span className="chip bg-ink-100 text-ink-400 text-[10px]">No</span>
                      {h.exclusion && <div className="text-[10px] text-ink-400 mt-0.5 max-w-[140px] leading-snug">{h.exclusion}</div>}
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-2 pr-0">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 rounded hover:bg-ink-100 text-ink-400 hover:text-ink-700"><Pencil size={12} /></button>
                    <button className="p-1 rounded hover:bg-bad/10 text-ink-400 hover:text-bad"><Trash2 size={12} /></button>
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

// ── Tab: Groups ───────────────────────────────────────────────────────────────

const GROUP_TYPES = ["All", "Region", "Country", "Hotel Type", "Ownership", "Custom"];

function GroupsTab() {
  const [filter, setFilter] = useState("All");
  const visible = filter === "All" ? GROUPS : GROUPS.filter(g => g.type === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1">
          {GROUP_TYPES.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={cn("px-3 py-1 rounded-lg text-[12px] font-medium transition-colors",
                filter === t ? "bg-brand-700 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200")}>
              {t}
            </button>
          ))}
        </div>
        <button className="btn-primary flex items-center gap-1.5 text-[13px]"><Plus size={14} /> New Group</button>
      </div>
      <div className="grid gap-3">
        {visible.map(g => (
          <div key={g.id} className="rounded-xl border border-ink-100 bg-white p-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-ink-900 text-[14px]">{g.name}</span>
                <span className="chip bg-ink-100 text-ink-500 text-[10px]">{g.type}</span>
                {g.reporting && <span className="chip bg-brand-100 text-brand-700 text-[10px]">Reporting enabled</span>}
              </div>
              <div className="flex gap-4 mt-1 text-[12px] text-ink-500">
                <span>{g.hotels} hotel{g.hotels !== 1 ? "s" : ""}</span>
                <span>Owner: {g.owner}</span>
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

// ── Tab: Targets ──────────────────────────────────────────────────────────────

function TargetsTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">Portfolio-level targets · intensity metrics use total ÷ total room nights</p>
        <button className="btn-primary flex items-center gap-1.5 text-[13px]"><Plus size={14} /> Add Target</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-ink-100">
              {["Target", "Area", "Baseline", "Target Year", "Target Value", "Current", "Gap", "Hotels Driving Gap", "Status", "Owner", ""].map(h => (
                <th key={h} className="text-left text-[10px] font-semibold text-ink-400 uppercase tracking-wider py-2 px-2 first:pl-0 last:pr-0 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50">
            {TARGETS.map(t => (
              <tr key={t.id} className="hover:bg-ink-50/50 group cursor-pointer">
                <td className="py-3 px-2 pl-0 font-medium text-ink-900 max-w-[160px]">{t.name}</td>
                <td className="py-3 px-2">
                  <span className={cn("text-[11px] font-semibold", AREA_COLOUR[t.area])}>{t.area}</span>
                </td>
                <td className="py-3 px-2 text-ink-500 tabular-nums">{t.baseYear}</td>
                <td className="py-3 px-2 text-ink-500 tabular-nums">{t.targetYear}</td>
                <td className="py-3 px-2 text-ink-700 font-medium whitespace-nowrap">{t.targetVal}</td>
                <td className="py-3 px-2 font-semibold text-ink-900 tabular-nums whitespace-nowrap">{t.current}</td>
                <td className="py-3 px-2">
                  <span className={cn("chip text-[10px]", STATUS_BADGE[t.status])}>{t.gap}</span>
                </td>
                <td className="py-3 px-2 text-ink-500 text-[11px] max-w-[160px]">{t.hotels}</td>
                <td className="py-3 px-2">
                  <span className={cn("chip text-[10px]", STATUS_BADGE[t.status])}>{STATUS_LABEL[t.status]}</span>
                </td>
                <td className="py-3 px-2 text-ink-500 whitespace-nowrap">{t.owner}</td>
                <td className="py-3 px-2 pr-0">
                  <button className="p-1 rounded hover:bg-ink-100 text-ink-400 hover:text-ink-700 opacity-0 group-hover:opacity-100 transition-opacity"><Pencil size={12} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab: Users ────────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, string> = {
  "Portfolio Admin": "bg-brand-100 text-brand-700",
  "Corporate Sustainability": "bg-pillar-energy/10 text-pillar-energy",
  "Regional Manager": "bg-pillar-water/10 text-pillar-water",
  "Corporate Viewer": "bg-ink-100 text-ink-600",
  "Auditor / Verifier": "bg-warn/10 text-warn",
  "Finance Viewer": "bg-ink-100 text-ink-500",
};

function UsersTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">{USERS.length} users · roles control view, edit, and approval rights per module</p>
        <button className="btn-primary flex items-center gap-1.5 text-[13px]"><Plus size={14} /> Invite User</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-ink-100">
              {["Name", "Email", "Role", "Groups", "Hotels", "Modules", "Last Active", "Status", ""].map(h => (
                <th key={h} className="text-left text-[10px] font-semibold text-ink-400 uppercase tracking-wider py-2 px-2 first:pl-0 last:pr-0 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50">
            {USERS.map(u => (
              <tr key={u.id} className="hover:bg-ink-50/50 group">
                <td className="py-2.5 px-2 pl-0 font-medium text-ink-900 whitespace-nowrap">{u.name}</td>
                <td className="py-2.5 px-2 text-ink-500">{u.email}</td>
                <td className="py-2.5 px-2">
                  <span className={cn("chip text-[10px]", ROLE_BADGE[u.role] ?? "bg-ink-100 text-ink-500")}>{u.role}</span>
                </td>
                <td className="py-2.5 px-2 text-ink-500">{u.groups}</td>
                <td className="py-2.5 px-2 text-ink-600">{u.hotels}</td>
                <td className="py-2.5 px-2 text-ink-500 max-w-[160px] text-[11px]">{u.modules}</td>
                <td className="py-2.5 px-2 text-ink-500 whitespace-nowrap">{u.lastActive}</td>
                <td className="py-2.5 px-2">
                  <div>
                    <span className={cn("chip text-[10px]", u.status === "active" ? "bg-good/10 text-good" : "bg-warn/10 text-warn")}>
                      {u.status === "active" ? "Active" : "Pending"}
                    </span>
                    {(u as any).expiresIn && <div className="text-[10px] text-warn mt-0.5">Expires {(u as any).expiresIn}</div>}
                  </div>
                </td>
                <td className="py-2.5 px-2 pr-0">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 rounded hover:bg-ink-100 text-ink-400 hover:text-ink-700"><Pencil size={12} /></button>
                    <button className="p-1 rounded hover:bg-bad/10 text-ink-400 hover:text-bad"><Trash2 size={12} /></button>
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

// ── Tab: Rules ────────────────────────────────────────────────────────────────

type ToggleFieldProps = { label: string; hint: string; value: boolean; onChange: (v: boolean) => void };
function ToggleField({ label, hint, value, onChange }: ToggleFieldProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-ink-50 last:border-0">
      <div>
        <div className="text-[13px] font-medium text-ink-900">{label}</div>
        <div className="text-[11px] text-ink-500 mt-0.5">{hint}</div>
      </div>
      <button onClick={() => onChange(!value)} className="shrink-0 mt-0.5">
        {value
          ? <ToggleRight size={24} className="text-brand-600" />
          : <ToggleLeft  size={24} className="text-ink-300" />
        }
      </button>
    </div>
  );
}

function RulesTab() {
  const [currency, setCurrency]         = useState("EUR");
  const [reportYear, setReportYear]     = useState("2024");
  const [period, setPeriod]             = useState("Calendar Year");
  const [unitEnergy, setUnitEnergy]     = useState("kWh");
  const [unitWater, setUnitWater]       = useState("Litres");
  const [unitWaste, setUnitWaste]       = useState("kg");
  const [unitCarbon, setUnitCarbon]     = useState("kg CO₂e");
  const [approvedOnly, setApprovedOnly] = useState(true);
  const [provisional, setProvisional]   = useState(false);
  const [exclusionRequired, setExclusionRequired] = useState(true);
  const [minApproval, setMinApproval]   = useState("80");
  const [minCompleteness, setMinCompleteness] = useState("75");
  const [groupingLogic, setGroupingLogic] = useState("Region");

  return (
    <div className="max-w-2xl space-y-8">
      {/* Reporting */}
      <section>
        <h3 className="text-[12px] font-bold uppercase tracking-wider text-ink-400 mb-3">Reporting Settings</h3>
        <div className="bg-ink-50 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] font-medium text-ink-600">Reporting Currency</span>
              <select className="input mt-1 text-[13px]" value={currency} onChange={e => setCurrency(e.target.value)}>
                {["EUR", "USD", "GBP", "AED", "SGD"].map(c => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-ink-600">Reporting Year</span>
              <select className="input mt-1 text-[13px]" value={reportYear} onChange={e => setReportYear(e.target.value)}>
                {["2024", "2023", "2022"].map(y => <option key={y}>{y}</option>)}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-[11px] font-medium text-ink-600">Default Period</span>
            <select className="input mt-1 text-[13px]" value={period} onChange={e => setPeriod(e.target.value)}>
              {["Calendar Year", "Financial Year (Apr–Mar)", "Rolling 12 Months", "Custom"].map(p => <option key={p}>{p}</option>)}
            </select>
          </label>
        </div>
      </section>

      {/* Data basis */}
      <section>
        <h3 className="text-[12px] font-bold uppercase tracking-wider text-ink-400 mb-3">Data Basis</h3>
        <div className="bg-ink-50 rounded-xl p-4">
          <ToggleField label="Approved data only (default)" hint="KPIs and reports use approved records only. Pending and draft submissions are excluded." value={approvedOnly} onChange={setApprovedOnly} />
          <ToggleField label="Include provisional data" hint="When enabled, provisional data is included in KPIs but clearly labelled. Requires explicit toggle per report." value={provisional} onChange={setProvisional} />
          <ToggleField label="Require exclusion reason" hint="When a hotel is excluded from the portfolio, a reason must be provided." value={exclusionRequired} onChange={setExclusionRequired} />
        </div>
      </section>

      {/* Thresholds */}
      <section>
        <h3 className="text-[12px] font-bold uppercase tracking-wider text-ink-400 mb-3">Reporting Thresholds</h3>
        <div className="bg-ink-50 rounded-xl p-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] font-medium text-ink-600">Min. approved data for reporting</span>
            <div className="flex items-center gap-2 mt-1">
              <input type="number" className="input text-[13px]" value={minApproval} onChange={e => setMinApproval(e.target.value)} min={0} max={100} />
              <span className="text-ink-500 text-[13px]">%</span>
            </div>
          </label>
          <label className="block">
            <span className="text-[11px] font-medium text-ink-600">Min. data completeness threshold</span>
            <div className="flex items-center gap-2 mt-1">
              <input type="number" className="input text-[13px]" value={minCompleteness} onChange={e => setMinCompleteness(e.target.value)} min={0} max={100} />
              <span className="text-ink-500 text-[13px]">%</span>
            </div>
          </label>
        </div>
      </section>

      {/* Units */}
      <section>
        <h3 className="text-[12px] font-bold uppercase tracking-wider text-ink-400 mb-3">Unit Preferences</h3>
        <div className="bg-ink-50 rounded-xl p-4 grid grid-cols-2 gap-3">
          {[
            { label: "Energy", val: unitEnergy, set: setUnitEnergy, options: ["kWh", "MWh", "GJ"] },
            { label: "Water",  val: unitWater,  set: setUnitWater,  options: ["Litres", "m³"] },
            { label: "Waste",  val: unitWaste,  set: setUnitWaste,  options: ["kg", "tonnes"] },
            { label: "Carbon", val: unitCarbon, set: setUnitCarbon, options: ["kg CO₂e", "tCO₂e"] },
          ].map(f => (
            <label key={f.label} className="block">
              <span className="text-[11px] font-medium text-ink-600">{f.label}</span>
              <select className="input mt-1 text-[13px]" value={f.val} onChange={e => f.set(e.target.value)}>
                {f.options.map(o => <option key={o}>{o}</option>)}
              </select>
            </label>
          ))}
        </div>
      </section>

      {/* Grouping */}
      <section>
        <h3 className="text-[12px] font-bold uppercase tracking-wider text-ink-400 mb-3">Hotel Grouping</h3>
        <div className="bg-ink-50 rounded-xl p-4">
          <label className="block">
            <span className="text-[11px] font-medium text-ink-600">Default grouping logic for dashboard filters</span>
            <select className="input mt-1 text-[13px]" value={groupingLogic} onChange={e => setGroupingLogic(e.target.value)}>
              {["Region", "Country", "Brand", "Hotel Type", "Ownership", "Custom Group"].map(o => <option key={o}>{o}</option>)}
            </select>
          </label>
        </div>
      </section>

      <button className="btn-primary">Save Settings</button>
    </div>
  );
}

// ── Tab: Escalations ──────────────────────────────────────────────────────────

function EscalationsTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">Automatic escalation rules — each rule has up to 3 escalation levels</p>
        <button className="btn-primary flex items-center gap-1.5 text-[13px]"><Plus size={14} /> Add Rule</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-ink-100">
              {["Escalation Rule", "Trigger Condition", "Level 1 · Delay", "Level 2 · Delay", "Level 3 · Delay", "Active", ""].map(h => (
                <th key={h} className="text-left text-[10px] font-semibold text-ink-400 uppercase tracking-wider py-2 px-2 first:pl-0 last:pr-0 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50">
            {ESCALATIONS.map(e => (
              <tr key={e.id} className={cn("hover:bg-ink-50/50 group", !e.active && "opacity-50")}>
                <td className="py-3 px-2 pl-0 font-medium text-ink-900 whitespace-nowrap">{e.rule}</td>
                <td className="py-3 px-2 text-ink-500 max-w-[200px]">{e.trigger}</td>
                <td className="py-3 px-2">
                  <div className="text-ink-800 font-medium text-[11px]">{e.l1}</div>
                  <div className="text-ink-400 text-[10px]">{e.delay1}</div>
                </td>
                <td className="py-3 px-2">
                  {e.l2 !== "—" ? (
                    <>
                      <div className="text-ink-800 font-medium text-[11px]">{e.l2}</div>
                      <div className="text-ink-400 text-[10px]">{e.delay2}</div>
                    </>
                  ) : <span className="text-ink-300">—</span>}
                </td>
                <td className="py-3 px-2">
                  {e.l3 !== "—" ? (
                    <>
                      <div className="text-ink-800 font-medium text-[11px]">{e.l3}</div>
                      <div className="text-ink-400 text-[10px]">{e.delay3}</div>
                    </>
                  ) : <span className="text-ink-300">—</span>}
                </td>
                <td className="py-3 px-2">
                  <span className={cn("chip text-[10px]", e.active ? "bg-good/10 text-good" : "bg-ink-100 text-ink-400")}>{e.active ? "Active" : "Off"}</span>
                </td>
                <td className="py-3 px-2 pr-0">
                  <button className="p-1 rounded hover:bg-ink-100 text-ink-400 hover:text-ink-700 opacity-0 group-hover:opacity-100 transition-opacity"><Pencil size={12} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab config ────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "hotels",      label: "Hotels",        icon: Building2   },
  { key: "groups",      label: "Groups",         icon: BookOpen    },
  { key: "targets",     label: "Targets",        icon: Target      },
  { key: "users",       label: "Users & Access", icon: Users       },
  { key: "rules",       label: "Rules",          icon: Settings    },
  { key: "escalations", label: "Escalations",    icon: AlertCircle },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PortfolioSetup() {
  const [tab, setTab] = useState<Tab>("hotels");

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Portfolio Setup</h1>
        <p className="text-sm text-ink-500 mt-1">
          Manage portfolio hotels, groups, targets, users, reporting rules, and escalation settings.
        </p>
      </div>

      <div className="flex gap-1 border-b border-ink-100 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
                tab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-ink-500 hover:text-ink-800 hover:border-ink-200"
              )}>
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

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
