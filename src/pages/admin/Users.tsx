import { Plus, Search, ShieldCheck, UserCog, UserMinus } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import AdminShell from "./AdminShell";

const ROLES = [
  { key: "maker",        label: "Maker",                 count: 24, scope: "Property-scoped",   description: "Submits records for checker review" },
  { key: "checker",      label: "Checker",                count: 11, scope: "Property-scoped",   description: "Approves / queries / rejects records" },
  { key: "property_sm",  label: "Property SM",            count: 8,  scope: "Property-scoped",   description: "Sustainability manager — full property access" },
  { key: "gm",           label: "Hotel GM",               count: 8,  scope: "Property-scoped",   description: "Property admin · approves measures" },
  { key: "corporate",    label: "Corporate Sustainability",count: 3, scope: "Portfolio-scoped", description: "Cross-property dashboards + targets" },
  { key: "client_admin", label: "Client Admin",           count: 1,  scope: "Client-scoped",    description: "White-label client management" },
  { key: "super_admin",  label: "Super Admin",            count: 2,  scope: "Platform-scoped",  description: "Full administration" },
  { key: "auditor",      label: "Auditor",                count: 4,  scope: "Read-only",         description: "Third-party verifier · immutable trail access" },
  { key: "supplier",     label: "Supplier",               count: 120,scope: "Supplier-scoped",  description: "Maintains EFs, certifications, attestations" },
  { key: "curator",      label: "Knowledge Curator",       count: 1,  scope: "Platform-scoped",  description: "AI knowledge base author" },
];

const USERS = [
  { id: "u-1",  name: "Demo Admin",          email: "admin@demo.test",        role: "super_admin",  properties: "All",                          mfa: true,  lastActive: "Today 09:14" },
  { id: "u-2",  name: "Demo Checker",        email: "checker@demo.test",      role: "checker",      properties: "Skyline Dubai, Peaks Resort Zermatt",     mfa: true,  lastActive: "Today 08:42" },
  { id: "u-3",  name: "Demo Maker",          email: "maker@demo.test",        role: "maker",        properties: "Skyline Dubai, Peaks Resort Zermatt",     mfa: false, lastActive: "Today 07:30" },
  { id: "u-4",  name: "L. Park",              email: "lpark@hotel.com",         role: "maker",        properties: "Oceanfront Cape Town",                 mfa: true,  lastActive: "Yesterday" },
  { id: "u-5",  name: "F. Setiawan",          email: "fsetiawan@greenview.id",  role: "maker",        properties: "Skyline Dubai",              mfa: true,  lastActive: "Today 11:02" },
  { id: "u-6",  name: "Aurora Linens Co.",   email: "esg@aurora-linens.eu",   role: "supplier",     properties: "—",                              mfa: true,  lastActive: "Yesterday" },
  { id: "u-7",  name: "Verifier — DNV",      email: "audit-team@dnv.com",     role: "auditor",      properties: "All (read-only)",               mfa: true,  lastActive: "3 days ago" },
];

const ROLE_TONE: Record<string, "good"|"info"|"warn"|"brand"|"neutral"> = {
  super_admin: "brand", maker: "info", checker: "good", property_sm: "info",
  gm: "info", corporate: "info", client_admin: "warn", auditor: "neutral",
  supplier: "neutral", curator: "neutral",
};

export default function AdminUsers() {
  return (
    <AdminShell
      eyebrow="Identity"
      title="Users & roles"
      subtitle="10 BRD roles. Role determines what someone sees and can do; property assignment scopes data access."
      actions={
        <>
          <button className="btn-secondary"><ShieldCheck size={14} /> Bulk MFA enforce</button>
          <button className="btn-primary"><Plus size={14} /> Invite user</button>
        </>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="Total users"   value={String(USERS.length)} />
        <Tile label="Roles defined"  value={String(ROLES.length)} hint="per BRD §4" />
        <Tile label="MFA enforced"   value="86%" hint="6 of 7 active" />
        <Tile label="External users" value="124" hint="suppliers + auditors" />
      </div>

      <Card>
        <CardHeader title="Role catalogue" hint="What each role can see and do" />
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {ROLES.map((r) => (
            <div key={r.key} className="rounded-xl border border-ink-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-ink-900">{r.label}</div>
                <Badge tone={ROLE_TONE[r.key]}>{r.count}</Badge>
              </div>
              <div className="text-[11px] text-ink-500 mt-0.5">{r.scope}</div>
              <div className="text-[12px] text-ink-700 mt-1">{r.description}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex items-center gap-2">
        <div className="relative w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Search users, emails, roles…" />
        </div>
        <select className="input max-w-[160px]"><option>All roles</option></select>
        <select className="input max-w-[160px]"><option>MFA: any</option></select>
      </div>

      <Card>
        <CardHeader title="Users" />
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Name</th>
                <th className="table-th">Email</th>
                <th className="table-th">Role</th>
                <th className="table-th">Property scope</th>
                <th className="table-th">MFA</th>
                <th className="table-th">Last active</th>
                <th className="table-th text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {USERS.map((u) => (
                <tr key={u.id} className="hover:bg-ink-50/60">
                  <td className="table-td font-medium text-ink-900">{u.name}</td>
                  <td className="table-td">{u.email}</td>
                  <td className="table-td">
                    <Badge tone={ROLE_TONE[u.role]}>{u.role.replace("_", " ")}</Badge>
                  </td>
                  <td className="table-td">{u.properties}</td>
                  <td className="table-td">
                    <Badge tone={u.mfa ? "good" : "warn"}>
                      {u.mfa ? "Enforced" : "Not enabled"}
                    </Badge>
                  </td>
                  <td className="table-td">{u.lastActive}</td>
                  <td className="table-td text-right pr-6">
                    <button className="btn-ghost h-7 px-2 text-[12px] text-brand-700"><UserCog size={12} /> Manage</button>
                    <button className="btn-ghost h-7 px-2 text-[12px] text-bad"><UserMinus size={12} /> Suspend</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminShell>
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
