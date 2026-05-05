import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Bell,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Filter,
  History,
  Info,
  Inbox,
  Link2,
  Lock,
  Mail,
  MessageCircle,
  Plus,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Truck,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import DemoNotice from "@/components/ui/DemoNotice";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import Modal from "@/components/ui/Modal";
import { SUPPLIERS } from "@/lib/mock";
import { cn } from "@/lib/utils";

type ViewAs = "client" | "supplier";
type EFStatus = "submitted" | "pending" | "overdue";

/* ---------- Extended supplier data ---------- */

type SupplierExt = {
  id: string;
  efStatus: EFStatus;
  dataFreshness: string;
  linkedRecords: number;
  contact: string;
  email: string;
  product: string;
  efValue: string;
  efUnit: string;
  efMethodology: string;
  certificate: string;
  reusePermission: boolean;
};

const SUPPLIER_EXT: Record<string, SupplierExt> = {
  "S-201": { id: "S-201", efStatus: "submitted", dataFreshness: "2026-04-22", linkedRecords: 38, contact: "Marco Rossi", email: "esg@aurora-linens.eu", product: "Linen laundry — standard", efValue: "0.92", efUnit: "kgCO₂e/kg", efMethodology: "Tier 1 — supplier-specific", certificate: "ISO 14001 · EU Ecolabel", reusePermission: true },
  "S-202": { id: "S-202", efStatus: "overdue",   dataFreshness: "2025-11-30", linkedRecords: 12, contact: "Ana García",  email: "sustainability@freshleaf.es", product: "Fresh produce — apples", efValue: "1.80", efUnit: "kgCO₂e/kg", efMethodology: "Tier 2 — database proxy", certificate: "GlobalG.A.P.", reusePermission: false },
  "S-203": { id: "S-203", efStatus: "submitted", dataFreshness: "2026-03-01", linkedRecords: 7,  contact: "Ji-ho Kim",   email: "esg@koreatextile.kr", product: "Uniforms — cotton blend", efValue: "3.20", efUnit: "kgCO₂e/kg", efMethodology: "Tier 1 — supplier-specific", certificate: "OEKO-TEX · Fair Wear", reusePermission: true },
  "S-204": { id: "S-204", efStatus: "pending",   dataFreshness: "2026-01-15", linkedRecords: 21, contact: "Lena Berg",   email: "csr@nordicfresh.se", product: "Breakfast ingredients", efValue: "—",    efUnit: "—",           efMethodology: "Pending submission", certificate: "Organic cert EU", reusePermission: false },
  "S-205": { id: "S-205", efStatus: "submitted", dataFreshness: "2026-04-10", linkedRecords: 4,  contact: "Sara Yıldız", email: "esg@azureclean.tr", product: "Cleaning chemicals",    efValue: "0.14", efUnit: "kgCO₂e/L", efMethodology: "Tier 1 — supplier-specific", certificate: "Ecolabel · ISO 14001", reusePermission: true },
};

const EF_STATUS_TONE: Record<EFStatus, "good" | "warn" | "bad"> = {
  submitted: "good", pending: "warn", overdue: "bad",
};
const EF_STATUS_LABEL: Record<EFStatus, string> = {
  submitted: "Submitted", pending: "Pending", overdue: "Overdue",
};

/* ---------- EF declaration log ---------- */

type EFDecl = {
  id: string;
  supplier: string;
  product: string;
  value: string;
  unit: string;
  submittedDate: string;
  validFrom: string;
  validTo: string;
  status: "approved" | "pending" | "rejected";
};

const EF_DECLARATIONS: EFDecl[] = [
  { id: "ef-1", supplier: "Aurora Linens Co.",  product: "Linen laundry — standard",   value: "0.92", unit: "kgCO₂e/kg",   submittedDate: "2026-04-20", validFrom: "2026-Q2", validTo: "2027-Q1", status: "approved" },
  { id: "ef-2", supplier: "Aurora Linens Co.",  product: "Linen laundry — eco",         value: "0.74", unit: "kgCO₂e/kg",   submittedDate: "2026-04-20", validFrom: "2026-Q2", validTo: "2027-Q1", status: "approved" },
  { id: "ef-3", supplier: "FreshLeaf Produce",  product: "Fresh produce — apples",      value: "1.80", unit: "kgCO₂e/kg",   submittedDate: "2026-04-15", validFrom: "2026-Q2", validTo: "2026-Q4", status: "pending"  },
  { id: "ef-4", supplier: "Korea Textile",      product: "Uniforms — cotton blend",     value: "3.20", unit: "kgCO₂e/kg",   submittedDate: "2026-03-01", validFrom: "2026-Q1", validTo: "2026-Q4", status: "approved" },
  { id: "ef-5", supplier: "Azure Clean",        product: "Cleaning chemicals",          value: "0.14", unit: "kgCO₂e/L",    submittedDate: "2026-04-10", validFrom: "2026-Q2", validTo: "2027-Q1", status: "pending"  },
];

