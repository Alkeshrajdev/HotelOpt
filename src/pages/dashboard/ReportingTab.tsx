import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type ReportStatus = "Ready" | "Mapped" | "Draft" | "Blocked";

const REPORTING_STATUS: {
  name: string;
  status: ReportStatus;
  coverage: number;
  hotels: number;
  missing: number;
  gaps: number;
  blocker: string | null;
  owner: string;
  generated: string | null;
}[] = [
  { name: "Portfolio Sustainability Summary", status: "Ready",   coverage: 94, hotels: 8, missing: 0,  gaps: 0,  blocker: null,                                              owner: "Sarah Chen",    generated: "2 days ago"  },
  { name: "GHG Inventory",                    status: "Ready",   coverage: 92, hotels: 8, missing: 1,  gaps: 2,  blocker: null,                                              owner: "Sarah Chen",    generated: "4 days ago"  },
  { name: "GRI Standards",                    status: "Mapped",  coverage: 86, hotels: 8, missing: 3,  gaps: 4,  blocker: null,                                              owner: "Marco Rossi",   generated: "1 week ago"  },
  { name: "SBTi Net-Zero",                    status: "Draft",   coverage: 71, hotels: 6, missing: 8,  gaps: 6,  blocker: "Scope 3 travel data incomplete",                  owner: "Sarah Chen",    generated: null          },
  { name: "HCMI Guest Footprint",             status: "Ready",   coverage: 88, hotels: 8, missing: 2,  gaps: 1,  blocker: null,                                              owner: "Jin Park",      generated: "3 days ago"  },
  { name: "CSRD / ESRS Draft",               status: "Draft",   coverage: 61, hotels: 5, missing: 14, gaps: 9,  blocker: "Social indicators gap — 3 KPIs missing",          owner: "Sophie Müller", generated: null          },
  { name: "GRESB",                            status: "Mapped",  coverage: 81, hotels: 8, missing: 4,  gaps: 3,  blocker: null,                                              owner: "Sarah Chen",    generated: "2 weeks ago" },
  { name: "Certification Evidence Pack",      status: "Blocked", coverage: 74, hotels: 8, missing: 6,  gaps: 18, blocker: "Green Globe evidence 12% short",                  owner: "Layla Al-Hassan",generated: null         },
];

const CERT_PROGRAMMES = [
  { name: "Green Key",     readiness: 84, status: "ok"   as const, nextAudit: "Jun 15, 2025" },
  { name: "Travelife",     readiness: 76, status: "warn" as const, nextAudit: "Jun 30, 2025" },
  { name: "EarthCheck",    readiness: 65, status: "warn" as const, nextAudit: "Sep 12, 2025" },
  { name: "EU Ecolabel",   readiness: 79, status: "warn" as const, nextAudit: "Oct 3, 2025"  },
  { name: "Green Globe",   readiness: 62, status: "bad"  as const, nextAudit: "May 15, 2025" },
  { name: "Fair Trade",    readiness: 91, status: "ok"   as const, nextAudit: "Dec 1, 2025"  },
];

const AUDIT_EVENTS = [
  { date: "15 May", event: "GRI Data Freeze" },
  { date: "1 Jun",  event: "CDP Portal Opens" },
  { date: "15 Jun", event: "Green Key Renewal — Pavilion London" },
  { date: "30 Jun", event: "GRI Report Deadline" },
  { date: "30 Jun", event: "Travelife Renewal — Marina Barcelona" },
];

const STATUS_TONE: Record<ReportStatus, "good" | "brand" | "warn" | "bad"> = {
  Ready:   "good",
  Mapped:  "brand",
  Draft:   "warn",
  Blocked: "bad",
};

const ACTION_LABEL: Record<ReportStatus, string> = {
  Ready:   "Generate",
  Mapped:  "Review",
  Draft:   "Continue",
  Blocked: "Resolve",
};

type CertStatus = "ok" | "warn" | "bad";
const CERT_STATUS_TONE: Record<CertStatus, "good" | "warn" | "bad"> = {
  ok:   "good",
  warn: "warn",
  bad:  "bad",
};

