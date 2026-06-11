import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  BookOpen,
  Boxes,
  Building2,
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  Filter,
  Folder,
  Globe2,
  KeyRound,
  Layers,
  Lightbulb,
  Lock,
  Palette,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users2,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

type AdminGroup = {
  group: string;
  tiles: AdminTile[];
};

type AdminTile = {
  to: string;
  label: string;
  body: string;
  icon: any;
  iconBg: string;
  /** "Live" tiles open a real sub-page; "Coming soon" pages render a stub. */
  live?: boolean;
};

const ADMIN: AdminGroup[] = [
  {
    group: "Tenancy & branding",
    tiles: [
      { to: "/admin/clients",       label: "Clients & deployments", body: "Client list, deployment type (Direct SaaS / White-label / Sovereign), data isolation, billing entity.", icon: Building2, iconBg: "bg-brand-50 text-brand-700",       live: true },
      { to: "/admin/branding",      label: "White-label branding",  body: "Logo, colours, custom domain, email identity, report templates, module toggles.",                       icon: Palette,   iconBg: "bg-pillar-social/10 text-pillar-social" },
      { to: "/admin/users",         label: "Users & roles",          body: "Maker, Checker, Property SM and Super Admin roles, with maker–checker rights assigned per user.", icon: UserCog,  iconBg: "bg-info/10 text-info",          live: true },
    ],
  },
  {
    group: "Configuration",
    tiles: [
      { to: "/admin/property-config", label: "Property configuration", body: "Defaults, GP baseline year per property, enabled pillars, certification programmes.", icon: Layers,    iconBg: "bg-pillar-energy/10 text-pillar-energy" },
      { to: "/admin/ef-library",      label: "Emission factor library", body: "Versioned EFs by region/year. Audit-logged updates. EEIO + IPCC AR6.",                icon: Database,  iconBg: "bg-lime-50 text-lime-700",       live: true },
      { to: "/admin/gp-config",       label: "GP configuration",         body: "Composite weights, normalisation parameters, baseline-year rules.",                  icon: Sparkles,  iconBg: "bg-warn/10 text-warn" },
      { to: "/admin/pools",           label: "Comparable pools",         body: "Pool isolation per client. Filter rules: climate, star rating, size band.",          icon: Globe2,    iconBg: "bg-info/10 text-info",         live: true },
      { to: "/admin/qr",              label: "QR management",            body: "Print sheets, point assignments, deactivation, scan analytics.",                       icon: Boxes,     iconBg: "bg-pillar-waste/10 text-pillar-waste" },
      { to: "/admin/measures",        label: "Measure library",          body: "Capex measures with default impact, payback, recommended priority.",                   icon: Lightbulb, iconBg: "bg-warn/10 text-warn" },
    ],
  },
  {
    group: "Knowledge & alerts",
    tiles: [
      { to: "/admin/knowledge", label: "Knowledge base", body: "Knowledge Curator role only. Versioned articles, recommendation templates, criterion explainers.", icon: BookOpen, iconBg: "bg-brand-50 text-brand-700" },
      { to: "/admin/alerts",    label: "Alert rules",      body: "Anomaly thresholds, SLA escalations, deadline reminders, integration failures.",                  icon: Bell,     iconBg: "bg-warn/10 text-warn" },
      { to: "/admin/templates", label: "Report templates", body: "PDF/PPT/XLSX templates per framework. White-label branding overrides.",                            icon: FileText, iconBg: "bg-pillar-social/10 text-pillar-social" },
    ],
  },
  {
    group: "Connectors & access",
    tiles: [
      { to: "/admin/integrations", label: "Integrations & API keys", body: "OAuth secrets for QuickBooks/Xero/Workday. BMS receiver tokens. Outbound API consumers.", icon: KeyRound,    iconBg: "bg-pillar-gov/10 text-pillar-gov" },
      { to: "/admin/security",     label: "Security & access",        body: "SSO, MFA, IP allowlists, session settings, sovereign hosting controls.",                  icon: Lock,        iconBg: "bg-bad/10 text-bad" },
      { to: "/admin/subscriptions",label: "Subscriptions",             body: "Plans, trials, discounts, white-label licence fees, AI/OCR pass-through costs.",         icon: ReceiptText, iconBg: "bg-pillar-energy/10 text-pillar-energy" },
      { to: "/admin/audit",        label: "Platform audit log",        body: "Immutable platform-wide audit trail. Filter by user, property, action, time.",          icon: ShieldCheck, iconBg: "bg-ink-100 text-ink-700" },
    ],
  },
];

