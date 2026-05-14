// Review & Approval — BRD-aligned Maker–Checker queue.
//
// Compared with the previous version this rewrite adds:
//   • Priority-sorted queue (overdue → bad-flag → spike/drop → low-confidence
//     → resubmitted → queried → normal)
//   • Six summary cards — Pending · Queried · Overdue · Low Confidence
//     · Anomaly · Approved this month
//   • Advanced filters — property, pillar, data type, method, anomaly,
//     AI confidence, supplier-submitted, overdue, submitted by, period
//   • Detail panel with tabs — Record Details · Evidence · Comments
//     · AI/OCR Review · Audit Trail
//   • Mandatory comment dialog for Query, Reject, and Approve-flagged
//   • Multi-round query workflow with maker responses + per-round resolved
//   • Role picker (Maker / Checker / Property SM / Auditor / Supplier
//     / Super Admin) — Auditor sees no action buttons
//   • Supplier-submitted indicator + supplier link
//   • SLA / due-by / overdue badges
//   • Approved records are LOCKED — surface revision-request flow

import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock,
  Download,
  Eye,
  FileSearch,
  FileSpreadsheet,
  FileText,
  Filter,
  Image as ImageIcon,
  Link2,
  Lock,
  Mail,
  MessageCircle,
  Pencil,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Truck,
  Upload,
  User,
  X,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import DemoNotice from "@/components/ui/DemoNotice";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import CommentDialog, { type CommentAction } from "@/components/review/CommentDialog";
import {
  RECORDS as INITIAL_RECORDS,
  ROLE_LABEL,
  canTakeAction,
  priorityScore,
  type Method,
  type Pillar,
  type ReviewRecord,
  type Role,
  type Status,
} from "@/lib/reviewMock";
import { cn } from "@/lib/utils";

type DetailTab = "details" | "evidence" | "comments" | "ai-ocr" | "audit";
type PageTab = "queue" | "status";

/* ------------------------------------------------------------------ */
/* Capture Status types & mock data                                     */
/* ------------------------------------------------------------------ */
type CaptureStatus = "approved" | "pending" | "draft" | "missing" | "na";

type StatusRow = {
  dataType: string;
  key: string;
  pillar: string;
  responsible: { name: string; email: string; role: string };
  cells: Record<string, CaptureStatus>;
};

const STATUS_MONTHS = ["2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04"];
const STATUS_MONTH_LABELS: Record<string, string> = {
  "2025-11": "Nov '25",
  "2025-12": "Dec '25",
  "2026-01": "Jan '26",
  "2026-02": "Feb '26",
  "2026-03": "Mar '26",
  "2026-04": "Apr '26",
};

const STATUS_MOCK: Record<string, StatusRow[]> = {
  "Greenview Resort": [
    { dataType: "Electricity", key: "electricity", pillar: "Energy", responsible: { name: "Priya Nair", email: "priya.nair@greenview.com", role: "Property Manager" }, cells: { "2025-11": "approved", "2025-12": "approved", "2026-01": "approved", "2026-02": "pending", "2026-03": "draft", "2026-04": "missing" } },
    { dataType: "Natural Gas", key: "gas", pillar: "Energy", responsible: { name: "Priya Nair", email: "priya.nair@greenview.com", role: "Property Manager" }, cells: { "2025-11": "approved", "2025-12": "approved", "2026-01": "approved", "2026-02": "approved", "2026-03": "missing", "2026-04": "missing" } },
    { dataType: "Water", key: "water", pillar: "Water", responsible: { name: "Rahul Mehta", email: "rahul.mehta@greenview.com", role: "Facilities Lead" }, cells: { "2025-11": "approved", "2025-12": "approved", "2026-01": "pending", "2026-02": "missing", "2026-03": "missing", "2026-04": "missing" } },
    { dataType: "General Waste", key: "waste-general", pillar: "Waste", responsible: { name: "Rahul Mehta", email: "rahul.mehta@greenview.com", role: "Facilities Lead" }, cells: { "2025-11": "approved", "2025-12": "approved", "2026-01": "approved", "2026-02": "draft", "2026-03": "missing", "2026-04": "missing" } },
    { dataType: "Recycled Waste", key: "waste-recycle", pillar: "Waste", responsible: { name: "Rahul Mehta", email: "rahul.mehta@greenview.com", role: "Facilities Lead" }, cells: { "2025-11": "approved", "2025-12": "approved", "2026-01": "approved", "2026-02": "approved", "2026-03": "missing", "2026-04": "missing" } },
    { dataType: "Refrigerant", key: "refrigerant", pillar: "Carbon", responsible: { name: "Priya Nair", email: "priya.nair@greenview.com", role: "Property Manager" }, cells: { "2025-11": "approved", "2025-12": "missing", "2026-01": "missing", "2026-02": "missing", "2026-03": "missing", "2026-04": "missing" } },
    { dataType: "Headcount", key: "headcount", pillar: "Social", responsible: { name: "Anita Roy", email: "anita.roy@greenview.com", role: "HR Manager" }, cells: { "2025-11": "approved", "2025-12": "approved", "2026-01": "approved", "2026-02": "approved", "2026-03": "approved", "2026-04": "pending" } },
    { dataType: "Training Hours", key: "training", pillar: "Social", responsible: { name: "Anita Roy", email: "anita.roy@greenview.com", role: "HR Manager" }, cells: { "2025-11": "approved", "2025-12": "approved", "2026-01": "approved", "2026-02": "approved", "2026-03": "missing", "2026-04": "missing" } },
  ],
  "Blue Horizon Hotel": [
    { dataType: "Electricity", key: "electricity", pillar: "Energy", responsible: { name: "James Okafor", email: "james.okafor@bluehorizon.com", role: "Property Manager" }, cells: { "2025-11": "approved", "2025-12": "approved", "2026-01": "approved", "2026-02": "approved", "2026-03": "approved", "2026-04": "draft" } },
    { dataType: "Natural Gas", key: "gas", pillar: "Energy", responsible: { name: "James Okafor", email: "james.okafor@bluehorizon.com", role: "Property Manager" }, cells: { "2025-11": "approved", "2025-12": "approved", "2026-01": "approved", "2026-02": "approved", "2026-03": "draft", "2026-04": "missing" } },
    { dataType: "Water", key: "water", pillar: "Water", responsible: { name: "Sophie Laurent", email: "sophie.laurent@bluehorizon.com", role: "Facilities Lead" }, cells: { "2025-11": "approved", "2025-12": "approved", "2026-01": "approved", "2026-02": "approved", "2026-03": "approved", "2026-04": "approved" } },
    { dataType: "General Waste", key: "waste-general", pillar: "Waste", responsible: { name: "Sophie Laurent", email: "sophie.laurent@bluehorizon.com", role: "Facilities Lead" }, cells: { "2025-11": "approved", "2025-12": "approved", "2026-01": "approved", "2026-02": "approved", "2026-03": "missing", "2026-04": "missing" } },
    { dataType: "Recycled Waste", key: "waste-recycle", pillar: "Waste", responsible: { name: "Sophie Laurent", email: "sophie.laurent@bluehorizon.com", role: "Facilities Lead" }, cells: { "2025-11": "approved", "2025-12": "approved", "2026-01": "approved", "2026-02": "approved", "2026-03": "approved", "2026-04": "missing" } },
    { dataType: "Refrigerant", key: "refrigerant", pillar: "Carbon", responsible: { name: "James Okafor", email: "james.okafor@bluehorizon.com", role: "Property Manager" }, cells: { "2025-11": "approved", "2025-12": "approved", "2026-01": "approved", "2026-02": "approved", "2026-03": "approved", "2026-04": "na" } },
    { dataType: "Headcount", key: "headcount", pillar: "Social", responsible: { name: "Fatima Al-Rashid", email: "fatima.alrashid@bluehorizon.com", role: "HR Manager" }, cells: { "2025-11": "approved", "2025-12": "approved", "2026-01": "approved", "2026-02": "approved", "2026-03": "approved", "2026-04": "approved" } },
    { dataType: "Training Hours", key: "training", pillar: "Social", responsible: { name: "Fatima Al-Rashid", email: "fatima.alrashid@bluehorizon.com", role: "HR Manager" }, cells: { "2025-11": "approved", "2025-12": "approved", "2026-01": "approved", "2026-02": "approved", "2026-03": "pending", "2026-04": "missing" } },
  ],
  "Palm Residences": [
    { dataType: "Electricity", key: "electricity", pillar: "Energy", responsible: { name: "Carlos Mendoza", email: "carlos.mendoza@palmresidences.com", role: "Property Manager" }, cells: { "2025-11": "approved", "2025-12": "approved", "2026-01": "missing", "2026-02": "missing", "2026-03": "missing", "2026-04": "missing" } },
    { dataType: "Natural Gas", key: "gas", pillar: "Energy", responsible: { name: "Carlos Mendoza", email: "carlos.mendoza@palmresidences.com", role: "Property Manager" }, cells: { "2025-11": "approved", "2025-12": "na", "2026-01": "na", "2026-02": "na", "2026-03": "na", "2026-04": "na" } },
    { dataType: "Water", key: "water", pillar: "Water", responsible: { name: "Yuki Tanaka", email: "yuki.tanaka@palmresidences.com", role: "Facilities Lead" }, cells: { "2025-11": "approved", "2025-12": "approved", "2026-01": "approved", "2026-02": "draft", "2026-03": "missing", "2026-04": "missing" } },
    { dataType: "General Waste", key: "waste-general", pillar: "Waste", responsible: { name: "Yuki Tanaka", email: "yuki.tanaka@palmresidences.com", role: "Facilities Lead" }, cells: { "2025-11": "approved", "2025-12": "approved", "2026-01": "missing", "2026-02": "missing", "2026-03": "missing", "2026-04": "missing" } },
    { dataType: "Recycled Waste", key: "waste-recycle", pillar: "Waste", responsible: { name: "Yuki Tanaka", email: "yuki.tanaka@palmresidences.com", role: "Facilities Lead" }, cells: { "2025-11": "approved", "2025-12": "approved", "2026-01": "approved", "2026-02": "missing", "2026-03": "missing", "2026-04": "missing" } },
    { dataType: "Refrigerant", key: "refrigerant", pillar: "Carbon", responsible: { name: "Carlos Mendoza", email: "carlos.mendoza@palmresidences.com", role: "Property Manager" }, cells: { "2025-11": "approved", "2025-12": "missing", "2026-01": "missing", "2026-02": "missing", "2026-03": "missing", "2026-04": "missing" } },
    { dataType: "Headcount", key: "headcount", pillar: "Social", responsible: { name: "Nina Patel", email: "nina.patel@palmresidences.com", role: "HR Manager" }, cells: { "2025-11": "approved", "2025-12": "approved", "2026-01": "approved", "2026-02": "approved", "2026-03": "approved", "2026-04": "pending" } },
    { dataType: "Training Hours", key: "training", pillar: "Social", responsible: { name: "Nina Patel", email: "nina.patel@palmresidences.com", role: "HR Manager" }, cells: { "2025-11": "approved", "2025-12": "approved", "2026-01": "missing", "2026-02": "missing", "2026-03": "missing", "2026-04": "missing" } },
  ],
};

