import { Fragment, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Droplet,
  Edit3,
  ExternalLink,
  Globe,
  History,
  MapPin,
  PowerOff,
  QrCode,
  Recycle,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import ReadinessChecklist from "@/components/properties/ReadinessChecklist";
import InfoHint from "@/components/ui/InfoHint";
import { GLOSSARY } from "@/components/ui/Abbr";
import {
  CERTIFICATIONS,
  PROPERTY_CERT_READINESS,
  findProperty,
  getAssignedUsers,
  getAttributeHistory,
  getQrPoints,
  type RichProperty,
} from "@/lib/propertiesData";
import type { PillarKey } from "@/pages/performance/Shell";
import GenuinePerformancePanel from "@/components/properties/GenuinePerformancePanel";
import DataReadinessPanel from "@/components/properties/DataReadinessPanel";
import { useAccount } from "@/lib/account";
import { cn } from "@/lib/utils";

type TabKey =
  | "overview"
  | "configuration"
  | "users"
  | "data-readiness"
  | "gp"
  | "certifications"
  | "qr"
  | "history";

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "overview",       label: "Overview",        icon: Building2 },
  { key: "configuration",  label: "Configuration",   icon: Settings },
  { key: "users",          label: "Users",           icon: Users },
  { key: "data-readiness", label: "Data Readiness",  icon: BarChart3 },
  { key: "gp",             label: "Genuine Performance", icon: Sparkles },
  { key: "certifications", label: "Certifications",  icon: ShieldCheck },
  { key: "qr",             label: "QR Points",       icon: QrCode },
  { key: "history",        label: "Audit History",   icon: History },
];

const TAB_KEYS = TABS.map((t) => t.key);

export default function PropertyDetail() {
  const { propertyId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = (searchParams.get("tab") as TabKey) || "overview";
  const tab: TabKey = TAB_KEYS.includes(tabParam) ? tabParam : "overview";
  const [editOpen, setEditOpen] = useState(false);

  const setTab = (k: TabKey) => {
    searchParams.set("tab", k);
    setSearchParams(searchParams);
  };

  const property = findProperty(propertyId);
  if (!property) return <Navigate to="/properties" replace />;

  const { account } = useAccount();
  const setupReady = property.dataCompleteness >= 80 && property.gpReady;

  return (
    <div className="space-y-5">
      {account.accountType === "portfolio" ? (
        <div className="flex items-center text-[12px] text-ink-500 gap-1.5 mb-1">
          <Link to="/properties" className="hover:text-brand-700 inline-flex items-center gap-1">
            <ArrowLeft size={12} /> All properties
          </Link>
          <span>/</span>
          <span>{property.name}</span>
        </div>
      ) : (
        <div className="text-[12px] font-medium text-ink-400 mb-1">My Hotel</div>
      )}

      <PageHeader
        eyebrow={`${property.region} · ${property.country}`}
        title={property.name}
        subtitle={`${property.brand} · ${property.city} · ${property.rooms.toLocaleString()} rooms · GFA ${property.gfa.toLocaleString()} m²`}
        actions={
          <>
            <Link
              to={`/performance/energy/overview?property=${property.id}`}
              className="btn-secondary"
            >
              <BarChart3 size={14} /> Open Energy Dashboard
            </Link>
            <button className="btn-secondary" onClick={() => setEditOpen(true)}>
              <Edit3 size={14} /> Edit configuration
            </button>
            <button className="btn bg-bad text-white hover:bg-red-700">
              <PowerOff size={14} /> Deactivate
            </button>
          </>
        }
      />

      {/* Hero strip — setup & readiness (this page is a configuration hub) */}
      <Card>
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <HeroStat label="Setup status"      value={setupReady ? "Ready" : "In progress"} info="Master data, baseline year, users and evidence complete enough to start reporting." tone={setupReady ? "good" : "warn"} />
          <HeroStat label="Data completeness" value={`${property.dataCompleteness}%`} tone={property.dataCompleteness >= 80 ? "good" : property.dataCompleteness >= 60 ? "warn" : "bad"} />
          <HeroStat label="GP readiness"      value={property.gpReady ? "Ready" : "Not yet"} info={GLOSSARY.GP} tone={property.gpReady ? "good" : "warn"} />
          <HeroStat label="Certifications"    value={`${property.certifications.length} active`} tone={property.certStatus === "ready" ? "good" : "info"} />
        </div>
      </Card>

      {/* Setup Health summary card */}
      <SetupHealthCard property={property} />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-ink-200 overflow-x-auto -mt-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors -mb-px border-b-2",
                isActive
                  ? "text-ink-900 border-brand-700"
                  : "text-ink-500 hover:text-ink-900 border-transparent"
              )}
            >
              <Icon size={14} className={isActive ? "text-brand-700" : "text-ink-400"} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab body */}
      {tab === "overview"        && <OverviewTab       property={property} />}
      {tab === "configuration"   && <ConfigurationTab  property={property} onEdit={() => setEditOpen(true)} />}
      {tab === "users"           && <UsersTab          property={property} />}
      {tab === "data-readiness"  && <DataReadinessTab  property={property} />}
      {tab === "gp"              && <GPSetupTab        property={property} />}
      {tab === "certifications"  && <CertificationsTab property={property} />}
      {tab === "qr"              && <QrPointsTab       property={property} />}
      {tab === "history"         && <AuditHistoryTab   property={property} />}

      <EditConfigModal property={property} open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
}

