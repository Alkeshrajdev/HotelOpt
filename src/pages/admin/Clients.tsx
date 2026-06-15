import { Building2, Globe2, Lock, Plus, Search, RotateCcw } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import AdminShell from "./AdminShell";
import { useAccount, ALL_MODULES, MODULE_LABELS, type ModuleKey } from "@/lib/account";
import { PROPERTIES } from "@/lib/propertiesData";
import { cn } from "@/lib/utils";

const CLIENTS = [
  { id: "c-001", name: "Hotel Optimizer Demo",       brand: "Hotel Optimizer",  type: "Direct SaaS",     properties: 8,  region: "Global",     status: "Active",     billing: "USD"  },
  { id: "c-002", name: "Aurora Hospitality Group",   brand: "Aurora Hotels",     type: "White-label",     properties: 24, region: "EMEA",        status: "Active",     billing: "EUR"  },
  { id: "c-003", name: "Pacifica Resorts",            brand: "Pacifica",           type: "White-label",     properties: 12, region: "APAC",        status: "Active",     billing: "SGD"  },
  { id: "c-004", name: "Alpine Lodges Holdings",      brand: "AlpineLodge",        type: "Sovereign hosting",properties: 6,  region: "Americas",   status: "Active",     billing: "CAD"  },
  { id: "c-005", name: "MENA Sustainable Hotels",     brand: "MENA-Sustain",       type: "White-label",     properties: 9,  region: "MENA",        status: "Onboarding", billing: "AED"  },
];

