import { Globe2, Plus, ShieldAlert, Users2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import AdminShell from "./AdminShell";

const POOLS = [
  { id: "p-001", name: "Direct SaaS · global",        client: "Direct SaaS",         properties: 32, climate: "All",        starBand: "All",  rooms: "Any",        level: "Full",        confidentiality: "isolated" },
  { id: "p-002", name: "Aurora — APAC luxury",         client: "Aurora Hospitality", properties: 14, climate: "Hot & humid",starBand: "5★",   rooms: "200–350",    level: "Full",        confidentiality: "isolated" },
  { id: "p-003", name: "Aurora — EMEA city",           client: "Aurora Hospitality", properties: 10, climate: "Temperate",  starBand: "4–5★", rooms: "200–500",    level: "Directional", confidentiality: "isolated" },
  { id: "p-004", name: "Pacifica — Asia coastal",      client: "Pacifica Resorts",   properties: 7,  climate: "Tropical",   starBand: "5★",   rooms: "200–350",    level: "Directional", confidentiality: "isolated" },
  { id: "p-005", name: "MENA-Sustain — onboarding",    client: "MENA Sustainable",   properties: 2,  climate: "Hot & arid", starBand: "4★",   rooms: "200–350",    level: "Reference",   confidentiality: "isolated" },
];

const POOL_TONE: Record<string, "good"|"warn"|"info"> = {
  "Full": "good", "Directional": "warn", "Reference": "info",
};

export default function AdminPools() {
  return (
    <AdminShell
      eyebrow="External comparison"
      title="Comparable pools"
      subtitle="Pools are isolated per client deployment. A property in one client's pool is never compared against any other client's properties (BRD §2.3). Display level is set automatically by pool size."
      actions={<button className="btn-primary"><Plus size={14} /> New pool</button>}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="Total pools"          value={String(POOLS.length)} />
        <Tile label="Properties pooled"    value={String(POOLS.reduce((s, p) => s + p.properties, 0))} />
        <Tile label="Full-display pools"   value={String(POOLS.filter((p) => p.level === "Full").length)} hint="≥ 10 properties" />
        <Tile label="Onboarding pools"     value={String(POOLS.filter((p) => p.level === "Reference").length)} hint="< 4 properties" />
      </div>

      <div className="rounded-xl border border-warn/25 bg-warn/10/40 p-3 flex items-start gap-2 text-[13px] text-warn">
        <ShieldAlert size={14} className="text-warn mt-0.5" />
        <span>
          <strong>Pool isolation rule:</strong> Direct SaaS forms one global pool; each white-label client has its own isolated pool; Sovereign Hosting clients run their pool entirely inside their own infrastructure. No cross-pool data sharing — ever.
        </span>
      </div>

      <Card>
        <CardHeader title="Pools" hint="Filters: climate, star rating, size band" />
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Pool</th>
                <th className="table-th">Client</th>
                <th className="table-th">Properties</th>
                <th className="table-th">Climate</th>
                <th className="table-th">Star</th>
                <th className="table-th">Rooms</th>
                <th className="table-th">Display level</th>
                <th className="table-th">Confidentiality</th>
              </tr>
            </thead>
            <tbody>
              {POOLS.map((p) => (
                <tr key={p.id} className="hover:bg-ink-50/60">
                  <td className="table-td font-medium text-ink-900">
                    <div className="flex items-center gap-2"><Globe2 size={14} className="text-brand-700" /> {p.name}</div>
                  </td>
                  <td className="table-td">{p.client}</td>
                  <td className="table-td tabular-nums">{p.properties}</td>
                  <td className="table-td">{p.climate}</td>
                  <td className="table-td">{p.starBand}</td>
                  <td className="table-td">{p.rooms}</td>
                  <td className="table-td">
                    <Badge tone={POOL_TONE[p.level]}>{p.level}</Badge>
                  </td>
                  <td className="table-td">
                    <Badge tone="brand"><Users2 size={11} /> Isolated</Badge>
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