/* ============================================================== */
/* TAB 1 — Overview                                               */
/* ============================================================== */

function OverviewTab({ property }: { property: RichProperty }) {
  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12 lg:col-span-7">
        <CardHeader title="Identity & location" />
        <div className="p-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Row label="Brand" value={property.brand} />
          <Row label="Portfolio" value={property.client} />
          <Row label="Address" full value={property.address} />
          <Row label="City" value={property.city} />
          <Row label="Country" value={property.country} />
          <Row label="GPS" value={`${property.latitude.toFixed(4)}, ${property.longitude.toFixed(4)}`} />
          <Row label="Timezone" value={property.timezone} />
          <Row label="Currency" value={property.currency} />
        </div>
      </Card>

      <Card className="col-span-12 lg:col-span-5">
        <CardHeader title="Operations" />
        <div className="p-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Row label="Operation type" value={property.operationType.replace("-", " ")} />
          <Row label="Ownership" value={property.ownership} />
          <Row label="Star rating" value={"★".repeat(property.starRating)} />
          <Row label="Building year" value={String(property.buildingYear)} />
          <Row label="F&B outlets" value={String(property.fbOutlets)} />
          <Row label="F&B covers (annual)" value={property.fbCoversAnnual.toLocaleString()} />
          <Row label="Laundry" value={property.laundryType} />
          <Row label="Pool / spa" value={`${property.poolCount} / ${property.spaCount}`} />
        </div>
      </Card>

      <Card className="col-span-12">
        <CardHeader title="Reporting" />
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <Row label="GP baseline" value={String(property.baselineYear)} />
          <Row label="Reporting year" value={String(property.reportingYear)} />
          <Row
            label="Enabled pillars"
            value={
              <PillarBadges pillars={property.enabledPillars} />
            }
            full={false}
          />
          <Row
            label="Pool eligibility"
            value={
              property.poolEligible ? (
                <Badge tone="good">Eligible</Badge>
              ) : (
                <Badge tone="warn">Not yet</Badge>
              )
            }
          />
        </div>
      </Card>

      {property.poolReason && (
        <Card className="col-span-12 bg-warn/10 border-warn/25">
          <div className="p-5 text-sm text-warn">
            <strong>External comparison gate:</strong> {property.poolReason}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ============================================================== */
/* TAB 2 — Configuration (editable form)                          */
/* ============================================================== */

function ConfigurationTab({ property, onEdit }: { property: RichProperty; onEdit: () => void }) {
  return (
    <Card>
      <CardHeader
        title="Configuration"
        hint="Editing any GP-affecting attribute is logged to the attribute history with effective date and reason."
        right={<button className="btn-primary" onClick={onEdit}><Edit3 size={14} /> Edit configuration</button>}
      />
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title="Identity">
          <Field label="Property name" value={property.name} />
          <Field label="Brand" value={property.brand} />
          <Field label="Portfolio / client" value={property.client} />
        </Section>
        <Section title="Location">
          <Field label="Region" value={property.region} />
          <Field label="Country" value={property.country} />
          <Field label="City" value={property.city} />
          <Field label="Address" value={property.address} />
          <Field label="GPS" value={`${property.latitude}, ${property.longitude}`} />
          <Field label="Timezone" value={property.timezone} />
          <Field label="Currency" value={property.currency} />
        </Section>
        <Section title="Physical">
          <Field label="Star rating" value={"★".repeat(property.starRating)} />
          <Field label="Rooms" value={property.rooms.toLocaleString()} />
          <Field label="GFA (m²)" value={property.gfa.toLocaleString()} />
          <Field label="Building year" value={String(property.buildingYear)} />
          <Field label="F&B outlets" value={String(property.fbOutlets)} />
          <Field label="F&B covers" value={property.fbCoversAnnual.toLocaleString()} />
          <Field label="Laundry" value={property.laundryType} />
          <Field label="Pool / spa" value={`${property.poolCount} / ${property.spaCount}`} />
        </Section>
        <Section title="Operations">
          <Field label="Operation type" value={property.operationType.replace("-", " ")} />
          <Field label="Ownership" value={property.ownership} />
        </Section>
      </div>
    </Card>
  );
}

/* ============================================================== */
/* TAB 3 — Users                                                  */
/* ============================================================== */

const ROLE_ACCESS_SUMMARY = [
  { role: "Ground Staff / Maker", access: "Data capture only — submit readings, cannot approve" },
  { role: "Checker / Property SM", access: "Review & approve — full data quality workflow" },
  { role: "General Manager", access: "Dashboard view & escalation — read-only on approvals" },
  { role: "Auditor", access: "Read-only across all modules — no write access" },
  { role: "Super Admin", access: "Full access — configuration, users, billing" },
];

function UsersTab({ property }: { property: RichProperty }) {
  const users = getAssignedUsers(property.id);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Assigned users"
          hint="Super Admin and Client Admin can grant property-level access."
          right={<button className="btn-primary">+ Assign user</button>}
        />
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Name</th>
                <th className="table-th">Email</th>
                <th className="table-th">Role</th>
                <th className="table-th">Access level</th>
                <th className="table-th">Maker / Checker</th>
                <th className="table-th">MFA</th>
                <th className="table-th">Status</th>
                <th className="table-th">Last active</th>
                <th className="table-th text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-ink-50/60">
                  <td className="table-td font-medium text-ink-900">{u.name}</td>
                  <td className="table-td text-ink-600">{u.email}</td>
                  <td className="table-td">
                    <Badge tone={u.role === "super_admin" ? "brand" : u.role === "checker" || u.role === "property_sm" ? "info" : "neutral"}>
                      {u.role.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="table-td">
                    <Badge tone={u.accessLevel === "portfolio" ? "brand" : u.accessLevel === "region" ? "info" : "neutral"}>
                      {u.accessLevel}
                    </Badge>
                  </td>
                  <td className="table-td">
                    <Badge tone={u.makerCheckerRights === "both" ? "good" : u.makerCheckerRights === "none" ? "neutral" : "info"}>
                      {u.makerCheckerRights}
                    </Badge>
                  </td>
                  <td className="table-td">
                    {u.mfaEnabled ? (
                      <span className="inline-flex items-center gap-1 text-[12px] text-good font-semibold"><CheckCircle2 size={13} /> On</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[12px] text-warn font-semibold"><AlertTriangle size={13} /> Off</span>
                    )}
                  </td>
                  <td className="table-td">
                    <Badge tone={u.status === "active" ? "good" : "neutral"}>{u.status}</Badge>
                  </td>
                  <td className="table-td text-ink-500">{u.lastActive}</td>
                  <td className="table-td text-right pr-6">
                    <button className="btn-ghost h-7 px-2 text-[12px] text-brand-700">Manage</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="Role-based access summary" hint="Permissions are enforced server-side — this table is for reference" />
        <div className="p-6">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Role</th>
                <th className="table-th">Default access</th>
              </tr>
            </thead>
            <tbody>
              {ROLE_ACCESS_SUMMARY.map((r) => (
                <tr key={r.role} className="hover:bg-ink-50/60">
                  <td className="table-td font-medium text-ink-900">{r.role}</td>
                  <td className="table-td text-ink-600">{r.access}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================== */
/* TAB 4 — Data Readiness (all 6 pillars, 4 dimensions)          */
/* ============================================================== */

const PILLAR_READINESS: Record<PillarKey, { completeness: number; timeliness: number; evidenceMatch: number; approvalRate: number }> = {
  energy:     { completeness: 96, timeliness: 88, evidenceMatch: 91, approvalRate: 94 },
  water:      { completeness: 89, timeliness: 82, evidenceMatch: 84, approvalRate: 90 },
  waste:      { completeness: 78, timeliness: 74, evidenceMatch: 70, approvalRate: 82 },
  carbon:     { completeness: 72, timeliness: 65, evidenceMatch: 68, approvalRate: 76 },
  social:     { completeness: 60, timeliness: 55, evidenceMatch: 52, approvalRate: 64 },
  governance: { completeness: 85, timeliness: 80, evidenceMatch: 88, approvalRate: 92 },
};

function DimBar({ label, value }: { label: string; value: number }) {
  const tone = value >= 80 ? "bg-good" : value >= 60 ? "bg-warn" : "bg-bad";
  const textTone = value >= 80 ? "text-good" : value >= 60 ? "text-warn" : "text-bad";
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-28 text-ink-500 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-ink-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${value}%` }} />
      </div>
      <span className={cn("w-8 text-right font-semibold tabular-nums", textTone)}>{value}%</span>
    </div>
  );
}

function DataReadinessTab({ property }: { property: RichProperty }) {
  const bias = property.dataCompleteness;
  const pillars: PillarKey[] = ["energy", "water", "waste", "carbon", "social", "governance"];

  return (
    <div className="space-y-5">
      {/* Primary — monthly tracker + anomaly detection */}
      <DataReadinessPanel propertyName={property.name} />

      {/* Secondary — readiness scores summary */}
      <div className="pt-1">
        <h3 className="text-[13px] font-semibold text-ink-700 mb-2">Readiness scores <span className="font-normal text-ink-400">· pillar coverage, timeliness, evidence &amp; approval</span></h3>
      </div>

      {/* 6-pillar grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {pillars.map((p) => {
          const base = PILLAR_READINESS[p];
          const scale = bias / 96; // normalize to this property's overall completeness
          const d = {
            completeness:  Math.min(100, Math.round(base.completeness  * scale)),
            timeliness:    Math.min(100, Math.round(base.timeliness    * scale)),
            evidenceMatch: Math.min(100, Math.round(base.evidenceMatch * scale)),
            approvalRate:  Math.min(100, Math.round(base.approvalRate  * scale)),
          };
          const enabled = property.enabledPillars.includes(p);
          const overallTone = d.completeness >= 80 ? "good" : d.completeness >= 60 ? "warn" : "bad";
          return (
            <Card key={p} className={cn(!enabled && "opacity-50")}>
              <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-ink-900 capitalize">{p}</span>
                <div className="flex items-center gap-2">
                  {!enabled && <Badge tone="neutral">Disabled</Badge>}
                  <Badge tone={overallTone}>{d.completeness}%</Badge>
                </div>
              </div>
              <div className="px-4 pb-4 space-y-1.5">
                <DimBar label="Completeness"  value={d.completeness} />
                <DimBar label="Timeliness"    value={d.timeliness} />
                <DimBar label="Evidence match" value={d.evidenceMatch} />
                <DimBar label="Approval rate" value={d.approvalRate} />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Additional readiness sections */}
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 md:col-span-4">
          <CardHeader title="Certification evidence readiness" />
          <div className="p-4 space-y-2 text-sm">
            <Stat label="GSTC"        value="82%" tone={82 >= 80 ? "good" : "warn"} />
            <Stat label="Green Globe" value="78%" tone="warn" />
            <Stat label="Travelife"   value="91%" tone="good" />
          </div>
        </Card>
        <Card className="col-span-12 md:col-span-4">
          <CardHeader title="Supplier data readiness" />
          <div className="p-4 space-y-2 text-sm">
            <Stat label="Invited"             value="12 suppliers" />
            <Stat label="Responded"           value="8 of 12 (67%)" tone="warn" />
            <Stat label="Specific EFs"        value="6 of 12 (50%)" tone="warn" />
            <Stat label="High-impact pending" value="3" tone="bad" />
          </div>
        </Card>
        <Card className="col-span-12 md:col-span-4">
          <CardHeader title="Public page readiness" />
          <div className="p-4 space-y-2 text-sm">
            <Stat label="Page status"    value={property.gpReady ? "Live" : "Draft"} tone={property.gpReady ? "good" : "warn"} />
            <Stat label="Guest metrics"  value="3 of 4 populated" tone="warn" />
            <Stat label="QR points live" value="4 active" tone="good" />
            <Stat label="Last updated"   value="2 days ago" />
          </div>
        </Card>
      </div>

    </div>
  );
}

/* ============================================================== */
/* TAB 5 — GP Setup                                               */
/* ============================================================== */

function GPSetupTab({ property }: { property: RichProperty }) {
  const baselineComplete = property.baselineYear < new Date().getFullYear();
  return (
    <div className="space-y-5">
      {property.gpReady ? (
        <GenuinePerformancePanel propertyName={property.name} />
      ) : (
        <div className="rounded-xl bg-warn/10 border border-warn/25 p-3 text-[13px] text-ink-700">
          Genuine Performance results appear once the baseline below is complete. Setup status:
        </div>
      )}

      <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12 md:col-span-7">
        <CardHeader title="GP readiness checklist" hint="Genuine Performance requires a complete baseline year of approved data" />
        <div className="p-6">
          <ReadinessChecklist
            items={[
              { label: "Baseline year selected",      state: "ready",   hint: `Currently ${property.baselineYear}` },
              { label: "12 months of approved data",  state: baselineComplete ? "ready" : "partial", hint: baselineComplete ? "Full baseline year approved" : "7 of 12 months approved" },
              { label: "Occupancy data",              state: "ready",   hint: "Opera Cloud PMS connected" },
              { label: "Weather (CDD/HDD)",           state: "ready",   hint: "Open-Meteo · daily by GPS" },
              { label: "Operational events log",      state: property.gpReady ? "ready" : "partial", hint: property.gpReady ? "4 events logged" : "Log empty — add at least one major event" },
            ]}
          />
        </div>
      </Card>

      <Card className="col-span-12 md:col-span-5">
        <CardHeader title="Comparison readiness" hint="Drives external benchmark pool eligibility" />
        <div className="p-6">
          <ReadinessChecklist
            items={[
              { label: "Star rating",       state: "ready",  hint: `${property.starRating}★` },
              { label: "Operation type",    state: "ready",  hint: property.operationType },
              { label: "Room / GFA size",   state: "ready",  hint: `${property.rooms} rooms · ${property.gfa.toLocaleString()} m²` },
              { label: "Climate zone (GPS)", state: "ready", hint: "Auto-classified from latitude" },
              { label: "Pool assignment",   state: property.poolEligible ? "ready" : "missing", hint: property.poolEligible ? "Direct SaaS global pool" : "Awaiting baseline completion" },
            ]}
          />
        </div>
      </Card>

      <Card className="col-span-12">
        <CardHeader title="Baseline year history" hint="Changing baseline is audit-logged" />
        <div className="p-6 grid grid-cols-3 gap-3 text-sm">
          <YearTile year={property.baselineYear} active label="Current baseline" />
          <YearTile year={property.baselineYear - 1} label="Previous" />
          <YearTile year={property.baselineYear - 2} label="Pre-baseline" />
        </div>
      </Card>
      </div>
    </div>
  );
}

/* ============================================================== */
/* TAB 6 — Certifications (with gaps, fixed data)                */
/* ============================================================== */

function CertificationsTab({ property }: { property: RichProperty }) {
  const certData = PROPERTY_CERT_READINESS[property.id] ?? {};
  return (
    <Card>
      <CardHeader
        title="Certification programmes"
        hint="Per-programme readiness with gap count and next action — open the Certifications module for the full criterion drilldown."
        right={<Link to="/certifications" className="btn-secondary"><ArrowRight size={14} /> Open Certifications</Link>}
      />
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {CERTIFICATIONS.map((c) => {
          const enrolled = property.certifications.includes(c.key);
          const data = certData[c.key];
          return (
            <div key={c.key} className={cn("rounded-xl border p-4", enrolled ? "border-brand-200 bg-brand-50/40" : "border-ink-200 bg-white opacity-60")}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-ink-900">{c.key}</div>
                {enrolled ? <Badge tone="good">Enrolled</Badge> : <Badge tone="neutral">Not enrolled</Badge>}
              </div>
              <div className="text-[12px] text-ink-500 mt-0.5">{c.label}</div>
              {enrolled && data && (
                <>
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-ink-500 mb-1">
                      <span>Readiness</span>
                      <span className="font-semibold text-ink-900">{data.readinessPct}%</span>
                    </div>
                    <ProgressBar value={data.readinessPct} tone={data.readinessPct >= 80 ? "good" : data.readinessPct >= 60 ? "warn" : "bad"} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="card-level-3 py-1.5">
                      <div className="text-sm font-bold text-good">{data.readyCriteria}</div>
                      <div className="text-[10px] text-ink-500">Ready</div>
                    </div>
                    <div className="card-level-3 py-1.5">
                      <div className="text-sm font-bold text-warn">{data.gapCount}</div>
                      <div className="text-[10px] text-ink-500">Gaps</div>
                    </div>
                    <div className="card-level-3 py-1.5">
                      <div className="text-sm font-bold text-bad">{data.missingEvidence}</div>
                      <div className="text-[10px] text-ink-500">Missing ev.</div>
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-ink-500 flex items-center gap-1">
                    <Calendar size={10} className="shrink-0" />
                    <span>Due: {data.dueDate} · Owner: {data.owner}</span>
                  </div>
                  <Link to="/certifications" className="mt-2 btn-secondary w-full justify-center text-[11px] h-7">
                    Open criterion gaps <ChevronRight size={11} />
                  </Link>
                </>
              )}
              {enrolled && !data && (
                <div className="mt-3 text-[12px] text-ink-400">No readiness data yet</div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ============================================================== */
/* TAB 7 — QR Points (split: Waste + Public Page)                */
/* ============================================================== */

function QrPointsTab({ property }: { property: RichProperty }) {
  const points = getQrPoints(property.id);
  const publicPageUrl = `https://sustainability.hoteloptimizer.com/${property.id}`;
  return (
    <div className="space-y-4">
      {/* Section 1 — Waste QR Points */}
      <Card>
        <CardHeader
          title="Waste QR points"
          hint="Printable QR codes for waste collection points — mobile-first scan flow"
          right={
            <>
              <button className="btn-secondary"><QrCode size={14} /> Print sheet</button>
              <button className="btn-primary">+ Add point</button>
            </>
          }
        />
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Label</th>
                <th className="table-th">Location</th>
                <th className="table-th">Stream</th>
                <th className="table-th">Scans (30d)</th>
                <th className="table-th">Last scan</th>
                <th className="table-th">Offline sync</th>
                <th className="table-th">Printed</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {points.map((q, i) => (
                <tr key={q.id} className="hover:bg-ink-50/60">
                  <td className="table-td font-medium">{q.label}</td>
                  <td className="table-td">{q.location}</td>
                  <td className="table-td">{q.stream}</td>
                  <td className="table-td tabular-nums">{q.scansLast30d}</td>
                  <td className="table-td text-ink-500">{q.active ? (i === 0 ? "Today 08:14" : i === 1 ? "Yesterday" : "3 days ago") : "—"}</td>
                  <td className="table-td">
                    <Badge tone={q.active ? "good" : "neutral"}>{q.active ? "Synced" : "N/A"}</Badge>
                  </td>
                  <td className="table-td">{q.printedAt}</td>
                  <td className="table-td">
                    <Badge tone={q.active ? "good" : "neutral"}>{q.active ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="table-td text-right pr-6">
                    <button className="btn-ghost h-7 px-2 text-[12px] text-brand-700">Reprint</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Section 2 — Public Sustainability Page QR */}
      <Card>
        <CardHeader
          title="Public sustainability page QR"
          hint="Guest-facing sustainability page — shows per-stay footprint and pillar highlights"
        />
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-500">Page status</span>
              <Badge tone={property.gpReady ? "good" : "warn"}>{property.gpReady ? "Live" : "Draft"}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-500">Public URL</span>
              <a href="#" className="text-brand-700 text-[12px] font-medium inline-flex items-center gap-1 hover:underline">
                {publicPageUrl} <ExternalLink size={11} />
              </a>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-500">Last updated</span>
              <span className="text-ink-900 font-medium">2 days ago</span>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="btn-secondary flex-1 justify-center">
                <Globe size={14} /> Preview page
              </button>
              <button className="btn-primary flex-1 justify-center">
                <QrCode size={14} /> Download QR
              </button>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="w-32 h-32 rounded-xl border-2 border-dashed border-ink-200 bg-ink-50 grid place-items-center text-ink-300">
              <QrCode size={48} />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================== */
/* TAB 8 — Audit history                                          */
/* ============================================================== */

function AuditHistoryTab({ property }: { property: RichProperty }) {
  const history = getAttributeHistory(property.id);
  return (
    <Card>
      <CardHeader
        title="Attribute change history"
        hint="Immutable. Every change to a GP-affecting attribute is logged with old value, new value, actor, change date, effective date, and reason."
      />
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-ink-50">
              <th className="table-th">Field</th>
              <th className="table-th">Old value</th>
              <th className="table-th">New value</th>
              <th className="table-th">Changed by</th>
              <th className="table-th">Changed at</th>
              <th className="table-th">Effective</th>
              <th className="table-th">Reason</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id}>
                <td className="table-td font-medium">{h.field}</td>
                <td className="table-td">
                  <code className="text-[12px] text-ink-500">{h.oldValue}</code>
                </td>
                <td className="table-td">
                  <code className="text-[12px] font-semibold text-brand-700">{h.newValue}</code>
                </td>
                <td className="table-td">{h.changedBy}</td>
                <td className="table-td">{h.changedAt}</td>
                <td className="table-td">{h.effectiveAt}</td>
                <td className="table-td max-w-md">
                  <span className="text-ink-700">{h.reason}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ============================================================== */
/* Setup Health Card                                              */
/* ============================================================== */

function SetupHealthCard({ property }: { property: RichProperty }) {
  const items = [
    { label: "Master data",      value: property.country && property.rooms ? "Complete" : "Incomplete",     tone: property.country && property.rooms ? "good" : "bad" as const },
    { label: "Users assigned",   value: "5 users",                                                           tone: "good" as const },
    { label: "Data readiness",   value: `${property.dataCompleteness}%`,                                     tone: property.dataCompleteness >= 80 ? "good" : "warn" as const },
    { label: "GP setup",         value: property.gpReady ? "Ready" : "Not ready",                           tone: property.gpReady ? "good" : "warn" as const },
    { label: "Cert. gaps",       value: `${property.certifications.length > 0 ? "12 gaps" : "N/A"}`,       tone: "warn" as const },
    { label: "QR points",        value: "4 active",                                                          tone: "good" as const },
    { label: "Public page",      value: property.gpReady ? "Live" : "Draft",                                tone: property.gpReady ? "good" : "warn" as const },
    { label: "Billing / licence", value: "Active",                                                           tone: "good" as const },
  ];
  return (
    <Card>
      <div className="px-4 py-3 border-b border-ink-100 flex items-center gap-2">
        <span className="text-[11px] uppercase font-semibold tracking-wide text-ink-500">Setup Health</span>
        <Badge tone={property.gpReady ? "good" : "warn"}>{property.gpReady ? "Ready" : "Action required"}</Badge>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 divide-x divide-ink-100">
        {items.map((item) => (
          <div key={item.label} className="px-3 py-3">
            <div className="text-[10px] uppercase font-semibold tracking-wide text-ink-400 mb-0.5">{item.label}</div>
            <div className={cn("text-sm font-semibold",
              item.tone === "good" ? "text-good" : item.tone === "bad" ? "text-bad" : "text-warn"
            )}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ============================================================== */
/* Edit Configuration Modal                                       */
/* ============================================================== */

const DOWNSTREAM_MAP: Record<string, string[]> = {
  rooms:          ["GP", "External Comparison", "Reporting"],
  gfa:            ["GP", "External Comparison", "Reporting"],
  starRating:     ["External Comparison"],
  operationType:  ["External Comparison", "Billing"],
  latitude:       ["GP", "External Comparison"],
  longitude:      ["GP", "External Comparison"],
  timezone:       ["GP", "Reporting"],
  currency:       ["Billing"],
  fbOutlets:      ["External Comparison"],
  fbCoversAnnual: ["GP", "External Comparison"],
  laundryType:    ["GP"],
  poolCount:      ["External Comparison"],
  spaCount:       ["External Comparison"],
  baselineYear:   ["GP", "Reporting"],
  reportingYear:  ["Reporting"],
  enabledPillars: ["GP", "Reporting", "Certification"],
  poolEligible:   ["External Comparison"],
};

const CHANGE_REASONS = [
  "Renovation / refurbishment",
  "Operational change",
  "Data correction",
  "Certification requirement",
  "Baseline recalibration",
  "Regulatory update",
  "Other",
];

function EditConfigModal({ property, open, onClose }: { property: RichProperty; open: boolean; onClose: () => void }) {
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [newValue, setNewValue] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [reasonCategory, setReasonCategory] = useState(CHANGE_REASONS[0]);
  const [reasonDetail, setReasonDetail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const downstream = selectedField ? DOWNSTREAM_MAP[selectedField] ?? [] : [];

  const EDITABLE_FIELDS = [
    { key: "rooms",          label: "Rooms",             current: String(property.rooms) },
    { key: "gfa",            label: "GFA (m²)",          current: String(property.gfa) },
    { key: "starRating",     label: "Star rating",       current: String(property.starRating) },
    { key: "operationType",  label: "Operation type",    current: property.operationType },
    { key: "fbOutlets",      label: "F&B outlets",       current: String(property.fbOutlets) },
    { key: "fbCoversAnnual", label: "F&B covers",        current: String(property.fbCoversAnnual) },
    { key: "laundryType",    label: "Laundry type",      current: property.laundryType },
    { key: "poolCount",      label: "Pool count",        current: String(property.poolCount) },
    { key: "currency",       label: "Currency",          current: property.currency },
    { key: "timezone",       label: "Timezone",          current: property.timezone },
    { key: "baselineYear",   label: "GP baseline year",  current: String(property.baselineYear) },
    { key: "reportingYear",  label: "Reporting year",    current: String(property.reportingYear) },
    { key: "poolEligible",   label: "Pool eligible",     current: property.poolEligible ? "Yes" : "No" },
  ];

  function handleConfirm() {
    const errs: Record<string, string> = {};
    if (!selectedField) errs.field = "Please select a field to edit";
    if (!newValue.trim()) errs.newValue = "New value is required";
    if (!effectiveDate) errs.effectiveDate = "Effective date is required";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitted(true);
  }

  function handleClose() {
    setSelectedField(null); setNewValue(""); setEffectiveDate("");
    setReasonCategory(CHANGE_REASONS[0]); setReasonDetail("");
    setErrors({}); setSubmitted(false);
    onClose();
  }

  const currentField = EDITABLE_FIELDS.find((f) => f.key === selectedField);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Edit configuration"
      subtitle="All changes are logged to attribute history with effective date, reason, and downstream impact."
      size="lg"
      footer={
        submitted ? (
          <button className="btn-primary" onClick={handleClose}>Done</button>
        ) : (
          <>
            <button className="btn-secondary" onClick={handleClose}>Cancel</button>
            <button className="btn-primary" onClick={handleConfirm}>Confirm change</button>
          </>
        )
      }
    >
      {submitted ? (
        <div className="text-center py-8">
          <div className="w-14 h-14 rounded-full bg-good/10 grid place-items-center mx-auto mb-3">
            <CheckCircle2 size={28} className="text-good" />
          </div>
          <div className="text-base font-semibold text-ink-900">Change recorded</div>
          <p className="text-sm text-ink-500 mt-1">
            {currentField?.label} will change to <strong>{newValue}</strong>, effective {effectiveDate}. Logged to attribute history.
          </p>
          {downstream.length > 0 && (
            <div className="mt-3 text-[12px] text-warn bg-warn/10 rounded-lg px-3 py-2 inline-block">
              Downstream recalculation scheduled: {downstream.join(", ")}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Field selector */}
          <div>
            <label className="text-[12px] font-medium text-ink-600 block mb-1">
              Field to edit <span className="text-bad">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {EDITABLE_FIELDS.map((f) => (
                <button key={f.key} type="button"
                  onClick={() => { setSelectedField(f.key); setNewValue(""); setErrors((e) => ({ ...e, field: undefined! })); }}
                  className={cn("rounded-lg border px-3 py-2 text-sm text-left transition-colors",
                    selectedField === f.key ? "border-brand-500 ring-1 ring-brand-500 bg-brand-50 text-brand-800" : "border-ink-200 bg-white text-ink-700 hover:border-ink-300"
                  )}>
                  <div className="font-medium">{f.label}</div>
                  <div className="text-[11px] text-ink-400 truncate">Current: {f.current}</div>
                </button>
              ))}
            </div>
            {errors.field && <div className="text-[11px] text-bad mt-1">{errors.field}</div>}
          </div>

          {selectedField && (
            <>
              {/* Downstream warning */}
              {downstream.length > 0 && (
                <div className="flex items-start gap-2 rounded-lg bg-warn/10 border border-warn/25 px-3 py-2.5 text-sm">
                  <AlertTriangle size={15} className="text-warn mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-warn">Downstream impact: </span>
                    <span className="text-ink-700">{downstream.join(", ")} will be recalculated when this change takes effect.</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <label className="block col-span-2 md:col-span-1">
                  <span className="text-[12px] font-medium text-ink-600">New value <span className="text-bad">*</span></span>
                  <input className={cn("input mt-1", errors.newValue && "border-bad ring-1 ring-bad/25")}
                    placeholder={`New value for ${currentField?.label}`}
                    value={newValue} onChange={(e) => { setNewValue(e.target.value); setErrors((err) => ({ ...err, newValue: undefined! })); }}
                  />
                  {errors.newValue && <div className="text-[11px] text-bad mt-1">{errors.newValue}</div>}
                </label>
                <label className="block col-span-2 md:col-span-1">
                  <span className="text-[12px] font-medium text-ink-600">Effective date <span className="text-bad">*</span></span>
                  <input type="date" className={cn("input mt-1", errors.effectiveDate && "border-bad ring-1 ring-bad/25")}
                    value={effectiveDate} onChange={(e) => { setEffectiveDate(e.target.value); setErrors((err) => ({ ...err, effectiveDate: undefined! })); }}
                  />
                  {errors.effectiveDate && <div className="text-[11px] text-bad mt-1">{errors.effectiveDate}</div>}
                </label>
                <label className="block">
                  <span className="text-[12px] font-medium text-ink-600">Reason category <span className="text-bad">*</span></span>
                  <select className="input mt-1" value={reasonCategory} onChange={(e) => setReasonCategory(e.target.value)}>
                    {CHANGE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[12px] font-medium text-ink-600">Reason detail (optional)</span>
                  <input className="input mt-1" placeholder="Additional context…" value={reasonDetail} onChange={(e) => setReasonDetail(e.target.value)} />
                </label>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ============================================================== */
/* helpers                                                        */
/* ============================================================== */

function HeroStat({
  label,
  value,
  suffix,
  tone,
  info,
}: {
  label: string;
  value: string;
  suffix?: string;
  tone: "good" | "warn" | "bad" | "info";
  info?: string;
}) {
  const ring = {
    good: "border-good/25 bg-good/10/40",
    warn: "border-warn/25 bg-warn/10",
    bad:  "border-bad/25 bg-bad/10/40",
    info: "border-info/25 bg-info/10/40",
  }[tone];
  return (
    <div className={cn("rounded-xl border p-4", ring)}>
      <div className="flex items-center gap-1 text-[11px] uppercase font-semibold tracking-wide text-ink-500">
        {label}
        {info && <InfoHint text={info} />}
      </div>
      <div className="text-2xl font-bold text-ink-900 mt-1">
        {value}
        {suffix && <span className="text-base font-medium text-ink-500 ml-1">{suffix}</span>}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  full,
}: {
  label: string;
  value: React.ReactNode;
  full?: boolean;
}) {
  return (
    <Fragment>
      <div className={cn("text-[12px] text-ink-500", full && "col-span-2")}>
        {label}
      </div>
      <div className={cn("text-ink-900 font-medium", full ? "col-span-2 -mt-2.5" : "")}>{value}</div>
    </Fragment>
  );
}

function PillarBadges({ pillars }: { pillars: PillarKey[] }) {
  const map: Record<PillarKey, any> = {
    energy: Zap,
    water: Droplet,
    waste: Recycle,
    carbon: Cloud,
    social: Users,
    governance: ShieldCheck,
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {pillars.map((p) => {
        const Icon = map[p];
        return (
          <span
            key={p}
            className="chip rounded-full bg-brand-50 text-brand-800 border border-brand-100"
          >
            <Icon size={10} className="text-brand-700" /> {p}
          </span>
        );
      })}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[12px] font-semibold uppercase tracking-wide text-ink-500 mb-2">
        {title}
      </div>
      <div className="rounded-xl border border-ink-200 bg-white divide-y divide-ink-200">
        {children}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
      <span className="text-ink-500">{label}</span>
      <span className="text-ink-900 font-medium text-right truncate max-w-[60%]">{value}</span>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-ink-200 px-3 py-2">
      <span className="text-ink-700">{label}</span>
      <span
        className={cn(
          "font-semibold",
          tone === "warn"
            ? "text-warn"
            : tone === "bad"
              ? "text-bad"
              : tone === "good"
                ? "text-good"
                : "text-ink-900"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function YearTile({
  year,
  label,
  active,
}: {
  year: number;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 text-center",
        active ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500" : "border-ink-200 bg-white"
      )}
    >
      <div className="text-[11px] uppercase font-semibold tracking-wide text-ink-500">
        {label}
      </div>
      <div className="text-2xl font-extrabold text-ink-900 mt-1">{year}</div>
      {active && (
        <Badge tone="brand" className="mt-2">
          Active baseline
        </Badge>
      )}
    </div>
  );
}