export default function Admin() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Platform management"
        title="Admin"
        subtitle="Client config, Emission factor library, pool management, white-label, billing, audit log, knowledge base content, measure library."
      />

      {ADMIN.map((g) => (
        <section key={g.group}>
          <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-500 mb-2">
            {g.group}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {g.tiles.map((t) => {
              const Icon = t.icon;
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className="card card-pad hover:shadow-pop hover:-translate-y-0.5 transition-all flex items-start gap-3"
                >
                  <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${t.iconBg}`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-bold text-ink-900">{t.label}</div>
                      {t.live ? (
                        <Badge tone="good">Available</Badge>
                      ) : (
                        <Badge tone="neutral">Soon</Badge>
                      )}
                    </div>
                    <p className="text-[12px] text-ink-500 mt-1 leading-snug">{t.body}</p>
                  </div>
                  <ChevronRight size={14} className="text-ink-300 mt-2.5" />
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      <AuditLog />

      <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 flex items-start gap-2.5">
        <Folder size={16} className="text-brand-700 mt-0.5" />
        <div className="text-[13px] text-brand-900">
          <strong>Sub-page status.</strong> Tiles labelled <em>Available</em> open a fully built admin sub-page. Tiles labelled <em>Soon</em> are on the roadmap and currently open a preview workspace with the same layout shell.
          <span className="ml-1 inline-flex items-center gap-1">
            <Users2 size={12} /> Available now: Clients · EF Library · Users &amp; Roles · Comparable Pools.
          </span>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Full Audit Log                                                       */
/* ================================================================== */

type AuditEvent = {
  ts: string;
  actor: string;
  action: string;
  target: string;
  ip: string;
  result: "success" | "fail" | "info";
};

const ALL_EVENTS: AuditEvent[] = [
  { ts: "2026-05-02 09:14", actor: "james.wilson@",    action: "Updated EF — UAE grid 2026 Q2",          target: "Emission factor library",          ip: "185.22.14.7",   result: "success" },
  { ts: "2026-05-02 08:50", actor: "priya.sharma@",    action: "Data submission approved",                target: "Skyline Dubai",    ip: "203.0.113.42",  result: "success" },
  { ts: "2026-05-02 08:41", actor: "felix.andersen@",  action: "Login",                                   target: "Session",             ip: "198.51.100.9",  result: "success" },
  { ts: "2026-05-01 16:02", actor: "platform-admin@",  action: "Activated white-label theme",             target: "Client: Aurora Hotels", ip: "10.0.0.1",    result: "success" },
  { ts: "2026-05-01 15:30", actor: "lucia.f@",         action: "Report published",                        target: "GHG Inventory 2025",  ip: "203.0.113.88",  result: "success" },
  { ts: "2026-05-01 14:22", actor: "omar.a@",          action: "Audit export downloaded",                 target: "Q1 2026",             ip: "198.51.100.44", result: "info"    },
  { ts: "2026-04-30 11:48", actor: "james.wilson@",    action: "Invited supplier",                        target: "FreshLeaf Produce",   ip: "185.22.14.7",   result: "info"    },
  { ts: "2026-04-30 10:05", actor: "sofia.e@",         action: "Login — MFA failed",                      target: "Session",             ip: "45.33.32.156",  result: "fail"    },
  { ts: "2026-04-29 17:10", actor: "platform-admin@",  action: "Rotated API key",                         target: "QuickBooks Online",   ip: "10.0.0.1",      result: "success" },
  { ts: "2026-04-29 16:44", actor: "priya.sharma@",    action: "Certification renewed — Green Globe",     target: "Skyline Dubai",    ip: "203.0.113.42",  result: "success" },
  { ts: "2026-04-29 15:00", actor: "felix.andersen@",  action: "Data submission created",                 target: "Peaks Resort Zermatt",      ip: "198.51.100.9",  result: "success" },
  { ts: "2026-04-28 13:20", actor: "lucia.f@",         action: "Record flagged for re-review",            target: "INV-2026-0441",       ip: "203.0.113.88",  result: "info"    },
  { ts: "2026-04-28 11:05", actor: "james.wilson@",    action: "Action created — BMS schedule review",    target: "Actions & Measures",  ip: "185.22.14.7",   result: "success" },
  { ts: "2026-04-27 09:30", actor: "platform-admin@",  action: "User suspended",                          target: "mark.osei@",          ip: "10.0.0.1",      result: "success" },
  { ts: "2026-04-26 16:00", actor: "omar.a@",          action: "Login",                                   target: "Session",             ip: "198.51.100.44", result: "success" },
];

const RESULT_TONE: Record<AuditEvent["result"], "good" | "bad" | "info"> = { success: "good", fail: "bad", info: "info" };
const RESULT_LABEL: Record<AuditEvent["result"], string> = { success: "Success", fail: "Failed", info: "Info" };
const PAGE_SIZE = 8;

function AuditLog() {
  const [actorFilter, setActorFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [resultFilter, setResultFilter] = useState<"" | AuditEvent["result"]>("");
  const [page, setPage] = useState(0);

  const filtered = ALL_EVENTS.filter((e) => {
    const matchActor  = !actorFilter  || e.actor.toLowerCase().includes(actorFilter.toLowerCase());
    const matchAction = !actionFilter || e.action.toLowerCase().includes(actionFilter.toLowerCase());
    const matchResult = !resultFilter || e.result === resultFilter;
    return matchActor && matchAction && matchResult;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageEvents = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function resetPage() { setPage(0); }

  return (
    <Card>
      <CardHeader title="Platform audit log" hint="Immutable · tamper-evident" />

      {/* Filters */}
      <div className="px-5 pb-3 flex items-center gap-3 flex-wrap">
        <Filter size={13} className="text-ink-400 shrink-0" />
        <input
          className="input h-8 text-[12px] w-40"
          placeholder="Filter by actor…"
          value={actorFilter}
          onChange={(e) => { setActorFilter(e.target.value); resetPage(); }}
        />
        <input
          className="input h-8 text-[12px] w-52"
          placeholder="Filter by action…"
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); resetPage(); }}
        />
        <select
          className="h-8 px-2 rounded-lg border border-ink-200 text-[12px] bg-white text-ink-700"
          value={resultFilter}
          onChange={(e) => { setResultFilter(e.target.value as "" | AuditEvent["result"]); resetPage(); }}
        >
          <option value="">All results</option>
          <option value="success">Success</option>
          <option value="fail">Failed</option>
          <option value="info">Info</option>
        </select>
        <span className="text-[11px] text-ink-400 ml-auto">{filtered.length} event{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-ink-50">
              <th className="table-th">Timestamp</th>
              <th className="table-th">Actor</th>
              <th className="table-th">Action</th>
              <th className="table-th">Target</th>
              <th className="table-th">IP</th>
              <th className="table-th">Result</th>
            </tr>
          </thead>
          <tbody>
            {pageEvents.map((e, i) => (
              <tr key={i} className="hover:bg-ink-50/60">
                <td className="table-td font-mono text-[11px] text-ink-500 whitespace-nowrap">{e.ts}</td>
                <td className="table-td text-[12px] font-medium text-ink-900">{e.actor}</td>
                <td className="table-td text-[12px] text-ink-700">{e.action}</td>
                <td className="table-td text-[12px] text-ink-600">{e.target}</td>
                <td className="table-td font-mono text-[11px] text-ink-400">{e.ip}</td>
                <td className="table-td">
                  <Badge tone={RESULT_TONE[e.result]}>{RESULT_LABEL[e.result]}</Badge>
                </td>
              </tr>
            ))}
            {pageEvents.length === 0 && (
              <tr><td colSpan={6} className="table-td text-center text-ink-400 py-6">No events match the current filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-ink-100 text-[12px] text-ink-500">
        <span>Page {page + 1} of {totalPages}</span>
        <div className="flex items-center gap-1">
          <button
            className={cn("btn-ghost h-7 w-7 p-0", page === 0 && "opacity-40 cursor-not-allowed")}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            className={cn("btn-ghost h-7 w-7 p-0", page >= totalPages - 1 && "opacity-40 cursor-not-allowed")}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </Card>
  );
}