export default function AdminClients() {
  return (
    <AdminShell
      eyebrow="Tenancy"
      title="Clients & deployments"
      subtitle="Each client gets full data isolation. Deployment type controls branding, hosting, and module toggles."
      actions={<button className="btn-primary"><Plus size={14} /> New client</button>}
    >
      <ProvisioningCard />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="Total clients"           value="5"  hint="across 4 deployment types" />
        <Tile label="White-label"             value="3"  />
        <Tile label="Sovereign hosting"       value="1"  />
        <Tile label="Properties under licence" value="59" />
      </div>

      <div className="flex items-center gap-2">
        <div className="relative w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Search by client, brand, region…" />
        </div>
        <select className="input max-w-[180px]"><option>All deployment types</option></select>
        <select className="input max-w-[150px]"><option>All regions</option></select>
      </div>

      <Card>
        <CardHeader title="Clients" hint={`${CLIENTS.length} on platform`} />
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Client</th>
                <th className="table-th">Brand</th>
                <th className="table-th">Deployment</th>
                <th className="table-th">Properties</th>
                <th className="table-th">Region</th>
                <th className="table-th">Billing currency</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {CLIENTS.map((c) => (
                <tr key={c.id} className="hover:bg-ink-50/60 cursor-pointer">
                  <td className="table-td font-medium text-ink-900">
                    <div className="flex items-center gap-2"><Building2 size={14} className="text-brand-700" /> {c.name}</div>
                  </td>
                  <td className="table-td">{c.brand}</td>
                  <td className="table-td">
                    <Badge tone={c.type === "Direct SaaS" ? "info" : c.type === "Sovereign hosting" ? "warn" : "brand"}>
                      {c.type === "Sovereign hosting" && <Lock size={10} className="mr-0.5" />}
                      {c.type === "White-label" && <Globe2 size={10} className="mr-0.5" />}
                      {c.type}
                    </Badge>
                  </td>
                  <td className="table-td tabular-nums">{c.properties}</td>
                  <td className="table-td">{c.region}</td>
                  <td className="table-td">{c.billing}</td>
                  <td className="table-td"><Badge tone={c.status === "Active" ? "good" : "warn"}>{c.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminShell>
  );
}

function Switch({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative w-9 h-5 rounded-full transition-colors shrink-0",
        on ? "bg-good" : "bg-ink-300",
        disabled && "opacity-40 cursor-not-allowed"
      )}
      aria-pressed={on}
    >
      <span className={cn("absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", on && "translate-x-4")} />
    </button>
  );
}

/**
 * Live provisioning for the current account — what the platform admin sets when
 * activating a paying account. Changes apply immediately (the nav reshapes), so
 * it doubles as the way to preview the single-hotel experience.
 */
function ProvisioningCard() {
  const { account, setAccountType, toggleModule, setSingleHotelId, setPlatformReview, reset } = useAccount();
  const isSingle = account.accountType === "single";

  return (
    <Card>
      <CardHeader
        title={`Account provisioning — ${account.clientName}`}
        hint="Controls what this account sees. Changes apply immediately."
        right={
          <button className="btn-secondary text-[12px] h-7 px-3" onClick={reset}>
            <RotateCcw size={12} /> Reset to default
          </button>
        }
      />
      <div className="p-5 space-y-5">
        {/* Account type */}
        <div>
          <div className="text-[11px] uppercase tracking-wide font-semibold text-ink-500 mb-2">Account type</div>
          <div className="inline-flex items-center bg-ink-100 rounded-lg p-0.5">
            {(["single", "portfolio"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setAccountType(t)}
                className={cn(
                  "px-3 h-7 text-[12px] font-medium rounded-md transition-colors capitalize",
                  account.accountType === t ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-700"
                )}
              >
                {t === "single" ? "Single hotel" : "Portfolio"}
              </button>
            ))}
          </div>
          {isSingle && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[12px] text-ink-500">Hotel:</span>
              <select
                className="input max-w-[260px] h-8"
                value={account.singleHotelId}
                onChange={(e) => setSingleHotelId(e.target.value)}
              >
                {PROPERTIES.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
          <p className="text-[11px] text-ink-400 mt-2">
            {isSingle
              ? "Property-centric experience — no portfolio rollup; the hotel is the home."
              : "Multi-hotel rollup — portfolio dashboard, properties registry, setup & reporting."}
          </p>
        </div>

        {/* Module toggles */}
        <div>
          <div className="text-[11px] uppercase tracking-wide font-semibold text-ink-500 mb-2">Modules</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ALL_MODULES.map((m: ModuleKey) => {
              const portfolioNA = m === "portfolio" && isSingle;
              return (
                <div key={m} className={cn("flex items-center justify-between rounded-xl border border-ink-200 px-3 py-2", portfolioNA && "opacity-60")}>
                  <div>
                    <div className="text-[13px] font-medium text-ink-900">{MODULE_LABELS[m]}</div>
                    {portfolioNA && <div className="text-[10px] text-ink-400">Portfolio accounts only</div>}
                  </div>
                  <Switch on={!!account.modules[m]} disabled={portfolioNA} onClick={() => toggleModule(m)} />
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-ink-400 mt-2">
            Data Capture, Review &amp; Approval, Reports, Certifications, Billing and Admin are core — always available.
          </p>
        </div>

        {/* Quality control */}
        <div>
          <div className="text-[11px] uppercase tracking-wide font-semibold text-ink-500 mb-2">Quality control</div>
          <div className="flex items-center justify-between rounded-xl border border-ink-200 px-3 py-2">
            <div>
              <div className="text-[13px] font-medium text-ink-900">Platform review · 2nd-layer QC <span className="text-[10px] text-ink-400 font-normal">(optional)</span></div>
              <div className="text-[11px] text-ink-400">
                {account.platformReview
                  ? "On — company-approved records require a platform sign-off before they're final."
                  : "Bypassed — the company approver's sign-off is final."}
              </div>
            </div>
            <Switch on={account.platformReview} onClick={() => setPlatformReview(!account.platformReview)} />
          </div>
        </div>
      </div>
    </Card>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4">
      <div className="text-[11px] uppercase tracking-wide font-semibold text-ink-500">{label}</div>
      <div className="text-2xl font-bold text-ink-900 mt-0.5">{value}</div>
      {hint && <div className="text-[11px] text-ink-500">{hint}</div>}
    </div>
  );
}
