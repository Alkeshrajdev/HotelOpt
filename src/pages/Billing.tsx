import { useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Key,
  Mail,
  Plus,
  Receipt,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Wallet,
  X,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

type BillingTab = "billing" | "seats" | "apikeys";

type AccessStatus  = "active" | "grace" | "suspended";
type InvoiceStatus = "paid" | "due" | "failed" | "grace";
type SeatStatus    = "active" | "pending" | "suspended";
type UserRole      = "Corporate SM" | "Property SM" | "Maker" | "Checker" | "Auditor" | "Client Admin";

type Seat = { id: string; name: string; email: string; role: UserRole; lastActive: string; status: SeatStatus };
type ApiKey = { id: string; name: string; scope: string; created: string; lastUsed: string; prefix: string; active: boolean };
type InviteForm = { email: string; role: UserRole };

/* ------------------------------------------------------------------ */
/* Constants                                                            */
/* ------------------------------------------------------------------ */

const PLAN = {
  name: "Hotel Optimizer · Enterprise", type: "White-label", cycle: "Annual",
  baseFee: 36000, perPropertyFee: 600, propertiesIncluded: 100, propertiesUsed: 72,
  whiteLabelLicenceFee: 12000, currency: "USD", renewsOn: "31 Dec 2026",
};

const USAGE = {
  ai:      { calls: 12842, monthlyAllowance: 50000, totalCost: 12.84 },
  ocr:     { pages: 4128,  monthlyAllowance: 10000, totalCost: 49.54 },
  storage: { gb: 84, includedGb: 100 },
};

const INVOICES: { id: string; period: string; amount: number; status: InvoiceStatus; date: string }[] = [
  { id: "INV-2026-Q2", period: "Apr–Jun 2026", amount: 48000, status: "due",  date: "due 30 May"  },
  { id: "INV-2026-Q1", period: "Jan–Mar 2026", amount: 48000, status: "paid", date: "paid 15 Mar" },
  { id: "INV-2025-Q4", period: "Oct–Dec 2025", amount: 48000, status: "paid", date: "paid 12 Dec" },
  { id: "INV-2025-Q3", period: "Jul–Sep 2025", amount: 48000, status: "paid", date: "paid 18 Sep" },
];

const SEATS_INITIAL: Seat[] = [
  { id: "u1", name: "James Wilson",    email: "james.wilson@demo.hotel",    role: "Corporate SM",  lastActive: "Today 09:14",     status: "active"    },
  { id: "u2", name: "Priya Sharma",    email: "priya.sharma@demo.hotel",    role: "Property SM",   lastActive: "Today 08:52",     status: "active"    },
  { id: "u3", name: "Felix Andersen",  email: "felix.andersen@demo.hotel",  role: "Maker",         lastActive: "Yesterday 16:30", status: "active"    },
  { id: "u4", name: "Lucia Fernández", email: "lucia.f@demo.hotel",         role: "Checker",       lastActive: "Yesterday 14:10", status: "active"    },
  { id: "u5", name: "Omar Al-Hassan",  email: "omar.a@demo.hotel",          role: "Auditor",       lastActive: "29 Apr 2026",     status: "active"    },
  { id: "u6", name: "Sofia Eriksson",  email: "sofia.e@demo.hotel",         role: "Client Admin",  lastActive: "—",               status: "pending"   },
  { id: "u7", name: "Mark Osei",       email: "mark.osei@demo.hotel",       role: "Maker",         lastActive: "—",               status: "suspended" },
];

const API_KEYS_INITIAL: ApiKey[] = [
  { id: "k1", name: "QuickBooks Online sync",  scope: "data:read data:write",  created: "2026-01-15", lastUsed: "Today",      prefix: "hok_live_qb",    active: true  },
  { id: "k2", name: "Power BI dashboard feed", scope: "data:read reports:read", created: "2026-02-28", lastUsed: "Today",      prefix: "hok_live_pbi",   active: true  },
  { id: "k3", name: "Cvent CSN export",         scope: "reports:read",           created: "2026-03-10", lastUsed: "2026-04-20", prefix: "hok_live_cvent", active: true  },
  { id: "k4", name: "Old BMS receiver (deprecated)", scope: "data:write",        created: "2025-08-01", lastUsed: "2025-11-12", prefix: "hok_live_bms1",  active: false },
];

const INVOICE_TONE: Record<InvoiceStatus, "good" | "warn" | "bad" | "info"> = { paid: "good", due: "warn", failed: "bad", grace: "info" };
const SEAT_TONE:  Record<SeatStatus, "good" | "warn" | "bad"> = { active: "good", pending: "warn", suspended: "bad" };
const ALL_ROLES: UserRole[] = ["Corporate SM", "Property SM", "Maker", "Checker", "Auditor", "Client Admin"];

/* ================================================================== */
/* Page                                                                 */
/* ================================================================== */

export default function Billing() {
  const [tab, setTab] = useState<BillingTab>("billing");

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Subscription & billing"
        title="Billing"
        subtitle="Plan management, seat administration, API keys, and invoice history."
        actions={
          <>
            <button className="btn-secondary"><Download size={14} /> Download invoices</button>
            <button className="btn-primary"><ExternalLink size={14} /> Open Stripe portal</button>
          </>
        }
      />

      <div className="flex gap-1 border-b border-ink-200">
        {([["billing","Billing & Plan"],["seats","Seat management"],["apikeys","API keys"]] as [BillingTab,string][]).map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)} className={cn("tab text-[13px] pb-3 px-4", tab === key && "tab-active")}>{label}</button>
        ))}
      </div>

      {tab === "billing"  && <BillingTab />}
      {tab === "seats"    && <SeatsTab />}
      {tab === "apikeys"  && <ApiKeysTab />}
    </div>
  );
}