export default function ReportingTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Reporting Status"
          hint="GRI · GHG · SBTi · HCMI · CSRD · GRESB · Certification"
          right={
            <Link
              to="/portfolio/reports-certifications"
              className="text-[12px] font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1"
            >
              Open Reports <ArrowRight size={12} />
            </Link>
          }
        />
        <div className="overflow-x-auto mt-2">
          <table className="min-w-full">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Report / Framework</th>
                <th className="table-th">Status</th>
                <th className="table-th">Coverage</th>
                <th className="table-th">Hotels</th>
                <th className="table-th">Missing</th>
                <th className="table-th">Gaps</th>
                <th className="table-th">Blocking Issue</th>
                <th className="table-th">Owner</th>
                <th className="table-th">Last Generated</th>
                <th className="table-th text-right pr-6">Action</th>
              </tr>
            </thead>
            <tbody>
              {REPORTING_STATUS.map((r) => (
                <tr key={r.name} className="hover:bg-ink-50/60">
                  <td className="table-td font-semibold text-ink-900 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <FileText size={13} className="text-ink-400 shrink-0" />
                      {r.name}
                    </div>
                  </td>
                  <td className="table-td">
                    <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            r.coverage >= 80 ? "bg-good" : r.coverage >= 60 ? "bg-warn" : "bg-bad"
                          )}
                          style={{ width: `${r.coverage}%` }}
                        />
                      </div>
                      <span className="text-[12px] font-semibold tabular-nums">{r.coverage}%</span>
                    </div>
                  </td>
                  <td className="table-td text-[12px] text-ink-700 tabular-nums">{r.hotels}</td>
                  <td className="table-td">
                    {r.missing > 0 ? (
                      <span className="text-[12px] font-semibold text-bad tabular-nums">{r.missing}</span>
                    ) : (
                      <CheckCircle2 size={13} className="text-good" />
                    )}
                  </td>
                  <td className="table-td">
                    {r.gaps > 0 ? (
                      <span className="text-[12px] font-semibold text-warn tabular-nums">{r.gaps}</span>
                    ) : (
                      <CheckCircle2 size={13} className="text-good" />
                    )}
                  </td>
                  <td className="table-td max-w-[200px]">
                    {r.blocker ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-bad">
                        <AlertTriangle size={11} className="shrink-0" />
                        <span className="line-clamp-1">{r.blocker}</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] text-good">
                        <CheckCircle2 size={11} /> No blockers
                      </span>
                    )}
                  </td>
                  <td className="table-td text-[12px] text-ink-700 whitespace-nowrap">{r.owner}</td>
                  <td className="table-td text-[12px] text-ink-500 whitespace-nowrap">
                    {r.generated ?? <span className="text-ink-300">—</span>}
                  </td>
                  <td className="table-td text-right pr-6">
                    <Link
                      to="/portfolio/reports-certifications"
                      className={cn(
                        "btn-secondary h-7 px-3 text-[12px] inline-flex items-center gap-1",
                        r.status === "Ready"
                          ? "text-good border-good/30 hover:bg-good/10"
                          : r.status === "Blocked"
                          ? "text-bad border-bad/30 hover:bg-bad/10"
                          : "text-brand-700 border-brand-200 hover:bg-brand-50"
                      )}
                    >
                      {r.status === "Ready" && <Download size={11} />}
                      {ACTION_LABEL[r.status]}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <CardHeader
            title="Certification Readiness"
            hint="active programmes · evidence coverage"
            right={<Badge tone="warn">45 days to audit</Badge>}
          />
          <div className="p-6 pt-4 space-y-3">
            {CERT_PROGRAMMES.map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <div className="w-28 shrink-0">
                  <div className="text-[12px] font-semibold text-ink-900">{c.name}</div>
                  <div className="text-[10px] text-ink-400">{c.nextAudit}</div>
                </div>
                <div className="flex-1 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      c.readiness >= 85 ? "bg-good" : c.readiness >= 70 ? "bg-warn" : "bg-bad"
                    )}
                    style={{ width: `${c.readiness}%` }}
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[12px] font-semibold tabular-nums text-ink-700 w-8 text-right">
                    {c.readiness}%
                  </span>
                  <Badge tone={CERT_STATUS_TONE[c.status]}>
                    {c.status === "ok" ? "OK" : c.status === "warn" ? "Review" : "Critical"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Audit Calendar"
            hint="upcoming certification and reporting deadlines"
            right={<Award size={16} className="text-warn" />}
          />
          <ul className="px-3 pb-4 mt-3 space-y-1">
            {AUDIT_EVENTS.map((e) => (
              <li key={`${e.date}-${e.event}`} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-ink-50 transition-colors">
                <div className="flex items-center gap-2 shrink-0">
                  <Calendar size={13} className="text-brand-500" />
                  <span className="text-[11px] font-bold text-brand-700 w-12 shrink-0">{e.date}</span>
                </div>
                <span className="text-[12px] text-ink-700">{e.event}</span>
              </li>
            ))}
          </ul>
          <div className="px-6 pb-6">
            <Link
              to="/portfolio/reports-certifications"
              className="btn-secondary w-full justify-center"
            >
              Open Full Report Centre <ArrowRight size={13} />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