type FilterState = {
  search: string;
  status: "all" | Status | "overdue" | "anomaly";
  pillar: Pillar | "all";
  method: Method | "all";
  property: string;
  supplier: "all" | "yes" | "no";
  flag: string;            // "all" | flag.key
};

const INITIAL_FILTERS: FilterState = {
  search: "",
  status: "all",
  pillar: "all",
  method: "all",
  property: "all",
  supplier: "all",
  flag: "all",
};

export default function ReviewApproval() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [role, setRole] = useState<Role>(
    (searchParams.get("role") as Role) ?? "checker"
  );
  const [records, setRecords] = useState<ReviewRecord[]>(INITIAL_RECORDS);
  const [filters, setFilters] = useState<FilterState>({
    ...INITIAL_FILTERS,
    pillar: (searchParams.get("pillar") as Pillar) ?? "all",
    status: (searchParams.get("status") as any) ?? "all",
    flag:    searchParams.get("flag") ?? "all",
  });
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [tab, setTab] = useState<DetailTab>("details");
  const [pageTab, setPageTab] = useState<PageTab>("queue");

  const properties = useMemo(
    () => Array.from(new Set(INITIAL_RECORDS.map((r) => r.property))).sort(),
    []
  );

  /* --- Filter + sort the queue --- */
  const sorted = useMemo(() => {
    const out = records
      .filter((r) => {
        if (filters.search) {
          const s = filters.search.toLowerCase();
          if (
            !`${r.id} ${r.property} ${r.dataType} ${r.invoiceRef ?? ""}`
              .toLowerCase()
              .includes(s)
          )
            return false;
        }
        if (filters.status === "overdue" && (r.overdueDays ?? 0) <= 0) return false;
        if (filters.status === "anomaly" && r.flags.length === 0) return false;
        if (
          filters.status !== "all" &&
          filters.status !== "overdue" &&
          filters.status !== "anomaly" &&
          r.status !== filters.status
        )
          return false;
        if (filters.pillar !== "all" && r.pillar !== filters.pillar) return false;
        if (filters.method !== "all" && r.method !== filters.method) return false;
        if (filters.property !== "all" && r.property !== filters.property) return false;
        if (filters.supplier === "yes" && !r.supplierSubmitted) return false;
        if (filters.supplier === "no" && r.supplierSubmitted) return false;
        if (filters.flag !== "all" && !r.flags.some((f) => f.key === filters.flag))
          return false;
        return true;
      })
      .map((r) => ({ ...r, priority: priorityScore(r) }))
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    return out;
  }, [records, filters]);

  const [selectedId, setSelectedId] = useState<string>(
    INITIAL_RECORDS[0]?.id ?? ""
  );
  const selected = sorted.find((r) => r.id === selectedId) ?? sorted[0];

  // Comment dialog state
  const [dialog, setDialog] = useState<{ open: boolean; action: CommentAction }>({
    open: false,
    action: "approve",
  });

  function transition(action: CommentAction, comment: string) {
    if (!selected) return;
    setRecords((rs) =>
      rs.map((r) => {
        if (r.id !== selected.id) return r;
        const at = new Date().toISOString().slice(0, 16).replace("T", " ");
        const audit = [...r.audit];
        const comments = [...r.comments];
        let nextStatus: Status = r.status;
        let queryRounds = r.queryRounds;
        if (action === "approve" || action === "approve-flagged") {
          nextStatus = "approved";
          audit.push({ at, actor: "Demo Checker", actorRole: "checker", action: "approved", note: comment || undefined });
          audit.push({ at, actor: "Demo Checker", actorRole: "checker", action: "locked",   note: "Auto-locked on approval" });
        } else if (action === "reject") {
          nextStatus = "rejected";
          audit.push({ at, actor: "Demo Checker", actorRole: "checker", action: "rejected", note: comment });
        } else if (action === "query") {
          nextStatus = "queried";
          queryRounds = [
            ...r.queryRounds,
            {
              round: r.queryRounds.length + 1,
              raisedBy: "Demo Checker",
              raisedAt: at,
              message: comment,
            },
          ];
          audit.push({ at, actor: "Demo Checker", actorRole: "checker", action: "queried", note: `Round ${queryRounds.length}` });
        }
        if (comment) {
          comments.push({
            id: `c${comments.length + 1}`,
            author: "Demo Checker",
            role: "checker",
            at,
            message: comment,
          });
        }
        return {
          ...r,
          status: nextStatus,
          queryRounds,
          audit,
          comments,
          locked: nextStatus === "approved",
        };
      })
    );
    setDialog({ open: false, action: "approve" });
  }

  // Maker resubmit: attaches a response to the latest open query round, advances status
  function handleMakerResubmit(response: string, editedValues?: Record<string, string>) {
    if (!selected) return;
    setRecords((rs) =>
      rs.map((r) => {
        if (r.id !== selected.id) return r;
        const at = new Date().toISOString().slice(0, 16).replace("T", " ");
        // Attach response to the last open query round
        const queryRounds = r.queryRounds.map((qr, idx) => {
          if (idx === r.queryRounds.length - 1 && !qr.resolved && !qr.response) {
            return { ...qr, response: { by: "Demo Maker", at, message: response } };
          }
          return qr;
        });
        const audit = [
          ...r.audit,
          { at, actor: "Demo Maker", actorRole: "maker" as const, action: "resubmitted" as const, note: response || undefined },
        ];
        if (editedValues) {
          for (const [field, newValue] of Object.entries(editedValues)) {
            audit.push({ at, actor: "Demo Maker", actorRole: "maker" as const, action: "edit" as const, field, oldValue: r.value, newValue });
          }
        }
        return { ...r, status: "resubmitted" as Status, queryRounds, audit };
      })
    );
  }

  /* --- Summary card numbers — recalculated from live records state --- */
  const summary = useMemo(() => ({
    pending:    records.filter((r) => r.status === "submitted").length,
    queried:    records.filter((r) => r.status === "queried" || r.status === "resubmitted").length,
    overdue:    records.filter((r) => (r.overdueDays ?? 0) > 0).length,
    lowConf:    records.filter((r) => r.flags.some((f) => f.key === "ocr-low" || f.key === "ai-low")).length,
    anomaly:    records.filter((r) => r.flags.length > 0).length,
    approved:   records.filter((r) => r.status === "approved").length,
  }), [records]);

  const readOnly = !canTakeAction(role);

  return (
    <div className="space-y-5">
      <DemoNotice message="Records shown are sample data. In a live environment, submitted records from makers flow here for checker review, approval, and audit logging." />
      <PageHeader
        eyebrow="Approval queue"
        title="Review & Approval"
        subtitle="24 records are waiting for your decision — 6 are overdue. Anomaly-flagged records surface first. Approve, query, or reject with a mandatory comment. Nothing appears in reports until you approve it."
        actions={
          <RolePicker
            role={role}
            onChange={(r) => {
              setRole(r);
              searchParams.set("role", r);
              setSearchParams(searchParams);
            }}
          />
        }
      />

      {/* Page-level tab strip */}
      <div className="flex gap-0.5 border-b border-ink-100 -mt-1">
        {([["queue", "Approval Queue"], ["status", "Capture Status"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPageTab(key)}
            className={cn(
              "px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
              pageTab === key
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-ink-500 hover:text-ink-800 hover:border-ink-200"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {pageTab === "status" && <CaptureStatusTab />}

      {pageTab === "queue" && <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard label="Pending review" value={summary.pending} icon={<Clock size={14} />} tone="warn"  onClick={() => setFilters((f) => ({ ...f, status: "submitted" }))} active={filters.status === "submitted"} />
        <SummaryCard label="Queried"        value={summary.queried} icon={<MessageCircle size={14} />} tone="info" onClick={() => setFilters((f) => ({ ...f, status: "queried" }))} active={filters.status === "queried"} />
        <SummaryCard label="Overdue"        value={summary.overdue} icon={<ShieldAlert size={14} />} tone="bad"  onClick={() => setFilters((f) => ({ ...f, status: "overdue" }))} active={filters.status === "overdue"} />
        <SummaryCard label="Low confidence" value={summary.lowConf} icon={<Sparkles size={14} />} tone="warn" onClick={() => setFilters((f) => ({ ...f, flag: "ocr-low" }))} active={filters.flag === "ocr-low"} />
        <SummaryCard label="Anomaly flagged" value={summary.anomaly} icon={<AlertTriangle size={14} />} tone="warn" onClick={() => setFilters((f) => ({ ...f, status: "anomaly" }))} active={filters.status === "anomaly"} />
        <SummaryCard label="Approved this month" value={summary.approved} icon={<CheckCircle2 size={14} />} tone="good" onClick={() => setFilters((f) => ({ ...f, status: "approved" }))} active={filters.status === "approved"} />
      </div>

      {/* Filter strip */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-9"
            placeholder="Search by record ID, property, invoice…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
        <button
          className={cn("btn-secondary", filterDrawerOpen && "ring-1 ring-brand-500/30")}
          onClick={() => setFilterDrawerOpen((v) => !v)}
        >
          <Filter size={14} /> Advanced
        </button>
        {(filters.status !== "all" || filters.pillar !== "all" || filters.method !== "all" || filters.property !== "all" || filters.supplier !== "all" || filters.flag !== "all") && (
          <button
            onClick={() => setFilters(INITIAL_FILTERS)}
            className="text-[12px] font-semibold text-brand-700 hover:text-brand-800"
          >
            Clear all
          </button>
        )}
      </div>

      {filterDrawerOpen && (
        <Card>
          <CardHeader title="Advanced filters" right={<button onClick={() => setFilterDrawerOpen(false)} className="w-7 h-7 grid place-items-center rounded-md hover:bg-ink-100"><X size={14} /></button>} />
          <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <SelectField label="Property" value={filters.property} onChange={(v) => setFilters((f) => ({ ...f, property: v }))} options={[{ value: "all", label: "All properties" }, ...properties.map((p) => ({ value: p, label: p }))]} />
            <SelectField label="Pillar"   value={filters.pillar}   onChange={(v) => setFilters((f) => ({ ...f, pillar: v as any }))}   options={[
              { value: "all", label: "Any pillar" },
              { value: "energy", label: "Energy" },
              { value: "water", label: "Water" },
              { value: "waste", label: "Waste" },
              { value: "carbon", label: "Carbon" },
              { value: "social", label: "Social" },
              { value: "governance", label: "Governance" },
            ]} />
            <SelectField label="Input method" value={filters.method} onChange={(v) => setFilters((f) => ({ ...f, method: v as any }))} options={[
              { value: "all", label: "Any" }, { value: "manual", label: "Manual" }, { value: "ocr", label: "OCR" },
              { value: "bulk", label: "Bulk" }, { value: "qr", label: "QR" }, { value: "api", label: "API" }, { value: "supplier", label: "Supplier portal" },
            ]} />
            <SelectField label="Supplier" value={filters.supplier} onChange={(v) => setFilters((f) => ({ ...f, supplier: v as any }))} options={[
              { value: "all", label: "Any" }, { value: "yes", label: "Supplier-submitted only" }, { value: "no", label: "Internal only" },
            ]} />
            <SelectField label="Anomaly flag" value={filters.flag} onChange={(v) => setFilters((f) => ({ ...f, flag: v }))} options={[
              { value: "all", label: "Any" },
              { value: "spike", label: "Spike" },
              { value: "drop",  label: "Drop" },
              { value: "range", label: "Range error" },
              { value: "unit",  label: "Unit error" },
              { value: "ocr-low", label: "OCR low confidence" },
              { value: "ai-low",  label: "AI low confidence" },
              { value: "duplicate", label: "Duplicate invoice" },
              { value: "double-count", label: "Double-count risk" },
              { value: "tier-regression", label: "Tier regression" },
              { value: "missing-evidence", label: "Missing evidence" },
            ]} />
            <SelectField label="Status" value={filters.status as string} onChange={(v) => setFilters((f) => ({ ...f, status: v as any }))} options={[
              { value: "all", label: "Any" },
              { value: "submitted", label: "Submitted" },
              { value: "resubmitted", label: "Resubmitted" },
              { value: "queried", label: "Queried" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
              { value: "overdue", label: "Overdue" },
              { value: "anomaly", label: "Anomaly flagged" },
            ]} />
          </div>
        </Card>
      )}

      {/* Queue + detail */}
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-7">
          {sorted.length === 0 ? (
            <EmptyState icon={<ClipboardCheck size={20} />} title="No records here" description="Try clearing filters or switching role." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-ink-50">
                    <th className="table-th">Pri</th>
                    <th className="table-th">Record</th>
                    <th className="table-th">Property</th>
                    <th className="table-th">Pillar · Type</th>
                    <th className="table-th">Method</th>
                    <th className="table-th">Period</th>
                    <th className="table-th">Flags</th>
                    <th className="table-th">Submitted by</th>
                    <th className="table-th">SLA</th>
                    <th className="table-th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      className={cn(
                        "cursor-pointer",
                        selected?.id === r.id ? "bg-brand-50/60" : "hover:bg-ink-50/60"
                      )}
                    >
                      <td className="table-td"><PriorityDot record={r} /></td>
                      <td className="table-td font-mono text-[11px] text-ink-700">{r.id}</td>
                      <td className="table-td font-medium text-ink-900">{r.property}</td>
                      <td className="table-td">
                        <div className="capitalize">{r.pillar}</div>
                        <div className="text-[11px] text-ink-500">{r.dataType}</div>
                      </td>
                      <td className="table-td capitalize">{r.method}</td>
                      <td className="table-td">{r.period}</td>
                      <td className="table-td"><FlagsCell flags={r.flags} /></td>
                      <td className="table-td">
                        <div className={cn("font-medium", r.supplierSubmitted && "text-pillar-social")}>
                          {r.submittedBy}
                        </div>
                        {r.supplierSubmitted && (
                          <div className="text-[11px] text-pillar-social inline-flex items-center gap-1">
                            <Truck size={10} /> Supplier
                          </div>
                        )}
                      </td>
                      <td className="table-td"><SlaCell record={r} /></td>
                      <td className="table-td"><StatusBadge status={r.status} locked={r.locked} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Detail panel */}
        <div className="col-span-12 lg:col-span-5">
          {selected ? (
            <DetailPanel
              record={selected}
              tab={tab}
              setTab={setTab}
              role={role}
              readOnly={readOnly}
              onAction={(a) =>
                setDialog({
                  open: true,
                  action:
                    a === "approve" && selected.flags.length > 0
                      ? "approve-flagged"
                      : a,
                })
              }
              onResubmit={handleMakerResubmit}
            />
          ) : (
            <Card className="card-pad text-sm text-ink-500">No record selected.</Card>
          )}
        </div>
      </div>

      <CommentDialog
        open={dialog.open}
        action={dialog.action}
        onClose={() => setDialog({ open: false, action: "approve" })}
        onConfirm={(c) => transition(dialog.action, c)}
      />
      </>}
    </div>
  );
}

/* =================================================================== */
/* Capture Status Tab                                                   */
/* =================================================================== */

function CaptureStatusChip({ status }: { status: CaptureStatus }) {
  if (status === "approved") return <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-good/10 text-good"><CheckCircle2 size={10} />Approved</span>;
  if (status === "pending")  return <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-warn/10 text-amber-700"><Clock size={10} />Pending</span>;
  if (status === "draft")    return <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-brand-50 text-brand-700"><Pencil size={10} />Draft</span>;
  if (status === "missing")  return <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-bad/10 text-bad"><AlertTriangle size={10} />Missing</span>;
  return <span className="inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium bg-ink-100 text-ink-400">N/A</span>;
}

type ReminderGroup = {
  responsible: { name: string; email: string; role: string };
  items: { dataType: string; months: string[] }[];
};

function ReminderModal({
  property,
  groups,
  onClose,
}: {
  property: string;
  groups: ReminderGroup[];
  onClose: () => void;
}) {
  const [sent, setSent] = useState(false);
  const [bodies, setBodies] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const g of groups) {
      const missing = g.items.map((i) => `  • ${i.dataType} — ${i.months.join(", ")}`).join("\n");
      init[g.responsible.email] =
        `Hi ${g.responsible.name.split(" ")[0]},\n\nWe noticed the following data entries are still missing for ${property}:\n\n${missing}\n\nCould you please submit or clarify these by end of week?\n\nThank you,\nSustainability Team`;
    }
    return init;
  });
  const [activeEmail, setActiveEmail] = useState(groups[0]?.responsible.email ?? "");

  if (sent) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-pop max-w-sm w-full p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-good/10 grid place-items-center mx-auto">
            <CheckCircle2 size={22} className="text-good" />
          </div>
          <div>
            <h3 className="font-bold text-ink-900 text-base">Reminders sent</h3>
            <p className="text-[13px] text-ink-500 mt-1">{groups.length} email{groups.length > 1 ? "s" : ""} dispatched to responsible contacts.</p>
          </div>
          <button onClick={onClose} className="btn-primary w-full">Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-pop max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-200 shrink-0">
          <div>
            <h3 className="font-bold text-ink-900 text-base">Send data reminders</h3>
            <p className="text-[12px] text-ink-500 mt-0.5">{groups.length} responsible contact{groups.length > 1 ? "s" : ""} · {property}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 grid place-items-center rounded-lg hover:bg-ink-100"><X size={14} /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: person list */}
          <div className="w-48 shrink-0 border-r border-ink-200 overflow-y-auto">
            {groups.map((g) => (
              <button
                key={g.responsible.email}
                onClick={() => setActiveEmail(g.responsible.email)}
                className={cn(
                  "w-full text-left px-3 py-3 border-b border-ink-100 transition-colors",
                  activeEmail === g.responsible.email ? "bg-brand-50" : "hover:bg-ink-50"
                )}
              >
                <div className="text-[12px] font-semibold text-ink-900 truncate">{g.responsible.name}</div>
                <div className="text-[11px] text-ink-500 truncate">{g.responsible.role}</div>
                <div className="text-[11px] text-ink-400 truncate mt-0.5">{g.items.length} item{g.items.length > 1 ? "s" : ""} missing</div>
              </button>
            ))}
          </div>

          {/* Right: email editor */}
          <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3">
            {(() => {
              const g = groups.find((x) => x.responsible.email === activeEmail)!;
              if (!g) return null;
              return (
                <>
                  <div className="flex items-center gap-2 text-[12px] text-ink-600">
                    <Mail size={13} className="text-ink-400" />
                    <span className="font-medium">{g.responsible.email}</span>
                    <span className="ml-auto text-ink-400">{g.items.length} item{g.items.length > 1 ? "s" : ""}</span>
                  </div>
                  <div className="rounded-xl border border-ink-200 bg-ink-50 px-3 py-2">
                    <div className="text-[11px] font-semibold text-ink-500 mb-1">Missing items</div>
                    <ul className="space-y-1">
                      {g.items.map((item) => (
                        <li key={item.dataType} className="text-[12px] text-ink-700 flex items-center gap-2">
                          <AlertTriangle size={10} className="text-bad shrink-0" />
                          <span className="font-medium">{item.dataType}</span>
                          <span className="text-ink-400">— {item.months.join(", ")}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <textarea
                    className="input flex-1 min-h-[180px] py-2 font-mono text-[12px] resize-none"
                    value={bodies[activeEmail]}
                    onChange={(e) => setBodies((b) => ({ ...b, [activeEmail]: e.target.value }))}
                  />
                </>
              );
            })()}
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-ink-200 shrink-0">
          <span className="text-[12px] text-ink-500">{groups.length} email{groups.length > 1 ? "s" : ""} will be sent</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={() => setSent(true)} className="btn-primary">
              <Mail size={14} /> Send reminders
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CaptureStatusTab() {
  const propertyNames = Object.keys(STATUS_MOCK);
  const [property, setProperty] = useState(propertyNames[0]);
  const [reminderOpen, setReminderOpen] = useState(false);

  const rows = STATUS_MOCK[property] ?? [];

  const totalCells = rows.length * STATUS_MONTHS.length;
  const approved  = rows.reduce((n, r) => n + Object.values(r.cells).filter((s) => s === "approved").length, 0);
  const missing   = rows.reduce((n, r) => n + Object.values(r.cells).filter((s) => s === "missing").length, 0);
  const pending   = rows.reduce((n, r) => n + Object.values(r.cells).filter((s) => s === "pending" || s === "draft").length, 0);

  // Build reminder groups: group missing items by responsible email
  const reminderGroups: ReminderGroup[] = useMemo(() => {
    const map = new Map<string, ReminderGroup>();
    for (const row of rows) {
      const missingMonths = STATUS_MONTHS.filter((m) => row.cells[m] === "missing").map((m) => STATUS_MONTH_LABELS[m]);
      if (missingMonths.length === 0) continue;
      const email = row.responsible.email;
      if (!map.has(email)) {
        map.set(email, { responsible: row.responsible, items: [] });
      }
      map.get(email)!.items.push({ dataType: row.dataType, months: missingMonths });
    }
    return Array.from(map.values());
  }, [rows]);

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-ink-200 bg-white p-3">
          <div className="text-[11px] text-ink-500 mb-1">Coverage</div>
          <div className="text-xl font-bold text-ink-900">{Math.round((approved / (totalCells || 1)) * 100)}%</div>
          <div className="text-[11px] text-ink-400">{approved}/{totalCells} cells approved</div>
        </div>
        <div className="rounded-xl border border-bad/25 bg-bad/5 p-3">
          <div className="text-[11px] text-bad mb-1">Missing</div>
          <div className="text-xl font-bold text-bad">{missing}</div>
          <div className="text-[11px] text-bad/70">entries not submitted</div>
        </div>
        <div className="rounded-xl border border-warn/25 bg-warn/5 p-3">
          <div className="text-[11px] text-amber-700 mb-1">In progress</div>
          <div className="text-xl font-bold text-amber-700">{pending}</div>
          <div className="text-[11px] text-amber-600/70">pending or draft</div>
        </div>
        <div className="rounded-xl border border-ink-200 bg-white p-3 flex flex-col justify-between">
          <div className="text-[11px] text-ink-500 mb-1">Contacts to remind</div>
          <div className="text-xl font-bold text-ink-900">{reminderGroups.length}</div>
          <button
            disabled={reminderGroups.length === 0}
            onClick={() => setReminderOpen(true)}
            className="btn-primary text-[12px] mt-2 disabled:opacity-40"
          >
            <Mail size={13} /> Send reminders
          </button>
        </div>
      </div>

      {/* Property picker */}
      <div className="flex items-center gap-3">
        <div className="text-[12px] font-medium text-ink-600">Property</div>
        <div className="flex gap-1 flex-wrap">
          {propertyNames.map((p) => (
            <button
              key={p}
              onClick={() => setProperty(p)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors border",
                property === p
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-ink-600 border-ink-200 hover:border-brand-300 hover:text-brand-700"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[11px]">
        {([["approved", "Approved"], ["pending", "Pending review"], ["draft", "Draft"], ["missing", "Missing"], ["na", "Not applicable"]] as [CaptureStatus, string][]).map(([s, label]) => (
          <div key={s} className="flex items-center gap-1.5">
            <CaptureStatusChip status={s} />
            <span className="text-ink-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Matrix grid */}
      <div className="rounded-xl border border-ink-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-[12px]">
            <thead>
              <tr className="bg-ink-50 border-b border-ink-200">
                <th className="text-left px-4 py-2.5 font-semibold text-ink-700 min-w-[160px]">Data type</th>
                <th className="text-left px-3 py-2.5 font-semibold text-ink-700 min-w-[100px]">Pillar</th>
                <th className="text-left px-3 py-2.5 font-semibold text-ink-700 min-w-[140px]">Responsible</th>
                {STATUS_MONTHS.map((m) => (
                  <th key={m} className="text-center px-2 py-2.5 font-semibold text-ink-700 min-w-[100px]">{STATUS_MONTH_LABELS[m]}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((row) => (
                <tr key={row.key} className="hover:bg-ink-50/50">
                  <td className="px-4 py-2.5 font-medium text-ink-900">{row.dataType}</td>
                  <td className="px-3 py-2.5 text-ink-500">{row.pillar}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-ink-800">{row.responsible.name}</div>
                    <div className="text-[11px] text-ink-400">{row.responsible.role}</div>
                  </td>
                  {STATUS_MONTHS.map((m) => (
                    <td key={m} className="px-2 py-2.5 text-center">
                      <CaptureStatusChip status={row.cells[m] ?? "missing"} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {reminderOpen && (
        <ReminderModal
          property={property}
          groups={reminderGroups}
          onClose={() => setReminderOpen(false)}
        />
      )}
    </div>
  );
}

/* =================================================================== */
/* Role picker                                                         */
/* =================================================================== */

function RolePicker({
  role,
  onChange,
}: {
  role: Role;
  onChange: (r: Role) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-ink-500">Viewing as</span>
      <select
        className="h-9 px-3 rounded-lg border border-ink-200 bg-white text-sm font-medium text-ink-900"
        value={role}
        onChange={(e) => onChange(e.target.value as Role)}
      >
        {(["checker","property_sm","maker","supplier","auditor","super_admin"] as Role[]).map((r) => (
          <option key={r} value={r}>{ROLE_LABEL[r]}</option>
        ))}
      </select>
    </div>
  );
}

/* =================================================================== */
/* Summary cards                                                       */
/* =================================================================== */

function SummaryCard({
  label,
  value,
  icon,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "good" | "warn" | "bad" | "info";
  active?: boolean;
  onClick?: () => void;
}) {
  const ringTone = {
    good: "border-good/25 bg-good/5",
    warn: "border-warn/25 bg-warn/5",
    bad:  "border-bad/25  bg-bad/5",
    info: "border-info/25 bg-info/5",
  }[tone];
  const txtTone = {
    good: "text-good", warn: "text-warn", bad: "text-bad", info: "text-info",
  }[tone];
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl border p-3 text-left transition-all",
        ringTone,
        active && "ring-2 ring-brand-500 border-brand-500"
      )}
    >
      <div className={cn("inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-semibold", txtTone)}>
        {icon} {label}
      </div>
      <div className="text-2xl font-bold text-ink-900 mt-1">{value}</div>
    </button>
  );
}

/* =================================================================== */
/* Queue cell helpers                                                  */
/* =================================================================== */

function PriorityDot({ record }: { record: ReviewRecord }) {
  const overdue = (record.overdueDays ?? 0) > 0;
  const bad = record.flags.some((f) => f.severity === "bad");
  const warn = record.flags.length > 0;
  if (overdue || bad)
    return <span className="inline-block w-2.5 h-2.5 rounded-full bg-bad" title="Overdue / blocking flag" />;
  if (warn)
    return <span className="inline-block w-2.5 h-2.5 rounded-full bg-warn" title="Anomaly flagged" />;
  return <span className="inline-block w-2.5 h-2.5 rounded-full bg-ink-300" />;
}

function FlagsCell({ flags }: { flags: ReviewRecord["flags"] }) {
  if (flags.length === 0) return <span className="text-ink-300">—</span>;
  const visible = flags.slice(0, 2);
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((f) => (
        <Badge key={f.key} tone={f.severity === "bad" ? "bad" : "warn"}>
          {f.label.split(" — ")[0]}
        </Badge>
      ))}
      {flags.length > visible.length && (
        <span className="text-[11px] text-ink-500">
          +{flags.length - visible.length}
        </span>
      )}
    </div>
  );
}

function SlaCell({ record }: { record: ReviewRecord }) {
  const overdue = (record.overdueDays ?? 0) > 0;
  return (
    <div>
      <div className={cn("text-[12px] font-medium", overdue ? "text-bad" : "text-ink-700")}>
        {overdue ? `${record.overdueDays}d overdue` : "On time"}
      </div>
      <div className="text-[11px] text-ink-500">due {record.dueAt.slice(0, 10)}</div>
    </div>
  );
}

function StatusBadge({ status, locked }: { status: Status; locked?: boolean }) {
  const map = {
    draft:        { label: "Draft",       tone: "neutral" as const },
    submitted:    { label: "Awaiting",    tone: "warn"    as const },
    queried:      { label: "Queried",     tone: "info"    as const },
    resubmitted:  { label: "Resubmitted", tone: "info"    as const },
    approved:     { label: "Approved",    tone: "good"    as const },
    rejected:     { label: "Rejected",    tone: "bad"     as const },
    locked:       { label: "Locked",      tone: "neutral" as const },
  };
  const m = map[status];
  return (
    <span className="inline-flex items-center gap-1">
      <Badge tone={m.tone}>{m.label}</Badge>
      {locked && (
        <Badge tone="neutral">
          <Lock size={10} /> Locked
        </Badge>
      )}
    </span>
  );
}

/* =================================================================== */
/* Detail panel — tabbed                                               */
/* =================================================================== */

function DetailPanel({
  record,
  tab,
  setTab,
  role,
  readOnly,
  onAction,
  onResubmit,
}: {
  record: ReviewRecord;
  tab: DetailTab;
  setTab: (t: DetailTab) => void;
  role: Role;
  readOnly: boolean;
  onAction: (a: CommentAction) => void;
  onResubmit: (response: string, edited?: Record<string, string>) => void;
}) {
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);

  const tabs: { key: DetailTab; label: string }[] = [
    { key: "details",  label: "Record details" },
    { key: "evidence", label: `Evidence${record.evidence.length ? ` · ${record.evidence.length}` : ""}` },
    { key: "comments", label: `Comments${record.comments.length ? ` · ${record.comments.length}` : ""}` },
    { key: "ai-ocr",   label: "AI / OCR review" },
    { key: "audit",    label: `Audit trail · ${record.audit.length}` },
  ];

  const canApprove = !readOnly && (record.status === "submitted" || record.status === "resubmitted");
  const canQuery   = !readOnly && (record.status === "submitted" || record.status === "resubmitted");
  const canReject  = !readOnly && (record.status === "submitted" || record.status === "resubmitted");
  const isAuditor  = role === "auditor";

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={`Record ${record.id}`}
        hint={`${record.property} · ${record.dataType}`}
        right={
          isAuditor ? (
            <div className="flex items-center gap-2">
              <Badge tone="neutral"><Eye size={11} /> Auditor</Badge>
              <button className="btn-secondary h-8 px-2 text-[12px]">
                <FileSearch size={13} /> Export audit pack
              </button>
              <button className="btn-secondary h-8 px-2 text-[12px]">
                <FileText size={13} /> Evidence trail
              </button>
            </div>
          ) : readOnly ? (
            <Badge tone="neutral"><Eye size={11} /> Read-only · {ROLE_LABEL[role]}</Badge>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button disabled={!canQuery} onClick={() => onAction("query")} className="btn-secondary disabled:opacity-40">
                <MessageCircle size={14} /> Query
              </button>
              <button disabled={!canReject} onClick={() => onAction("reject")} className="btn bg-bad text-white hover:bg-red-700 disabled:opacity-40">
                <X size={14} /> Reject
              </button>
              <button disabled={!canApprove} onClick={() => onAction("approve")} className="btn-primary disabled:opacity-40">
                <Check size={14} /> Approve
              </button>
            </div>
          )
        }
      />

      {/* Locked banner */}
      {record.locked && (
        <div className="mx-6 mt-3 rounded-xl border border-good/25 bg-good/5 p-3 flex items-start gap-2.5">
          <Lock size={16} className="text-good mt-0.5" />
          <div className="text-[13px] text-good">
            <strong>Approved &amp; locked.</strong> Corrections require a Revision request, which goes through Maker–Checker again. The original value stays in the audit trail.
            <button onClick={() => setRevisionOpen(true)} className="ml-2 underline font-semibold">Open revision request</button>
          </div>
        </div>
      )}

      {/* Anomaly panel */}
      {record.flags.length > 0 && (
        <div className="mx-6 mt-3 rounded-xl border border-warn/25 bg-warn/5 p-3">
          <div className="flex items-center gap-2 text-warn font-semibold text-[13px] mb-2">
            <AlertTriangle size={14} /> Anomaly flags ({record.flags.length})
          </div>
          <ul className="space-y-1.5 text-[12px]">
            {record.flags.map((f) => (
              <li key={f.key} className="flex items-start gap-2">
                <Badge tone={f.severity === "bad" ? "bad" : "warn"}>{f.key}</Badge>
                <div>
                  <div className="text-ink-900 font-medium">{f.label}</div>
                  {f.hint && <div className="text-[11px] text-ink-600">{f.hint}</div>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <div className="px-6 mt-4 flex items-center gap-1 border-b border-ink-200 overflow-x-auto -mb-px">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px",
              tab === t.key
                ? "text-ink-900 border-brand-700"
                : "text-ink-500 hover:text-ink-900 border-transparent"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === "details"  && <DetailsTab record={record} role={role} onResubmit={onResubmit} onOpenSupplier={() => setSupplierOpen(true)} />}
        {tab === "evidence" && <EvidenceTab record={record} />}
        {tab === "comments" && <CommentsTab record={record} />}
        {tab === "ai-ocr"   && <AiOcrTab record={record} />}
        {tab === "audit"    && <AuditTab record={record} />}
      </div>

      {revisionOpen && (
        <RevisionRequestModal record={record} onClose={() => setRevisionOpen(false)} />
      )}
      {supplierOpen && (
        <SupplierProfileDrawer record={record} onClose={() => setSupplierOpen(false)} />
      )}
    </Card>
  );
}

/* ---------- Tabs ---------- */

function DetailsTab({
  record, role, onResubmit, onOpenSupplier,
}: {
  record: ReviewRecord;
  role: Role;
  onResubmit: (response: string, edited?: Record<string, string>) => void;
  onOpenSupplier: () => void;
}) {
  return (
    <div className="space-y-4">
      <ul className="divide-y divide-ink-200 rounded-xl border border-ink-200 overflow-hidden">
        <KV label="Property"      value={record.property} />
        <KV label="Pillar / type" value={`${record.pillar} · ${record.dataType}`} />
        <KV label="Source"        value={record.source} />
        <KV label="Period"        value={record.period} />
        <KV label="Value"         value={record.value} />
        {record.cost       && <KV label="Cost"        value={record.cost} />}
        {record.meterId    && <KV label="Meter ID"    value={record.meterId} />}
        {record.invoiceRef && <KV label="Invoice ref" value={record.invoiceRef} />}
        <KV label="Input method" value={record.method} />
        <KV label="Submitted by" value={`${record.submittedBy} (${record.submittedByRole})`} />
        <KV label="Submitted at" value={record.submittedAt} />
      </ul>

      {record.supplierSubmitted && (
        <div className="rounded-xl border border-pillar-social/25 bg-pillar-social/5 p-3 flex items-start gap-2 text-sm">
          <Truck size={14} className="text-pillar-social mt-0.5" />
          <div>
            <div className="text-pillar-social font-semibold">
              Supplier submission — {record.supplierName}
            </div>
            <div className="text-[12px] text-pillar-social">
              Data submitted via the Supplier Portal. Supplier corrections to previously approved records re-trigger Maker–Checker review.
            </div>
            <button onClick={onOpenSupplier} className="text-[12px] font-semibold text-pillar-social underline mt-1">
              Open supplier profile
            </button>
          </div>
        </div>
      )}

      <SlaPanel record={record} />

      {/* Query rounds — multi-round */}
      {record.queryRounds.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-ink-900 mb-2">
            Query workflow ({record.queryRounds.length} round{record.queryRounds.length > 1 ? "s" : ""})
          </div>
          <ul className="space-y-2">
            {record.queryRounds.map((r) => (
              <li key={r.round} className="rounded-xl border border-ink-200 p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-[12px] font-semibold text-ink-700">Round {r.round}</div>
                  {r.resolved ? (
                    <Badge tone="good"><CheckCircle2 size={11} /> Resolved</Badge>
                  ) : r.response ? (
                    <Badge tone="info">Awaiting checker</Badge>
                  ) : (
                    <Badge tone="warn">Awaiting maker</Badge>
                  )}
                </div>
                <div className="text-sm">
                  <div className="text-[11px] text-ink-500">{r.raisedBy} · {r.raisedAt}</div>
                  <div className="text-ink-800">{r.message}</div>
                </div>
                {r.response && (
                  <div className="mt-2 rounded-lg bg-ink-50 p-2 text-sm">
                    <div className="text-[11px] text-ink-500">{r.response.by} · {r.response.at}</div>
                    <div className="text-ink-800">{r.response.message}</div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Maker response UI — shown when role=maker and record is queried with unanswered round */}
      {role === "maker" && record.status === "queried" &&
        record.queryRounds.some((qr) => !qr.resolved && !qr.response) && (
        <MakerResponsePanel record={record} onResubmit={onResubmit} />
      )}

      {/* Checker — resolve query button when maker has responded */}
      {role === "checker" && record.status === "resubmitted" &&
        record.queryRounds.some((qr) => qr.response && !qr.resolved) && (
        <div className="rounded-xl border border-info/25 bg-info/5 p-3 text-[13px] text-info">
          <div className="font-semibold mb-1">Maker has responded — Queried · Maker responded</div>
          <div className="text-[12px]">Review the before/after values in the Audit trail tab, then Approve or raise another query round.</div>
        </div>
      )}
    </div>
  );
}

/* =================================================================== */
/* Maker response panel (FR-2 query workflow)                          */
/* =================================================================== */

function MakerResponsePanel({
  record, onResubmit,
}: {
  record: ReviewRecord;
  onResubmit: (response: string, edited?: Record<string, string>) => void;
}) {
  const [response, setResponse] = useState("");
  const [editedValue, setEditedValue] = useState(record.value);
  const [editingValue, setEditingValue] = useState(false);
  const canResubmit = response.trim().length > 0 || editedValue !== record.value;

  return (
    <div className="rounded-xl border-2 border-info/30 bg-info/5 p-4 space-y-3">
      <div className="flex items-center gap-2 text-info font-semibold text-[13px]">
        <MessageCircle size={14} /> Maker response required
      </div>

      {/* Inline value edit */}
      <div>
        <div className="text-[12px] font-medium text-ink-700 mb-1">
          Current value <span className="text-ink-400 font-normal">(edit if correcting the data)</span>
        </div>
        {editingValue ? (
          <div className="flex items-center gap-2">
            <input
              className="input flex-1"
              value={editedValue}
              onChange={(e) => setEditedValue(e.target.value)}
            />
            <button onClick={() => setEditingValue(false)} className="btn-secondary h-8 px-2 text-[11px]">Done</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex-1 rounded-lg border px-3 py-2 text-sm font-medium",
              editedValue !== record.value ? "border-info/40 bg-white text-info" : "border-ink-200 bg-ink-50 text-ink-900"
            )}>
              {editedValue}
              {editedValue !== record.value && (
                <span className="ml-2 text-[11px] text-ink-500 font-normal line-through">{record.value}</span>
              )}
            </div>
            <button onClick={() => setEditingValue(true)} className="btn-ghost h-8 px-2 text-[11px]">
              <Pencil size={11} /> Edit
            </button>
          </div>
        )}
      </div>

      {/* Response text */}
      <div>
        <div className="text-[12px] font-medium text-ink-700 mb-1">
          Response to checker <span className="text-bad ml-0.5">*</span>
        </div>
        <textarea
          className="input min-h-[72px] py-2 text-sm"
          placeholder="Explain what was corrected and why…"
          value={response}
          onChange={(e) => setResponse(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <div className="text-[11px] text-ink-500 flex-1">
          Resubmit is only active when you've entered a response or edited the value.
        </div>
        <button
          disabled={!canResubmit}
          onClick={() => onResubmit(response, editedValue !== record.value ? { value: editedValue } : undefined)}
          className="btn-primary disabled:opacity-40"
        >
          <ArrowRight size={14} /> Resubmit for review
        </button>
      </div>
    </div>
  );
}

function SlaPanel({ record }: { record: ReviewRecord }) {
  const overdue = (record.overdueDays ?? 0) > 0;
  return (
    <div className={cn(
      "rounded-xl border p-3 flex items-start gap-2 text-sm",
      overdue ? "border-bad/25 bg-bad/5" : "border-ink-200 bg-ink-50/40"
    )}>
      <Clock size={14} className={cn("mt-0.5", overdue ? "text-bad" : "text-ink-500")} />
      <div>
        <div className={cn("font-semibold", overdue ? "text-bad" : "text-ink-900")}>
          {overdue ? `${record.overdueDays} days overdue` : "Within SLA"}
        </div>
        <div className="text-[12px] text-ink-600">
          Due {record.dueAt}. SLA escalation: Day 1 → Submitter · Day 3 → Sustainability Manager · Day 7 → General Manager.
        </div>
      </div>
    </div>
  );
}

function EvidenceTab({ record }: { record: ReviewRecord }) {
  const [previewItem, setPreviewItem] = useState<ReviewRecord["evidence"][number] | null>(null);

  if (record.evidence.length === 0) {
    return (
      <div className="rounded-xl border border-warn/25 bg-warn/5 p-4 text-sm text-warn">
        No evidence file attached. Audit-ready submissions should include source documentation.
      </div>
    );
  }

  function iconFor(type: string) {
    if (type.toLowerCase().includes("pdf") || type.toLowerCase().includes("doc")) return <FileText size={16} />;
    if (type.toLowerCase().includes("xls") || type.toLowerCase().includes("csv")) return <FileSpreadsheet size={16} />;
    if (type.toLowerCase().includes("image") || type.toLowerCase().includes("png") || type.toLowerCase().includes("jpg")) return <ImageIcon size={16} />;
    if (type.toLowerCase().includes("api")) return <Link2 size={16} />;
    return <FileText size={16} />;
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {record.evidence.map((e) => (
          <li key={e.name} className="flex items-center gap-3 rounded-xl border border-ink-200 p-3">
            <div className="w-10 h-10 rounded-lg bg-brand-50 grid place-items-center text-brand-700 shrink-0">
              {iconFor(e.type)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-ink-900 truncate">{e.name}</div>
              <div className="text-[11px] text-ink-500">{e.type} · {e.size}</div>
            </div>
            <button onClick={() => setPreviewItem(e)} className="btn-ghost h-8 px-2 text-[12px] text-brand-700">
              <Eye size={14} /> Preview
            </button>
            <button className="btn-ghost h-8 px-2 text-[12px] text-ink-500">
              <Download size={14} />
            </button>
          </li>
        ))}
      </ul>

      {/* Inline preview panel */}
      {previewItem && (
        <div className="rounded-xl border border-ink-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-ink-50 border-b border-ink-200">
            <div className="text-[12px] font-semibold text-ink-700">{previewItem.name}</div>
            <button onClick={() => setPreviewItem(null)} className="w-6 h-6 grid place-items-center rounded hover:bg-ink-200">
              <X size={12} />
            </button>
          </div>
          <EvidencePreview item={previewItem} record={record} />
        </div>
      )}
    </div>
  );
}

function EvidencePreview({
  item, record,
}: {
  item: ReviewRecord["evidence"][number];
  record: ReviewRecord;
}) {
  const type = item.type.toLowerCase();

  if (type.includes("image") || type.includes("png") || type.includes("jpg") || type.includes("jpeg")) {
    return (
      <div className="bg-ink-900 grid place-items-center min-h-[200px] p-4">
        <div className="rounded-xl overflow-hidden border border-ink-700 w-full max-w-sm aspect-[4/3] bg-ink-800 grid place-items-center text-ink-400">
          <div className="text-center">
            <ImageIcon size={40} className="mx-auto mb-2 opacity-50" />
            <div className="text-[12px]">Image preview — {item.name}</div>
            <div className="text-[11px] mt-1 opacity-60">{item.size}</div>
          </div>
        </div>
      </div>
    );
  }

  if (type.includes("xls") || type.includes("csv")) {
    return (
      <div className="p-4 overflow-x-auto">
        <div className="text-[11px] text-ink-500 mb-2">Source rows — {item.name}</div>
        <table className="min-w-full text-[12px]">
          <thead>
            <tr className="bg-ink-50">
              {["Period", "Source", "Consumption", "Unit", "Cost"].map((h) => (
                <th key={h} className="table-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="table-td">{record.period}</td>
              <td className="table-td capitalize">{record.source}</td>
              <td className="table-td font-medium tabular-nums">{record.value}</td>
              <td className="table-td">kWh</td>
              <td className="table-td tabular-nums">{record.cost ?? "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  if (type.includes("api") || type.includes("sync")) {
    return (
      <div className="p-4 bg-ink-900 text-good font-mono text-[11px] rounded-b-xl overflow-x-auto">
        <div className="text-ink-400 mb-2">// Raw API record</div>
        {`{
  "source": "${record.source}",
  "period": "${record.period}",
  "consumption": ${record.value.replace(/[^\d.]/g, "")},
  "unit": "kWh",
  "sync_timestamp": "${record.submittedAt}",
  "integration": "BMS / SCADA"
}`}
      </div>
    );
  }

  // Default: PDF / DOCX viewer placeholder
  return (
    <div className="bg-ink-50 grid place-items-center min-h-[200px] p-6 text-center">
      <div>
        <FileText size={36} className="mx-auto text-ink-400 mb-2" />
        <div className="text-sm font-semibold text-ink-700">{item.name}</div>
        <div className="text-[12px] text-ink-500 mt-1">{item.type} · {item.size}</div>
        <button className="btn-secondary mt-3">
          <Download size={14} /> Download to view
        </button>
      </div>
    </div>
  );
}

function CommentsTab({ record }: { record: ReviewRecord }) {
  if (record.comments.length === 0)
    return <div className="text-[13px] text-ink-500">No comments yet.</div>;
  return (
    <ul className="space-y-2">
      {record.comments.map((c) => (
        <li key={c.id} className="rounded-xl border border-ink-200 p-3">
          <div className="text-[12px] text-ink-500">
            {c.author} · {ROLE_LABEL[c.role]} · {c.at}
          </div>
          <div className="text-sm text-ink-800 mt-0.5">{c.message}</div>
        </li>
      ))}
    </ul>
  );
}

function AiOcrTab({ record }: { record: ReviewRecord }) {
  const hasOcr = record.ocrFields && record.ocrFields.length > 0;
  const hasAi  = record.aiSuggestions && record.aiSuggestions.length > 0;
  if (!hasOcr && !hasAi) {
    return <div className="text-[13px] text-ink-500">No AI / OCR data on this record.</div>;
  }

  return (
    <div className="space-y-4">
      {/* Three-column comparison table — GHG Protocol / GRI assurance-ready */}
      {hasOcr && (
        <div>
          <div className="text-sm font-semibold text-ink-900 mb-2">
            OCR extraction decision chain
            <span className="ml-2 text-[11px] font-normal text-ink-400">GHG Protocol · GRI assurance</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-ink-200">
            <table className="min-w-full text-[12px]">
              <thead className="bg-ink-50">
                <tr>
                  <th className="table-th">Field</th>
                  <th className="table-th">AI / OCR value</th>
                  <th className="table-th">Maker value</th>
                  <th className="table-th">Checker decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {record.ocrFields!.map((f) => {
                  const tone = f.confidence >= 85 ? "good" : f.confidence >= 70 ? "warn" : "bad";
                  const edited = f.edited && f.edited !== f.extracted;
                  return (
                    <tr key={f.key} className={cn(tone !== "good" && "bg-warn/5")}>
                      <td className="table-td font-medium text-ink-700">{f.label}</td>
                      <td className="table-td">
                        <div className="flex items-center gap-2">
                          <code className={cn("text-ink-900", tone !== "good" && "text-warn")}>{f.extracted}</code>
                          <Badge tone={tone}>{f.confidence}%</Badge>
                        </div>
                      </td>
                      <td className="table-td">
                        {edited ? (
                          <div>
                            <code className="text-brand-700 font-semibold">{f.edited}</code>
                            <div className="text-[10px] text-ink-400 mt-0.5">edited by maker</div>
                          </div>
                        ) : (
                          <code className="text-ink-500">accepted as-is</code>
                        )}
                      </td>
                      <td className="table-td text-ink-400 text-[11px]">
                        {record.locked ? (
                          <Badge tone="good"><Check size={10} /> Approved</Badge>
                        ) : record.status === "queried" ? (
                          <Badge tone="warn">Under query</Badge>
                        ) : (
                          <span className="text-ink-400">Pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {hasAi && (
        <div>
          <div className="text-sm font-semibold text-ink-900 mb-2 flex items-center gap-2">
            <Sparkles size={14} className="text-brand-700" /> AI suggestions decision chain
          </div>
          <div className="overflow-x-auto rounded-xl border border-ink-200">
            <table className="min-w-full text-[12px]">
              <thead className="bg-ink-50">
                <tr>
                  <th className="table-th">Field</th>
                  <th className="table-th">AI suggested value</th>
                  <th className="table-th">Maker decision</th>
                  <th className="table-th">Checker decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {record.aiSuggestions!.map((s, i) => (
                  <tr key={i}>
                    <td className="table-td font-medium text-ink-700">{s.field}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <code className="text-ink-900">{s.suggestion}</code>
                        <Badge tone={s.confidence >= 85 ? "good" : s.confidence >= 70 ? "warn" : "bad"}>
                          {s.confidence}%
                        </Badge>
                      </div>
                    </td>
                    <td className="table-td">
                      {s.accepted ? (
                        <Badge tone="good"><Check size={10} /> Accepted</Badge>
                      ) : (
                        <Badge tone="neutral">Overridden</Badge>
                      )}
                    </td>
                    <td className="table-td text-[11px]">
                      {record.locked ? (
                        <Badge tone="good"><Check size={10} /> Approved</Badge>
                      ) : (
                        <span className="text-ink-400">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 text-[12px] text-brand-900 flex items-start gap-2">
        <ShieldCheck size={14} className="text-brand-700 mt-0.5" />
        <span>
          AI is assistive, never authoritative. The maker reviews all AI/OCR suggestions before submission, and the audit trail records both the original AI suggestion and the human decision.
        </span>
      </div>
    </div>
  );
}

function AuditTab({ record }: { record: ReviewRecord }) {
  return (
    <ul className="space-y-2">
      {record.audit.map((a, i) => (
        <li key={i} className="rounded-xl border border-ink-200 p-3 text-sm">
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="font-semibold text-ink-900">{actionLabel(a.action)}</span>
            <span className="text-[11px] text-ink-500">{a.at}</span>
          </div>
          <div className="text-[12px] text-ink-700">
            {a.actor} · {ROLE_LABEL[a.actorRole]}
          </div>
          {(a.field || a.oldValue || a.newValue) && (
            <div className="text-[12px] text-ink-700 mt-1">
              <span className="text-ink-500">{a.field ?? "value"}: </span>
              <code className="text-ink-500 line-through">{a.oldValue ?? "—"}</code>
              <ChevronUp size={10} className="inline mx-1 text-ink-400" />
              <code className="text-brand-700 font-semibold">{a.newValue}</code>
            </div>
          )}
          {a.note && <div className="text-[12px] text-ink-600 mt-1 italic">"{a.note}"</div>}
        </li>
      ))}
    </ul>
  );
}

function actionLabel(a: ReviewRecord["audit"][number]["action"]) {
  return {
    "draft-saved":       "Draft saved",
    "submitted":         "Submitted",
    "queried":           "Queried",
    "resubmitted":       "Resubmitted",
    "approved":          "Approved",
    "rejected":          "Rejected",
    "locked":            "Locked",
    "edit":              "Edited",
    "comment-added":     "Comment added",
    "evidence-uploaded": "Evidence uploaded",
  }[a];
}

/* =================================================================== */
/* Tiny shared helpers                                                  */
/* =================================================================== */

function KV({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
      <span className="text-[12px] text-ink-500 w-32 shrink-0">{label}</span>
      <span className="flex-1 text-ink-900 font-medium break-all capitalize">{value}</span>
    </li>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-ink-500">{label}</span>
      <select
        className="input mt-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

/* =================================================================== */
/* Revision Request Modal                                               */
/* =================================================================== */

const REVISION_REASONS = [
  "Data entry error",
  "Unit conversion error",
  "Wrong billing period",
  "Duplicate record",
  "Source data corrected by provider",
  "Audit finding",
  "Other",
];

function RevisionRequestModal({
  record, onClose,
}: {
  record: ReviewRecord;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [proposedValue, setProposedValue] = useState(record.value);
  const [files, setFiles] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
        <div className="bg-white rounded-2xl shadow-pop max-w-md w-full p-8 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-good/10 grid place-items-center text-good">
            <CheckCircle2 size={28} />
          </div>
          <h3 className="text-lg font-bold text-ink-900">Revision request submitted</h3>
          <p className="text-[13px] text-ink-500">
            The request has been sent to the checker. The original value ({record.value}) is preserved in the audit trail until approved.
          </p>
          <button onClick={onClose} className="btn-primary">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
      <div className="bg-white rounded-2xl shadow-pop max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-200">
          <h3 className="text-base font-bold text-ink-900">Revision request — Record {record.id}</h3>
          <button onClick={onClose} className="w-7 h-7 grid place-items-center rounded-lg hover:bg-ink-100">
            <X size={14} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="rounded-xl bg-warn/5 border border-warn/25 p-3 text-[12px] text-warn">
            Approved records cannot be silently edited. This revision goes through Maker–Checker. The original value is preserved.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[12px] font-medium text-ink-600">Original value <span className="text-ink-400">(read-only)</span></span>
              <input className="input mt-1 bg-ink-50 text-ink-500" value={record.value} readOnly />
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-ink-600">Proposed corrected value <span className="text-bad">*</span></span>
              <input className="input mt-1" value={proposedValue} onChange={(e) => setProposedValue(e.target.value)} />
            </label>
          </div>

          <label className="block">
            <span className="text-[12px] font-medium text-ink-600">Reason for correction <span className="text-bad">*</span></span>
            <select className="input mt-1" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">— Select reason —</option>
              {REVISION_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="text-[12px] font-medium text-ink-600">Additional detail</span>
            <textarea
              className="input mt-1 min-h-[72px] py-2"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Describe what changed and why…"
            />
          </label>

          <div>
            <span className="text-[12px] font-medium text-ink-600">Supporting evidence</span>
            <div className="mt-1 rounded-xl border-2 border-dashed border-ink-200 p-3 text-center text-[12px] text-ink-500">
              <Upload size={16} className="mx-auto mb-1 text-ink-400" />
              Attach corrected bill, audit finding, or other evidence
              <input type="file" multiple className="mt-1 text-[12px]" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
              {files.length > 0 && <div className="mt-1 text-ink-700">{files.length} file(s) selected</div>}
            </div>
          </div>

          <div className="rounded-xl bg-ink-50 border border-ink-200 p-3 text-[12px] text-ink-600 space-y-1">
            <div className="flex justify-between"><span className="text-ink-400">Requested by</span><span className="font-medium">Demo Maker (session)</span></div>
            <div className="flex justify-between"><span className="text-ink-400">Approval route</span><span className="font-medium">Checker → Property SM</span></div>
            <div className="flex justify-between"><span className="text-ink-400">Audit trail</span><span className="font-medium text-brand-700 underline cursor-pointer">Record {record.id}</span></div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-ink-200">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              disabled={!reason || !proposedValue || proposedValue === record.value}
              onClick={() => setSubmitted(true)}
              className="btn-primary disabled:opacity-40"
            >
              Submit revision request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =================================================================== */
/* Supplier Profile Drawer                                              */
/* =================================================================== */

function SupplierProfileDrawer({
  record, onClose,
}: {
  record: ReviewRecord;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
      <div className="bg-white w-full max-w-sm h-full overflow-y-auto shadow-pop">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-200">
          <div>
            <h3 className="text-base font-bold text-ink-900">{record.supplierName ?? "Supplier"}</h3>
            <div className="text-[11px] text-ink-500">Supplier profile</div>
          </div>
          <button onClick={onClose} className="w-7 h-7 grid place-items-center rounded-lg hover:bg-ink-100">
            <X size={14} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-pillar-social/10 grid place-items-center text-pillar-social">
            <Truck size={20} />
          </div>

          <ul className="divide-y divide-ink-200 rounded-xl border border-ink-200 overflow-hidden">
            <KV label="Supplier name"     value={record.supplierName ?? "—"} />
            <KV label="Product / service" value={record.dataType ?? "—"} />
            <KV label="EF declaration"    value="Submitted · Apr 2026" />
            <KV label="Certificate"       value="ISO 14001 · Valid" />
            <KV label="Data freshness"    value="Last updated 14 days ago" />
            <KV label="Reuse permission"  value="Granted" />
            <KV label="Linked record"     value={record.id} />
          </ul>

          <div className="rounded-xl bg-pillar-social/5 border border-pillar-social/20 p-3 text-[12px] text-pillar-social">
            Supplier data submitted via the Supplier Portal. Corrections to approved records re-trigger the full Maker–Checker review.
          </div>

          <div className="flex gap-2">
            <button className="btn-secondary flex-1"><User size={14} /> View full profile</button>
            <button className="btn-secondary flex-1"><Link2 size={14} /> Procurement link</button>
          </div>
        </div>
      </div>
    </div>
  );
}