/* ================================================================== */
/* Tab 1 — Billing (existing content)                                  */
/* ================================================================== */

function BillingTab() {
  const [access] = useState<AccessStatus>("active");

  return (
    <div className="space-y-4">
      {access === "grace" && (
        <Card className="border-warn/25 bg-warn/10 card-pad flex items-start gap-3">
          <AlertTriangle size={18} className="text-warn mt-0.5" />
          <div className="text-[13px] text-warn"><strong>Grace period.</strong> Payment failed on 22 May. Settle within 5 days to avoid suspension.</div>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tile label="Plan"        value={PLAN.name}           hint={`${PLAN.cycle} · ${PLAN.type}`} tone="brand" />
        <Tile label="Properties"  value={`${PLAN.propertiesUsed} / ${PLAN.propertiesIncluded}`} hint="under licence" tone="info" />
        <Tile label="Renews"      value={PLAN.renewsOn}       hint="auto-renewal on" tone="info" />
        <Tile label="Access"      value="Active"              hint="all features available" tone="good" />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-7">
          <CardHeader title="Plan management" hint="Pricing model" right={<button className="btn-secondary"><Settings size={14} /> Change plan</button>} />
          <div className="p-6 grid grid-cols-2 gap-3 text-sm">
            <PlanRow label="Base fee"           value={`${PLAN.currency} ${PLAN.baseFee.toLocaleString()} / year`} />
            <PlanRow label="Per-property fee"   value={`${PLAN.currency} ${PLAN.perPropertyFee} × ${PLAN.propertiesUsed} props`} />
            <PlanRow label="White-label licence" value={`${PLAN.currency} ${PLAN.whiteLabelLicenceFee.toLocaleString()} / year`} />
            <PlanRow label="Billing cycle"      value={PLAN.cycle} />
            <PlanRow label="Effective rate"     value={`${PLAN.currency} ${(PLAN.baseFee + PLAN.perPropertyFee * PLAN.propertiesUsed + PLAN.whiteLabelLicenceFee).toLocaleString()} / year`} />
            <PlanRow label="Trial"              value="—" />
          </div>
          <div className="mx-6 mb-6 rounded-xl border border-brand-200 bg-brand-50/40 p-3 text-[12px] text-brand-900 flex items-start gap-2">
            <Sparkles size={14} className="text-brand-700 mt-0.5" />
            <span><strong>Discount applied:</strong> 5-property bundle credit · –USD 1,800 / year.</span>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-5">
          <CardHeader title="Payment method" hint="Managed via Stripe" right={<button className="btn-secondary h-8 px-3 text-[12px]"><Plus size={12} /> Add</button>} />
          <div className="p-6 space-y-3 text-sm">
            <div className="rounded-xl border border-ink-200 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-700 grid place-items-center text-white"><CreditCard size={16} /></div>
              <div className="flex-1"><div className="font-semibold">Visa •••• 4242</div><div className="text-[11px] text-ink-500">Expires 12/2027 · primary</div></div>
              <Badge tone="good">Default</Badge>
            </div>
            <div className="rounded-xl border border-ink-200 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-ink-100 grid place-items-center text-ink-700"><Wallet size={16} /></div>
              <div className="flex-1"><div className="font-semibold">ACH · Bank of America</div><div className="text-[11px] text-ink-500">Ending 7890</div></div>
              <Badge tone="neutral">Backup</Badge>
            </div>
          </div>
          <div className="px-6 pb-6 text-[12px] text-ink-500 inline-flex items-center gap-1">
            <ShieldCheck size={12} /> PCI-DSS via Stripe. Hotel Optimizer never stores card data.
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Usage & AI/OCR costs" hint="Pass-through metered · 30-day window" right={<button className="btn-secondary"><Receipt size={14} /> Detailed usage</button>} />
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <UsageTile label="AI assistant calls"   usage={USAGE.ai.calls}      limit={USAGE.ai.monthlyAllowance}  costLabel={`USD ${USAGE.ai.totalCost.toFixed(2)} this period`} />
          <UsageTile label="OCR pages"            usage={USAGE.ocr.pages}     limit={USAGE.ocr.monthlyAllowance} costLabel={`USD ${USAGE.ocr.totalCost.toFixed(2)} this period`} />
          <UsageTile label="Evidence storage"     usage={USAGE.storage.gb}    limit={USAGE.storage.includedGb}   costLabel="included" />
        </div>
      </Card>

      <Card>
        <CardHeader title="Invoice history" hint="Tax-compliant · audit-ready" />
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead><tr className="bg-ink-50">
              <th className="table-th">Invoice</th><th className="table-th">Period</th><th className="table-th">Amount</th>
              <th className="table-th">Status</th><th className="table-th">Date</th><th className="table-th text-right pr-6">Actions</th>
            </tr></thead>
            <tbody>
              {INVOICES.map((inv) => (
                <tr key={inv.id} className="hover:bg-ink-50/60">
                  <td className="table-td font-medium">{inv.id}</td>
                  <td className="table-td">{inv.period}</td>
                  <td className="table-td tabular-nums">${inv.amount.toLocaleString()}</td>
                  <td className="table-td"><Badge tone={INVOICE_TONE[inv.status]} className="capitalize">{inv.status === "paid" && <CheckCircle2 size={10} />}{inv.status}</Badge></td>
                  <td className="table-td">{inv.date}</td>
                  <td className="table-td text-right pr-6"><button className="btn-ghost h-7 px-2 text-[12px] text-brand-700"><Download size={12} /> PDF</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 flex items-start gap-2.5">
        <ShieldCheck size={16} className="text-brand-700 mt-0.5" />
        <div className="text-[13px] text-brand-900">When suspended, all existing data and audit trail remain intact. Submissions are blocked until the outstanding balance is settled.</div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Tab 2 — Seat management                                             */
/* ================================================================== */

function SeatsTab() {
  const [seats, setSeats]       = useState<Seat[]>(SEATS_INITIAL);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm]         = useState<InviteForm>({ email: "", role: "Maker" });
  const [sent, setSent]         = useState(false);

  function changeRole(id: string, role: UserRole) {
    setSeats((ss) => ss.map((s) => s.id === id ? { ...s, role } : s));
  }
  function toggleStatus(id: string) {
    setSeats((ss) => ss.map((s) => s.id === id ? { ...s, status: s.status === "suspended" ? "active" : "suspended" } : s));
  }
  function sendInvite() {
    if (!form.email) return;
    setSent(true);
    setTimeout(() => {
      const ns: Seat = { id: "u-" + Date.now(), name: form.email.split("@")[0], email: form.email, role: form.role, lastActive: "—", status: "pending" };
      setSeats((ss) => [...ss, ns]);
      setInviteOpen(false);
      setSent(false);
      setForm({ email: "", role: "Maker" });
    }, 800);
  }

  const activeCount  = seats.filter((s) => s.status === "active").length;
  const pendingCount = seats.filter((s) => s.status === "pending").length;

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <Tile label="Seats used"   value={`${seats.length} / 20`} hint="of plan limit" tone="info" />
        <Tile label="Active"       value={String(activeCount)}      hint="currently active" tone="good" />
        <Tile label="Pending"      value={String(pendingCount)}     hint="invite not accepted" tone="warn" />
      </div>

      <Card>
        <CardHeader
          title="Users"
          hint="Role-based access control · 10 roles"
          right={<button className="btn-primary" onClick={() => setInviteOpen(true)}><UserPlus size={14} /> Invite user</button>}
        />
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead><tr className="bg-ink-50">
              <th className="table-th">Name</th><th className="table-th">Email</th><th className="table-th">Role</th>
              <th className="table-th">Last active</th><th className="table-th">Status</th><th className="table-th text-right pr-6">Actions</th>
            </tr></thead>
            <tbody>
              {seats.map((s) => (
                <tr key={s.id} className="hover:bg-ink-50/60">
                  <td className="table-td font-medium text-ink-900">{s.name}</td>
                  <td className="table-td text-ink-600 text-[12px]">{s.email}</td>
                  <td className="table-td">
                    <select
                      value={s.role}
                      onChange={(e) => changeRole(s.id, e.target.value as UserRole)}
                      className="h-7 px-2 rounded-md border border-ink-200 text-[11px] font-medium bg-white"
                    >
                      {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="table-td text-ink-500 text-[12px]">{s.lastActive}</td>
                  <td className="table-td"><Badge tone={SEAT_TONE[s.status]} className="capitalize">{s.status}</Badge></td>
                  <td className="table-td text-right pr-6">
                    <button
                      onClick={() => toggleStatus(s.id)}
                      className={cn("btn-ghost h-7 px-2 text-[12px]", s.status === "suspended" ? "text-good" : "text-bad")}
                    >
                      {s.status === "suspended" ? <><Check size={11} /> Restore</> : <><X size={11} /> Suspend</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite user" size="md">
        {sent ? (
          <div className="p-8 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-good/10 grid place-items-center text-good"><CheckCircle2 size={22} /></div>
            <div className="text-sm font-semibold text-ink-900">Invitation sent</div>
            <div className="text-[12px] text-ink-500 text-center">An invite email has been dispatched to {form.email}.</div>
          </div>
        ) : (
          <>
            <div className="space-y-4 p-5">
              <div>
                <label className="block text-[12px] font-medium text-ink-700 mb-1">Email address</label>
                <div className="relative">
                  <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input className="input w-full pl-8" placeholder="user@hotel.com" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-ink-700 mb-1">Role</label>
                <select className="input w-full" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}>
                  {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 pb-5 pt-2 border-t border-ink-200">
              <button className="btn-secondary" onClick={() => setInviteOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={sendInvite} disabled={!form.email}><Mail size={13} /> Send invite</button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

/* ================================================================== */
/* Tab 3 — API keys                                                    */
/* ================================================================== */

function ApiKeysTab() {
  const [keys, setKeys]       = useState<ApiKey[]>(API_KEYS_INITIAL);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScope, setNewScope] = useState("data:read");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [copied, setCopied]   = useState<string | null>(null);

  function revokeKey(id: string) {
    setKeys((ks) => ks.map((k) => k.id === id ? { ...k, active: false } : k));
  }
  function rotateKey(id: string) {
    setKeys((ks) => ks.map((k) => k.id === id ? { ...k, lastUsed: "Just now", prefix: k.prefix + "r" } : k));
  }
  function createKey() {
    if (!newName.trim()) return;
    const nk: ApiKey = {
      id: "k-" + Date.now(), name: newName.trim(), scope: newScope,
      created: new Date().toISOString().slice(0,10), lastUsed: "Never",
      prefix: "hok_live_new", active: true,
    };
    setKeys((ks) => [nk, ...ks]);
    setNewName(""); setCreateOpen(false);
  }
  function copyKey(id: string) {
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <>
      <Card>
        <CardHeader
          title="API keys"
          hint="OAuth-style bearer tokens — scope-limited · rotatable · revocable"
          right={<button className="btn-primary" onClick={() => setCreateOpen(true)}><Plus size={14} /> Create key</button>}
        />
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead><tr className="bg-ink-50">
              <th className="table-th">Name</th><th className="table-th">Prefix</th><th className="table-th">Scope</th>
              <th className="table-th">Created</th><th className="table-th">Last used</th>
              <th className="table-th">Status</th><th className="table-th text-right pr-6">Actions</th>
            </tr></thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className={cn("hover:bg-ink-50/60", !k.active && "opacity-50")}>
                  <td className="table-td font-medium text-ink-900">{k.name}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-1.5">
                      <code className="text-[11px] bg-ink-100 px-1.5 py-0.5 rounded font-mono">
                        {revealed === k.id ? `${k.prefix}_••••••••` : `${k.prefix.slice(0,10)}…`}
                      </code>
                      <button onClick={() => setRevealed(revealed === k.id ? null : k.id)} className="text-ink-400 hover:text-ink-700">
                        {revealed === k.id ? <EyeOff size={11} /> : <Eye size={11} />}
                      </button>
                      <button onClick={() => copyKey(k.id)} className="text-ink-400 hover:text-brand-700">
                        {copied === k.id ? <Check size={11} className="text-good" /> : <Copy size={11} />}
                      </button>
                    </div>
                  </td>
                  <td className="table-td">
                    <div className="flex flex-wrap gap-1">
                      {k.scope.split(" ").map((sc) => (
                        <span key={sc} className="text-[10px] bg-brand-50 text-brand-700 border border-brand-100 rounded px-1.5 py-0.5 font-mono">{sc}</span>
                      ))}
                    </div>
                  </td>
                  <td className="table-td text-ink-500 text-[12px]">{k.created}</td>
                  <td className="table-td text-ink-500 text-[12px]">{k.lastUsed}</td>
                  <td className="table-td">
                    <Badge tone={k.active ? "good" : "bad"}>{k.active ? "Active" : "Revoked"}</Badge>
                  </td>
                  <td className="table-td text-right pr-6">
                    {k.active && (
                      <div className="flex items-center justify-end gap-1">
                        <button className="btn-ghost h-7 px-2 text-[12px] text-ink-700" onClick={() => rotateKey(k.id)}>
                          <RefreshCw size={11} /> Rotate
                        </button>
                        <button className="btn-ghost h-7 px-2 text-[12px] text-bad" onClick={() => revokeKey(k.id)}>
                          <Trash2 size={11} /> Revoke
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 pb-4 pt-3 border-t border-ink-100 text-[12px] text-ink-500 flex items-center gap-1.5">
          <Key size={12} /> Keys are shown only once at creation. Rotate immediately if compromised.
        </div>
      </Card>

      <div className="rounded-xl bg-ink-50 border border-ink-200 p-4 text-[12px] text-ink-700 space-y-1.5">
        <div className="font-semibold text-ink-900">Available scopes</div>
        {[["data:read","Read consumption records, properties, suppliers"],["data:write","Submit new consumption records"],["reports:read","Download generated reports and disclosures"],["admin:read","Read user list and configuration (Client Admin only)"]].map(([sc, desc]) => (
          <div key={sc} className="flex gap-2"><code className="text-brand-700 font-mono shrink-0">{sc}</code><span className="text-ink-500">{desc}</span></div>
        ))}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create API key" size="md">
        <div className="space-y-4 p-5">
          <div>
            <label className="block text-[12px] font-medium text-ink-700 mb-1">Key name</label>
            <input className="input w-full" placeholder="e.g. Power BI dashboard" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-ink-700 mb-1">Scope</label>
            <select className="input w-full" value={newScope} onChange={(e) => setNewScope(e.target.value)}>
              <option value="data:read">data:read</option>
              <option value="data:read data:write">data:read data:write</option>
              <option value="data:read reports:read">data:read reports:read</option>
              <option value="reports:read">reports:read</option>
            </select>
          </div>
          <div className="rounded-lg bg-warn/10 border border-warn/25 p-3 text-[12px] text-warn">
            The full key value is shown only once after creation. Store it securely.
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5 pt-2 border-t border-ink-200">
          <button className="btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={createKey} disabled={!newName.trim()}><Key size={13} /> Generate key</button>
        </div>
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Shared components                                                    */
/* ------------------------------------------------------------------ */

function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone: "good" | "warn" | "bad" | "info" | "brand" }) {
  const ring = { good: "border-good/25", warn: "border-warn/25", bad: "border-bad/25", info: "border-ink-200", brand: "border-brand-200 bg-brand-50/40" }[tone];
  const text = { good: "text-good", warn: "text-warn", bad: "text-bad", info: "text-brand-700", brand: "text-brand-800" }[tone];
  return (
    <div className={cn("rounded-xl border p-4", ring)}>
      <div className="text-[11px] uppercase tracking-wide font-semibold text-ink-500">{label}</div>
      <div className={cn("text-lg font-bold mt-0.5 truncate", text)}>{value}</div>
      {hint && <div className="text-[11px] text-ink-400">{hint}</div>}
    </div>
  );
}

function PlanRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-ink-200 px-3 py-2">
      <span className="text-[12px] text-ink-500">{label}</span>
      <span className="font-medium text-ink-900 text-right text-[12px]">{value}</span>
    </li>
  );
}

function UsageTile({ label, usage, limit, costLabel }: { label: string; usage: number; limit: number; costLabel: string }) {
  const pct  = Math.min(100, Math.round((usage / limit) * 100));
  const tone = pct >= 90 ? "bg-bad" : pct >= 75 ? "bg-warn" : "bg-good";
  return (
    <div className="rounded-xl border border-ink-200 p-4">
      <div className="text-[12px] font-semibold text-ink-700">{label}</div>
      <div className="text-2xl font-bold text-ink-900 mt-1">{usage.toLocaleString()} <span className="text-[12px] font-medium text-ink-400">/ {limit.toLocaleString()}</span></div>
      <div className="mt-2 h-1.5 rounded-full bg-ink-100 overflow-hidden"><div className={cn("h-full rounded-full", tone)} style={{ width: `${pct}%` }} /></div>
      <div className="text-[11px] text-ink-500 mt-2">{costLabel}</div>
    </div>
  );
}