/* ================================================================== */

export default function SupplierPortal() {
  const [viewAs, setViewAs] = useState<ViewAs>("client");

  return (
    <div className="space-y-5">
      <DemoNotice message="Supplier emission factors shown are representative samples. In a live environment, factors are submitted and verified by each supplier." />
      <PageHeader
        eyebrow="Supplier management"
        title="Supplier Portal"
        subtitle="9 supplier records need re-review after recent corrections — unresolved supplier data affects your Scope 3 calculations. Supplier emission factors are entered once and reused across all clients they serve."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-ink-500">Viewing as</span>
            <select
              value={viewAs}
              onChange={(e) => setViewAs(e.target.value as ViewAs)}
              className="h-9 px-3 rounded-lg border border-ink-200 bg-white text-sm font-medium text-ink-900"
            >
              <option value="client">Client (hotel checker)</option>
              <option value="supplier">Supplier (Aurora Linens Co.)</option>
            </select>
          </div>
        }
      />

      {viewAs === "client" ? <ClientView /> : <SupplierView />}

      <ConfidentialityCallout />
    </div>
  );
}

/* =================================================================== */
/* Client view                                                          */
/* =================================================================== */

function ClientView() {
  const [search, setSearch]           = useState("");
  const [efFilter, setEfFilter]       = useState<"all" | EFStatus>("all");
  const [profileId, setProfileId]     = useState<string | null>(null);
  const [requestId, setRequestId]     = useState<string | null>(null);
  const [inviteOpen, setInviteOpen]   = useState(false);

  const filtered = SUPPLIERS.filter((s) => {
    const ext = SUPPLIER_EXT[s.id];
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase());
    const matchEF = efFilter === "all" || ext?.efStatus === efFilter;
    return matchSearch && matchEF;
  });

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tile label="Suppliers invited"    value="120" tone="info" />
        <Tile label="Active responses"     value="68"  tone="good" hint="57% response rate" />
        <Tile label="Attestations on file" value="312" tone="info" />
        <Tile label="Pending re-review"    value="9"   tone="warn" hint="supplier corrections" />
      </div>

      {/* Supplier directory */}
      <Card>
        <CardHeader
          title="Supplier directory"
          hint="EF declarations · data freshness · linked records"
          right={
            <button className="btn-primary" onClick={() => setInviteOpen(true)}>
              <Plus size={14} /> Invite supplier
            </button>
          }
        />
        <div className="px-5 pb-3 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              className="input pl-8"
              placeholder="Search suppliers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-ink-400" />
            {(["all","submitted","pending","overdue"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setEfFilter(s)}
                className={cn("tab capitalize text-[11px]", efFilter === s && "tab-active")}
              >
                {s === "all" ? "All" : EF_STATUS_LABEL[s as EFStatus]}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Supplier</th>
                <th className="table-th">Category</th>
                <th className="table-th">Country</th>
                <th className="table-th">EF declaration</th>
                <th className="table-th">Data freshness</th>
                <th className="table-th">Linked records</th>
                <th className="table-th">Response</th>
                <th className="table-th text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const ext = SUPPLIER_EXT[s.id];
                return (
                  <tr key={s.id} className="hover:bg-ink-50/60">
                    <td className="table-td font-medium text-ink-900">
                      <div className="flex items-center gap-2">
                        <Truck size={13} className="text-brand-700 shrink-0" />
                        <button className="hover:underline text-left" onClick={() => setProfileId(s.id)}>{s.name}</button>
                      </div>
                    </td>
                    <td className="table-td">{s.category}</td>
                    <td className="table-td">{s.country}</td>
                    <td className="table-td">
                      {ext ? (
                        <Badge tone={EF_STATUS_TONE[ext.efStatus]}>{EF_STATUS_LABEL[ext.efStatus]}</Badge>
                      ) : <span className="text-ink-400 text-[12px]">—</span>}
                    </td>
                    <td className="table-td text-[12px] text-ink-600">{ext?.dataFreshness ?? "—"}</td>
                    <td className="table-td">
                      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-700">
                        <Link2 size={11} className="text-ink-400" /> {ext?.linkedRecords ?? 0}
                      </span>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div className="w-20"><ProgressBar value={s.response} tone={s.response >= 80 ? "good" : s.response >= 50 ? "warn" : "bad"} /></div>
                        <span className="font-semibold text-[12px] w-8 text-right tabular-nums">{s.response}%</span>
                      </div>
                    </td>
                    <td className="table-td text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="btn-ghost h-7 px-2 text-[12px] text-brand-700"
                          onClick={() => setProfileId(s.id)}
                        >
                          <Eye size={11} /> Profile
                        </button>
                        <button
                          className="btn-ghost h-7 px-2 text-[12px] text-ink-700"
                          onClick={() => setRequestId(s.id)}
                        >
                          <Send size={11} /> Request
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* EF declaration log */}
      <Card>
        <CardHeader
          title="EF declaration log"
          hint="All submitted emission factor declarations — approve or reject per entry."
        />
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Supplier</th>
                <th className="table-th">Product / service</th>
                <th className="table-th">EF value</th>
                <th className="table-th">Submitted</th>
                <th className="table-th">Valid</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {EF_DECLARATIONS.map((d) => (
                <tr key={d.id} className="hover:bg-ink-50/60">
                  <td className="table-td font-medium text-ink-900">{d.supplier}</td>
                  <td className="table-td text-ink-700">{d.product}</td>
                  <td className="table-td font-mono text-[12px]">
                    {d.value} <span className="text-ink-500">{d.unit}</span>
                  </td>
                  <td className="table-td text-ink-600 text-[12px]">{d.submittedDate}</td>
                  <td className="table-td text-ink-600 text-[12px]">{d.validFrom} → {d.validTo}</td>
                  <td className="table-td">
                    <Badge tone={d.status === "approved" ? "good" : d.status === "pending" ? "warn" : "bad"} className="capitalize">
                      {d.status}
                    </Badge>
                  </td>
                  <td className="table-td text-right pr-6">
                    {d.status === "pending" ? (
                      <div className="flex items-center justify-end gap-1">
                        <button className="btn-ghost h-7 px-2 text-[12px] text-good">
                          <Check size={12} /> Approve
                        </button>
                        <button className="btn-ghost h-7 px-2 text-[12px] text-bad">
                          <X size={12} /> Reject
                        </button>
                      </div>
                    ) : (
                      <button className="btn-ghost h-7 px-2 text-[12px] text-ink-500">
                        <Eye size={12} /> View
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Re-review queue */}
      <Card>
        <CardHeader title="Re-review queue" hint="Triggered when suppliers correct previously approved data" />
        <ul className="p-5 space-y-2 text-sm">
          <ReReviewRow
            supplier="FreshLeaf Produce"
            field="Cat 1 EF — apples"
            change="2.10 → 1.80 kgCO₂e/kg"
            reason="Updated supplier-specific EF for new harvest contract"
            tone="warn"
          />
          <ReReviewRow
            supplier="Aurora Linens Co."
            field="Linen laundry weight (Mar 2026)"
            change="42,000 → 38,500 kg"
            reason="Reconciliation against weighing slips"
            tone="info"
          />
        </ul>
      </Card>

      {/* Profile drawer */}
      {profileId && (
        <SupplierProfileDrawer
          supplierId={profileId}
          onClose={() => setProfileId(null)}
          onRequest={() => { setRequestId(profileId); setProfileId(null); }}
        />
      )}

      {/* Data request modal */}
      <DataRequestModal
        supplierId={requestId}
        onClose={() => setRequestId(null)}
      />

      {/* Invite supplier wizard */}
      <InviteSupplierModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  );
}

/* ---------- Supplier profile drawer ---------- */

function SupplierProfileDrawer({
  supplierId,
  onClose,
  onRequest,
}: {
  supplierId: string;
  onClose: () => void;
  onRequest: () => void;
}) {
  const supplier = SUPPLIERS.find((s) => s.id === supplierId);
  const ext      = SUPPLIER_EXT[supplierId];
  if (!supplier || !ext) return null;

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Contact",         value: ext.contact },
    { label: "Email",           value: <a href={`mailto:${ext.email}`} className="text-brand-700 underline">{ext.email}</a> },
    { label: "Product / service", value: ext.product },
    { label: "EF declaration",  value: `${ext.efValue} ${ext.efUnit}` },
    { label: "Methodology",     value: ext.efMethodology },
    { label: "Certificate",     value: ext.certificate },
    { label: "Data freshness",  value: ext.dataFreshness },
    { label: "EF status",       value: <Badge tone={EF_STATUS_TONE[ext.efStatus]}>{EF_STATUS_LABEL[ext.efStatus]}</Badge> },
    { label: "Linked records",  value: `${ext.linkedRecords} consumption records` },
    { label: "Reuse permission",value: ext.reusePermission
        ? <span className="flex items-center gap-1 text-good text-[12px]"><ShieldCheck size={12} /> Allowed for all clients</span>
        : <span className="flex items-center gap-1 text-warn text-[12px]"><AlertTriangle size={12} /> Restricted</span> },
  ];

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div
        className="relative h-full w-full max-w-md bg-white shadow-2xl flex flex-col border-l border-ink-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-ink-200">
          <div>
            <div className="flex items-center gap-2 text-ink-500 text-[11px] mb-1">
              <Truck size={11} /> Supplier profile
            </div>
            <div className="text-lg font-bold text-ink-900">{supplier.name}</div>
            <div className="text-[12px] text-ink-500">{supplier.category} · {supplier.country}</div>
          </div>
          <button onClick={onClose} className="btn-ghost h-8 w-8 p-0 grid place-items-center">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <ul className="divide-y divide-ink-100 rounded-xl border border-ink-200 overflow-hidden">
            {rows.map(({ label, value }) => (
              <li key={label} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="text-[11px] text-ink-500 shrink-0 w-36">{label}</span>
                <span className="font-medium text-ink-900 text-right">{value}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-ink-200 flex gap-2">
          <button className="btn-secondary flex-1" onClick={onClose}>Close</button>
          <button className="btn-primary flex-1" onClick={onRequest}>
            <Send size={13} /> Request data
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Data request modal ---------- */

type DataRequestForm = {
  dataType: string;
  period: string;
  deadline: string;
  message: string;
};

function DataRequestModal({
  supplierId,
  onClose,
}: {
  supplierId: string | null;
  onClose: () => void;
}) {
  const supplier = SUPPLIERS.find((s) => s.id === supplierId);
  const [form, setForm] = useState<DataRequestForm>({ dataType: "", period: "", deadline: "", message: "" });
  const [sent, setSent] = useState(false);
  const set = <K extends keyof DataRequestForm>(k: K, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function handleClose() {
    setForm({ dataType: "", period: "", deadline: "", message: "" });
    setSent(false);
    onClose();
  }

  const canSend = form.dataType && form.period && form.deadline;

  return (
    <Modal
      open={supplierId !== null}
      onClose={handleClose}
      title={`Request data — ${supplier?.name ?? ""}`}
      subtitle="The supplier will receive an email notification with a link to submit via the portal."
      size="lg"
      footer={
        sent ? (
          <button className="btn-primary" onClick={handleClose}>Done</button>
        ) : (
          <>
            <button className="btn-secondary" onClick={handleClose}>Cancel</button>
            <button
              className={cn("btn-primary", !canSend && "opacity-50 cursor-not-allowed")}
              onClick={() => canSend && setSent(true)}
              disabled={!canSend}
            >
              <Send size={13} /> Send request
            </button>
          </>
        )
      }
    >
      {sent ? (
        <div className="py-6 flex flex-col items-center gap-3 text-center">
          <CheckCircle2 size={40} className="text-good" />
          <div className="text-lg font-bold text-ink-900">Request sent</div>
          <div className="text-sm text-ink-500">
            {supplier?.name} will receive an email with a deadline of {form.deadline}.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[12px] font-medium text-ink-600">Data type <span className="text-bad">*</span></span>
              <select className="input mt-1" value={form.dataType} onChange={(e) => set("dataType", e.target.value)}>
                <option value="">— Select —</option>
                <option>EF declaration (Scope 1)</option>
                <option>EF declaration (Scope 3 Cat 1)</option>
                <option>EF declaration (Scope 3 Cat 4)</option>
                <option>Volume reconciliation</option>
                <option>Certificate renewal</option>
                <option>Modern slavery statement</option>
                <option>Social audit results</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-ink-600">Period <span className="text-bad">*</span></span>
              <select className="input mt-1" value={form.period} onChange={(e) => set("period", e.target.value)}>
                <option value="">— Select —</option>
                <option>Q1 2026</option>
                <option>Q2 2026</option>
                <option>FY 2025</option>
                <option>FY 2026</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-ink-600">Deadline <span className="text-bad">*</span></span>
              <input type="date" className="input mt-1" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} />
            </label>
          </div>
          <label className="block">
            <span className="text-[12px] font-medium text-ink-600">Message to supplier</span>
            <textarea
              className="input mt-1 h-24 resize-none"
              placeholder="Optional context for the supplier…"
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
            />
          </label>
          <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 text-[12px] text-brand-900 flex items-start gap-2">
            <Mail size={13} className="text-brand-700 mt-0.5 shrink-0" />
            One submission satisfies all clients subscribed to this supplier — no duplicate requests.
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ---------- Invite supplier wizard ---------- */

type InviteStep = 1 | 2 | 3;
type InviteForm = {
  name: string;
  email: string;
  company: string;
  categories: string[];
};

const DATA_CATEGORIES = [
  "Scope 3 Cat 1 — purchased goods",
  "Scope 3 Cat 4 — upstream transport",
  "Scope 3 Cat 6 — business travel",
  "Certificates & attestations",
  "Volume reconciliation",
  "Social audit data",
  "Modern slavery statement",
];

function InviteSupplierModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<InviteStep>(1);
  const [form, setForm] = useState<InviteForm>({ name: "", email: "", company: "", categories: [] });
  const [sent, setSent] = useState(false);

  const set = <K extends keyof InviteForm>(k: K, v: InviteForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  function toggleCategory(cat: string) {
    set("categories", form.categories.includes(cat)
      ? form.categories.filter((c) => c !== cat)
      : [...form.categories, cat]);
  }

  function handleClose() {
    setStep(1);
    setForm({ name: "", email: "", company: "", categories: [] });
    setSent(false);
    onClose();
  }

  const step1Valid = form.name && form.email && form.company;
  const step2Valid = form.categories.length > 0;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Invite supplier"
      subtitle="Suppliers get a secure portal link. Their EF declarations satisfy all subscribing clients."
      size="lg"
      tabs={
        <div className="flex items-center gap-1">
          {([
            { n: 1 as InviteStep, label: "Contact" },
            { n: 2 as InviteStep, label: "Data categories" },
            { n: 3 as InviteStep, label: "Send invite" },
          ]).map(({ n, label }) => (
            <button
              key={n}
              onClick={() => !sent && step >= n && setStep(n)}
              className={cn("tab", n === step && "tab-active", n < step && "text-good")}
            >
              <span className={cn(
                "w-5 h-5 rounded-full grid place-items-center text-[10px] font-bold mr-1",
                n === step ? "bg-brand-700 text-white"
                  : n < step ? "bg-good text-white"
                    : "bg-ink-100 text-ink-500"
              )}>
                {n < step ? <Check size={10} /> : n}
              </span>
              {label}
            </button>
          ))}
        </div>
      }
      footer={
        sent ? (
          <button className="btn-primary" onClick={handleClose}>Done</button>
        ) : (
          <>
            <button className="btn-secondary" onClick={handleClose}>Cancel</button>
            {step > 1 && (
              <button className="btn-secondary" onClick={() => setStep((s) => (s - 1) as InviteStep)}>Back</button>
            )}
            {step < 3 ? (
              <button
                className={cn("btn-primary", (step === 1 && !step1Valid) || (step === 2 && !step2Valid) ? "opacity-50 cursor-not-allowed" : "")}
                onClick={() => {
                  if (step === 1 && !step1Valid) return;
                  if (step === 2 && !step2Valid) return;
                  setStep((s) => (s + 1) as InviteStep);
                }}
              >
                Continue <ArrowRight size={14} />
              </button>
            ) : (
              <button className="btn-primary" onClick={() => setSent(true)}>
                <Send size={14} /> Send invite
              </button>
            )}
          </>
        )
      }
    >
      {sent ? (
        <div className="py-6 flex flex-col items-center gap-3 text-center">
          <CheckCircle2 size={40} className="text-good" />
          <div className="text-lg font-bold text-ink-900">Invite sent!</div>
          <div className="text-sm text-ink-500">
            {form.name} at {form.company} ({form.email}) will receive a portal invitation for{" "}
            <strong>{form.categories.length}</strong> data categor{form.categories.length === 1 ? "y" : "ies"}.
          </div>
        </div>
      ) : step === 1 ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[12px] font-medium text-ink-600">Contact name <span className="text-bad">*</span></span>
              <input className="input mt-1" placeholder="Jane Smith" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-ink-600">Company <span className="text-bad">*</span></span>
              <input className="input mt-1" placeholder="Supplier Ltd." value={form.company} onChange={(e) => set("company", e.target.value)} />
            </label>
          </div>
          <label className="block">
            <span className="text-[12px] font-medium text-ink-600">Email <span className="text-bad">*</span></span>
            <input className="input mt-1" type="email" placeholder="esg@supplier.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </label>
        </div>
      ) : step === 2 ? (
        <div>
          <div className="text-[12px] text-ink-500 mb-3">Select the data categories this supplier will submit. You can change this later.</div>
          <div className="space-y-2">
            {DATA_CATEGORIES.map((cat) => {
              const active = form.categories.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={cn(
                    "w-full text-left rounded-lg border px-3 py-2.5 text-sm flex items-center gap-3",
                    active ? "border-brand-500 ring-1 ring-brand-500 bg-brand-50" : "border-ink-200 hover:bg-ink-50"
                  )}
                >
                  <span className={cn(
                    "w-5 h-5 rounded border-2 grid place-items-center shrink-0",
                    active ? "border-brand-500 bg-brand-500" : "border-ink-300"
                  )}>
                    {active && <Check size={11} className="text-white" />}
                  </span>
                  {cat}
                </button>
              );
            })}
          </div>
          <div className="mt-2 text-[11px] text-ink-400">{form.categories.length} of {DATA_CATEGORIES.length} categories selected</div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-ink-200 p-4 space-y-2">
            <div className="text-sm font-bold text-ink-900 mb-3">Invite summary</div>
            <Row label="Supplier"     value={form.company} />
            <Row label="Contact"      value={form.name} />
            <Row label="Email"        value={form.email} />
            <Row label="Categories"   value={`${form.categories.length} selected`} />
          </div>
          <ul className="space-y-1">
            {form.categories.map((c) => (
              <li key={c} className="flex items-center gap-2 text-[12px] text-ink-700">
                <ChevronRight size={11} className="text-brand-700 shrink-0" /> {c}
              </li>
            ))}
          </ul>
          <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 text-[12px] text-brand-900 flex items-start gap-2">
            <Mail size={13} className="text-brand-700 mt-0.5 shrink-0" />
            The supplier will receive an email with a secure portal link. Their submissions are visible to all subscribed clients under the confidentiality boundary.
          </div>
        </div>
      )}
    </Modal>
  );
}

/* =================================================================== */
/* Supplier view                                                        */
/* =================================================================== */

function SupplierView() {
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tile label="Client requests open"  value="3"  tone="warn" hint="due within 14 days" />
        <Tile label="Clients you supply"    value="12" tone="info" />
        <Tile label="Products in catalogue" value="8"  tone="info" />
        <Tile label="Attestations on file"  value="6"  tone="good" hint="all current" />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-7">
          <CardHeader
            title="Request inbox"
            hint="One submission satisfies every client that subscribes to this product"
            right={<Badge tone="info"><Inbox size={11} /> 3 open</Badge>}
          />
          <ul className="p-5 space-y-2 text-sm">
            <Request from="Greenview Resort (Hotel Optimizer)" ask="Refresh laundry-specific EF for FY 2026"      due="Due 2026-05-15"       clients={4} status="open" />
            <Request from="City Centre Hotel (Hotel Optimizer)" ask="Upload latest ISO 14001 certificate"         due="Due 2026-06-01"       clients={2} status="open" />
            <Request from="Mountain Lodge (Hotel Optimizer)"   ask="Confirm modern slavery statement"             due="Due 2026-06-10"       clients={1} status="open" />
            <Request from="Seaside Hotel (Hotel Optimizer)"    ask="Quarterly volume reconciliation"              due="Submitted 2026-04-12" clients={1} status="submitted" />
          </ul>
        </Card>

        <Card className="col-span-12 lg:col-span-5">
          <CardHeader title="My profile" hint="Aurora Linens Co. · Italy" right={<button className="btn-secondary h-8 px-3 text-[12px]">Edit</button>} />
          <ul className="p-6 divide-y divide-ink-200 rounded-xl border border-ink-200 mx-6 mb-6">
            <ProfileRow label="Legal name"           value="Aurora Linens S.r.l." />
            <ProfileRow label="Country"              value="Italy" />
            <ProfileRow label="Primary category"     value="Linen / Laundry services" />
            <ProfileRow label="Tax ID"               value="IT-09887112" sensitive />
            <ProfileRow label="ESG contact"          value="esg@aurora-linens.eu" />
            <ProfileRow label="Profile completeness" value="92%" />
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Products & supplier-specific emission factors"
          hint="Once submitted and approved, every subscribing client uses this EF — no double entry."
          right={<button className="btn-primary"><Plus size={14} /> Add product</button>}
        />
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Product</th>
                <th className="table-th">Category</th>
                <th className="table-th">EF</th>
                <th className="table-th">Tier</th>
                <th className="table-th">Effective</th>
                <th className="table-th">Reuse permission</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody>
              <ProductRow product="Linen laundry — standard"      category="Cat 1" ef="0.92 kgCO₂e/kg"  tier="Tier 1" effective="2026-Q2" reuse="Allowed for all clients" status="approved" />
              <ProductRow product="Linen laundry — eco programme" category="Cat 1" ef="0.74 kgCO₂e/kg"  tier="Tier 1" effective="2026-Q2" reuse="Allowed for all clients" status="approved" />
              <ProductRow product="Towel rental"                  category="Cat 1" ef="0.42 kgCO₂e/use" tier="Tier 2" effective="2026-Q1" reuse="Allowed for all clients" status="approved" />
              <ProductRow product="Logistics — last-mile"         category="Cat 4" ef="0.18 kgCO₂e/tkm" tier="Tier 2" effective="2026-Q3" reuse="Pending review"          status="submitted" />
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-7">
          <CardHeader title="Certifications" hint="Visible to every client that subscribes to your products" right={<button className="btn-secondary"><Upload size={14} /> Upload</button>} />
          <ul className="p-5 space-y-2 text-sm">
            <CertRow name="ISO 14001 — environmental management" expires="2027-03-12" status="ready" />
            <CertRow name="EU Ecolabel — laundry detergents"     expires="2026-08-30" status="ready" />
            <CertRow name="Fair Wear Foundation membership"      expires="2026-12-01" status="ready" />
            <CertRow name="ISO 50001 — energy management"        expires="2026-05-20" status="warn" hint="Expiring in 18 days" />
          </ul>
        </Card>
        <Card className="col-span-12 lg:col-span-5">
          <CardHeader title="Code-of-conduct attestations" hint="Required for GRI 414 (supplier social assessment)" />
          <ul className="p-5 space-y-2 text-sm">
            <AttRow label="Supplier code of conduct"    signed="2026-04-02" />
            <AttRow label="Modern slavery statement"    signed="2026-03-30" />
            <AttRow label="Anti-bribery declaration"    signed="2026-02-15" />
            <AttRow label="Data privacy attestation"    signed="2026-04-22" />
            <AttRow label="GRI 414 social assessment"   signed="2026-03-12" />
            <AttRow label="Conflict-mineral declaration" signed="—" missing />
          </ul>
        </Card>
      </div>
    </>
  );
}

/* =================================================================== */
/* Shared helpers                                                       */
/* =================================================================== */

function ReReviewRow({ supplier, field, change, reason, tone }: { supplier: string; field: string; change: string; reason: string; tone: "warn" | "info" }) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-ink-200 p-3">
      <Truck size={14} className="text-brand-700 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-ink-900">{supplier}</div>
        <div className="text-[12px] text-ink-700">
          <span className="text-ink-500">{field}:</span>{" "}
          <code className="text-ink-500 line-through mr-1">{change.split("→")[0].trim()}</code>
          <span className="text-ink-400">→</span>{" "}
          <code className="text-brand-700 font-semibold">{change.split("→")[1].trim()}</code>
        </div>
        <div className="text-[11px] text-ink-500 mt-0.5">{reason}</div>
      </div>
      <Badge tone={tone}>Awaiting checker</Badge>
      <button className="btn-secondary h-7 px-2 text-[12px]"><MessageCircle size={12} /> Open</button>
    </li>
  );
}

function Request({ from, ask, due, clients, status }: { from: string; ask: string; due: string; clients: number; status: "open" | "submitted" }) {
  return (
    <li className={cn("flex items-start gap-3 rounded-xl border p-3", status === "open" ? "border-warn/25 bg-warn/10" : "border-ink-200")}>
      <span className={cn("w-9 h-9 rounded-lg grid place-items-center shrink-0", status === "open" ? "bg-warn/15 text-warn" : "bg-good/10 text-good")}>
        {status === "open" ? <Bell size={15} /> : <CheckCircle2 size={15} />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-ink-500">{from}</div>
        <div className="font-semibold text-ink-900">{ask}</div>
        <div className="text-[12px] text-ink-500 mt-0.5 inline-flex items-center gap-2">
          <span className="inline-flex items-center gap-1"><Clock size={12} /> {due}</span>
          <span className="text-ink-300">·</span>
          <span>{clients} client{clients > 1 ? "s" : ""} subscribed</span>
        </div>
      </div>
      <button className={status === "open" ? "btn-primary h-8 px-3 text-[12px]" : "btn-secondary h-8 px-3 text-[12px]"}>
        {status === "open" ? <><Upload size={12} /> Respond</> : <><Eye size={12} /> View</>}
      </button>
    </li>
  );
}

function ProductRow({ product, category, ef, tier, effective, reuse, status }: { product: string; category: string; ef: string; tier: string; effective: string; reuse: string; status: "approved" | "submitted" }) {
  return (
    <tr>
      <td className="table-td font-medium">{product}</td>
      <td className="table-td">{category}</td>
      <td className="table-td font-mono text-[12px]">{ef}</td>
      <td className="table-td"><Badge tone="info">{tier}</Badge></td>
      <td className="table-td">{effective}</td>
      <td className="table-td">
        <span className="inline-flex items-center gap-1 text-[12px]">
          {reuse.includes("Allowed") ? <ShieldCheck size={12} className="text-good" /> : <Clock size={12} className="text-warn" />}
          {reuse}
        </span>
      </td>
      <td className="table-td">
        <Badge tone={status === "approved" ? "good" : "warn"}>{status === "approved" ? "Approved" : "Awaiting review"}</Badge>
      </td>
    </tr>
  );
}

function ProfileRow({ label, value, sensitive }: { label: string; value: string; sensitive?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 px-2 py-2 text-sm">
      <span className="text-[12px] text-ink-500">{label}</span>
      <span className="font-medium text-ink-900 inline-flex items-center gap-1">
        {sensitive && <Lock size={11} className="text-ink-400" />}{value}
      </span>
    </li>
  );
}

function CertRow({ name, expires, status, hint }: { name: string; expires: string; status: "ready" | "warn"; hint?: string }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-ink-200 p-3">
      <Award size={14} className="text-brand-700" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-ink-900">{name}</div>
        <div className="text-[11px] text-ink-500">Expires {expires} {hint && `· ${hint}`}</div>
      </div>
      <Badge tone={status === "ready" ? "good" : "warn"}>{status === "ready" ? "Current" : "Expiring soon"}</Badge>
    </li>
  );
}

function AttRow({ label, signed, missing }: { label: string; signed: string; missing?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 p-3">
      <div className="flex items-center gap-2">
        <FileText size={13} className={missing ? "text-bad" : "text-brand-700"} />
        <div className="font-medium text-ink-900">{label}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-ink-500">{missing ? "Not signed" : `Signed ${signed}`}</span>
        {missing ? <button className="btn-secondary h-7 px-2 text-[12px]"><Upload size={12} /> Sign</button>
          : <Badge tone="good"><CheckCircle2 size={11} /> Filed</Badge>}
      </div>
    </li>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-3 text-sm">
      <span className="text-[12px] text-ink-500">{label}</span>
      <span className="font-medium text-ink-900">{value}</span>
    </li>
  );
}

function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone: "good" | "info" | "warn" }) {
  const ring = { good: "border-good/25 bg-good/10", info: "border-ink-200 bg-ink-50", warn: "border-warn/25 bg-warn/10" }[tone];
  return (
    <div className={cn("rounded-xl border p-4", ring)}>
      <div className="text-[11px] uppercase tracking-wide font-semibold text-ink-500">{label}</div>
      <div className="text-2xl font-bold text-ink-900 mt-0.5">{value}</div>
      {hint && <div className="text-[11px] text-ink-500">{hint}</div>}
    </div>
  );
}

function ConfidentialityCallout() {
  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-4 flex items-start gap-3">
      <ShieldAlert size={18} className="text-brand-700 mt-0.5" />
      <div className="text-[13px] text-brand-900">
        <strong>Confidentiality boundary.</strong> Supplier generic profile and product sustainability data may be reused only where the supplier approves reuse. Client-specific pricing, contract terms, purchase values, volumes, and relationship data remain tenant-specific and are <strong>never visible to other clients</strong> on the platform ().
        <div className="mt-1 text-[12px] inline-flex items-center gap-2">
          <Building2 size={12} /> Supplier serves 12 clients · No cross-client data leakage.
          <button className="underline font-semibold inline-flex items-center gap-1"><History size={11} /> Reuse history</button>
        </div>
      </div>
    </div>
  );
}

export const _icons = { Info, XCircle };
