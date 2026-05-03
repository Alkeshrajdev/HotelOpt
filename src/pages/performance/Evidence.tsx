import { CheckCircle2, FileText, FolderOpen, ShieldAlert, Upload } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { GOVERNANCE } from "@/lib/pillarData";
import type { PillarKey } from "./Shell";

const SOCIAL_EVIDENCE = [
  { name: "Diversity & inclusion policy",  type: "PDF",  date: "2026-02-14", status: "ready" as const },
  { name: "Employee handbook 2026",        type: "PDF",  date: "2026-01-08", status: "ready" as const },
  { name: "H&S management plan",           type: "PDF",  date: "2026-03-22", status: "ready" as const },
  { name: "Grievance log",                 type: "XLSX", date: "2026-04-30", status: "ready" as const },
  { name: "Training register",             type: "XLSX", date: "2026-04-28", status: "ready" as const },
  { name: "Local sourcing programme",      type: "PDF",  date: "2025-12-02", status: "ready" as const },
  { name: "Community partnership log",     type: "PDF",  date: "2026-04-15", status: "ready" as const },
  { name: "Pay equity audit (2025)",       type: "PDF",  date: "—",          status: "gap"   as const },
];

export default function Evidence({ pillar }: { pillar: PillarKey }) {
  if (pillar === "governance") {
    const items = GOVERNANCE.attestationItems;
    const ready = items.filter((i) => i.status === "ready").length;
    return (
      <div className="space-y-5">
        <Card>
          <CardHeader
            title="Annual attestations register"
            hint={`${ready} of ${items.length} attested · 1 outstanding`}
            right={
              <button className="btn-primary">
                <Upload size={14} /> Attach evidence
              </button>
            }
          />
          <ul className="p-5 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {items.map((a) => (
              <li
                key={a.name}
                className="flex items-center justify-between rounded-xl border border-ink-200 p-3 bg-white"
              >
                <div className="flex items-center gap-2">
                  {a.status === "ready" ? (
                    <CheckCircle2 size={16} className="text-good" />
                  ) : (
                    <ShieldAlert size={16} className="text-bad" />
                  )}
                  <span className="text-ink-900 font-medium">{a.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-ink-500">{a.lastAttested}</span>
                  {a.status === "ready" ? (
                    <Badge tone="good">Attested</Badge>
                  ) : (
                    <Badge tone="bad">Gap</Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Audit trail of attestations" hint="Immutable · FR-2.5" />
          <ul className="p-5 space-y-2 text-sm">
            <Trail by="James Wilson" what="Attested Anti-corruption policy" when="2026-03-12" />
            <Trail by="Lina Park" what="Re-signed Supplier code of conduct" when="2026-04-02" />
            <Trail by="Erik Aksoy" what="Filed Conflict of interest register" when="2026-04-15" />
          </ul>
        </Card>
      </div>
    );
  }

  // Social — evidence library
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Evidence library"
          hint="Files supporting GRI 401 / 403 / 404 / 405 / 413 / 414 disclosures"
          right={
            <button className="btn-primary">
              <Upload size={14} /> Upload file
            </button>
          }
        />
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Name</th>
                <th className="table-th">Type</th>
                <th className="table-th">Last updated</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {SOCIAL_EVIDENCE.map((e) => (
                <tr key={e.name} className="hover:bg-ink-50/60">
                  <td className="table-td font-medium text-ink-900">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-brand-700" /> {e.name}
                    </div>
                  </td>
                  <td className="table-td">{e.type}</td>
                  <td className="table-td">{e.date}</td>
                  <td className="table-td">
                    {e.status === "ready" ? (
                      <Badge tone="good">Filed</Badge>
                    ) : (
                      <Badge tone="bad">Gap</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="Linked certifications" />
        <ul className="p-5 space-y-2 text-sm">
          <li className="flex items-center justify-between rounded-xl border border-ink-200 p-3">
            <div className="flex items-center gap-2"><FolderOpen size={14} className="text-brand-700" /> GSTC criteria B6 — local sourcing</div>
            <Badge tone="warn">2 supplier attestations needed</Badge>
          </li>
          <li className="flex items-center justify-between rounded-xl border border-ink-200 p-3">
            <div className="flex items-center gap-2"><FolderOpen size={14} className="text-brand-700" /> Travelife — labour standards</div>
            <Badge tone="good">Ready</Badge>
          </li>
          <li className="flex items-center justify-between rounded-xl border border-ink-200 p-3">
            <div className="flex items-center gap-2"><FolderOpen size={14} className="text-brand-700" /> Green Globe — community engagement</div>
            <Badge tone="good">Ready</Badge>
          </li>
        </ul>
      </Card>
    </div>
  );
}

function Trail({ by, what, when }: { by: string; what: string; when: string }) {
  return (
    <li className="flex items-center justify-between rounded-xl border border-ink-200 p-3">
      <div>
        <div className="font-medium text-ink-900">{what}</div>
        <div className="text-[11px] text-ink-500">{by}</div>
      </div>
      <span className="text-[11px] text-ink-500">{when}</span>
    </li>
  );
}
