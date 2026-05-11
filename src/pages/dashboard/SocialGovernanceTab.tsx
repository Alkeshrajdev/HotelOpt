import { Link } from "react-router-dom";
import { Users, ShieldCheck, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { ESG_TOTALS, PORTFOLIO_SOCIAL_BY_HOTEL, PORTFOLIO_GOVERNANCE_BY_HOTEL } from "@/lib/mock";
import { cn } from "@/lib/utils";

function MetricStrip({ items }: { items: { label: string; value: string; sub?: string; tone?: "good" | "warn" | "bad" }[] }) {
  return (
    <div className="flex divide-x divide-ink-100 overflow-x-auto rounded-xl border border-ink-100 bg-white mb-5">
      {items.map((item) => (
        <div key={item.label} className="px-5 py-4 min-w-[140px] flex-1">
          <div className="text-[10px] uppercase font-semibold tracking-wider text-ink-400 truncate">{item.label}</div>
          <div className="text-xl font-bold text-ink-900 tabular-nums mt-1">{item.value}</div>
          {item.sub && (
            <div className={cn("text-[11px] mt-0.5", item.tone ? `text-${item.tone}` : "text-ink-400")}>{item.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function SocialSection() {
  const avgTraining = Math.round(
    PORTFOLIO_SOCIAL_BY_HOTEL.reduce((s, h) => s + h.trainingHrs, 0) / PORTFOLIO_SOCIAL_BY_HOTEL.length
  );
  const avgLtifr = (
    PORTFOLIO_SOCIAL_BY_HOTEL.reduce((s, h) => s + h.ltifr, 0) / PORTFOLIO_SOCIAL_BY_HOTEL.length
  ).toFixed(2);

  const trainingData = [...PORTFOLIO_SOCIAL_BY_HOTEL]
    .sort((a, b) => b.trainingHrs - a.trainingHrs)
    .map((h) => ({ name: h.hotel.replace(" Hotel", "").replace("Residences ", "").replace("Resort ", ""), hrs: h.trainingHrs }));

  const ltifrData = [...PORTFOLIO_SOCIAL_BY_HOTEL]
    .sort((a, b) => b.ltifr - a.ltifr)
    .map((h) => ({ name: h.hotel.replace(" Hotel", "").replace("Residences ", "").replace("Resort ", ""), ltifr: h.ltifr }));

  return (
    <div className="space-y-5">
      <MetricStrip items={[
        { label: "Training Hrs/FTE",  value: `${ESG_TOTALS.social.trainingHoursPerFTE} hrs`,  sub: "portfolio average" },
        { label: "LTIFR",             value: String(ESG_TOTALS.social.ltifr),                  sub: "per 200k hrs worked", tone: "good" },
        { label: "Staff Turnover",    value: `${ESG_TOTALS.social.turnoverPct}%`,              sub: "annualised", tone: "warn" },
        { label: "Local Sourcing",    value: `${ESG_TOTALS.social.localSourcingPct}%`,         sub: "of F&B spend", tone: "good" },
        { label: "Total FTE",         value: "1,985",                                           sub: "across 10 hotels" },
        { label: "Hotels Reporting",  value: "9 / 10",                                          sub: "Bangkok partial", tone: "warn" },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Training Hours per FTE" hint="by hotel — portfolio average shown" />
          <div className="px-4 pb-4 pt-2">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trainingData} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 130 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={125} tick={{ fontSize: 10, fill: "#334155" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                  formatter={(v: number) => [`${v} hrs/FTE`, "Training"]} />
                <ReferenceLine
                  x={avgTraining}
                  stroke="#94A3B8"
                  strokeDasharray="4 3"
                  label={{ value: `Avg ${avgTraining}`, position: "top", fontSize: 10, fill: "#64748B" }}
                />
                <Bar dataKey="hrs" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {trainingData.map((d) => (
                    <Cell key={d.name} fill={d.hrs >= 30 ? "#22C55E" : d.hrs >= 20 ? "#F59E0B" : "#EF4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="LTIFR by Hotel" hint="lost time injury frequency rate — lower is better" />
          <div className="px-4 pb-4 pt-2">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ltifrData} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 130 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={125} tick={{ fontSize: 10, fill: "#334155" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                  formatter={(v: number) => [`${v.toFixed(2)}`, "LTIFR"]} />
                <Bar dataKey="ltifr" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {ltifrData.map((d) => (
                    <Cell key={d.name} fill={d.ltifr <= 0.5 ? "#22C55E" : d.ltifr <= 1.0 ? "#F59E0B" : "#EF4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Social table */}
      <Card>
        <CardHeader title="Social Metrics by Hotel" hint="all key people indicators" />
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Hotel</th>
                <th className="table-th text-right">FTE</th>
                <th className="table-th text-right">Training hrs/FTE</th>
                <th className="table-th text-right">LTIFR</th>
                <th className="table-th text-right">Turnover %</th>
                <th className="table-th text-right">Local Sourcing %</th>
              </tr>
            </thead>
            <tbody>
              {[...PORTFOLIO_SOCIAL_BY_HOTEL]
                .sort((a, b) => b.ltifr - a.ltifr)
                .map((h) => (
                  <tr key={h.hotel} className="hover:bg-ink-50/60">
                    <td className="table-td font-medium text-ink-900 whitespace-nowrap">{h.hotel}</td>
                    <td className="table-td text-right tabular-nums text-[12px] text-ink-700">{h.fte}</td>
                    <td className="table-td text-right">
                      <Badge tone={h.trainingHrs >= 30 ? "good" : h.trainingHrs >= 20 ? "warn" : "bad"}>
                        {h.trainingHrs} hrs
                      </Badge>
                    </td>
                    <td className="table-td text-right">
                      <Badge tone={h.ltifr <= 0.5 ? "good" : h.ltifr <= 1.0 ? "warn" : "bad"}>
                        {h.ltifr.toFixed(2)}
                      </Badge>
                    </td>
                    <td className="table-td text-right">
                      <Badge tone={h.turnoverPct <= 18 ? "good" : h.turnoverPct <= 25 ? "warn" : "bad"}>
                        {h.turnoverPct}%
                      </Badge>
                    </td>
                    <td className="table-td text-right">
                      <Badge tone={h.localSourcingPct >= 50 ? "good" : h.localSourcingPct >= 35 ? "warn" : "bad"}>
                        {h.localSourcingPct}%
                      </Badge>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function GovernanceSection() {
  const avgAttestations = Math.round(
    PORTFOLIO_GOVERNANCE_BY_HOTEL.reduce((s, h) => s + h.attestationsPct, 0) / PORTFOLIO_GOVERNANCE_BY_HOTEL.length
  );
  const totalGaps = PORTFOLIO_GOVERNANCE_BY_HOTEL.reduce((s, h) => s + h.openGaps, 0);

  const attestationData = [...PORTFOLIO_GOVERNANCE_BY_HOTEL]
    .sort((a, b) => a.attestationsPct - b.attestationsPct)
    .map((h) => ({
      name: h.hotel.replace(" Hotel", "").replace("Residences ", "").replace("Resort ", ""),
      attestations: h.attestationsPct,
      supplierCode: h.supplierCodePct,
    }));

  return (
    <div className="space-y-5">
      <MetricStrip items={[
        { label: "Attestations",       value: `${ESG_TOTALS.governance.attestationsPct}%`,    sub: "portfolio average", tone: "warn" },
        { label: "Supplier Code",      value: `${ESG_TOTALS.governance.supplierCodeAdoption}%`, sub: "adoption rate",   tone: "warn" },
        { label: "Open Gaps",          value: String(totalGaps),                                sub: "across portfolio", tone: "bad" },
        { label: "Certified Hotels",   value: "6 / 10",                                         sub: "active certs" },
        { label: "Avg Certifications", value: "1.4 / hotel",                                    sub: "across active hotels" },
        { label: "Next Audit",         value: "45 days",                                         sub: "Green Globe renewal", tone: "warn" },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Attestations & Supplier Code by Hotel" hint="% complete — worst first" />
          <div className="px-4 pb-4 pt-2">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={attestationData} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 130 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" width={125} tick={{ fontSize: 10, fill: "#334155" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                  formatter={(v: number, n: string) => [`${v}%`, n === "attestations" ? "Attestations" : "Supplier Code"]} />
                <Bar dataKey="attestations" name="attestations" fill="#6366F1" radius={[0, 2, 2, 0]} maxBarSize={10} />
                <Bar dataKey="supplierCode" name="supplierCode" fill="#A5B4FC" radius={[0, 2, 2, 0]} maxBarSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Certification Status by Hotel"
            hint="active certifications held"
            right={<Badge tone="warn">4 uncertified</Badge>}
          />
          <div className="p-4">
            <ul className="space-y-2">
              {PORTFOLIO_GOVERNANCE_BY_HOTEL.map((h) => (
                <li key={h.hotel} className="flex items-start justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-ink-50 transition-colors">
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-ink-900 truncate">{h.hotel}</div>
                    {h.certifications.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {h.certifications.map((c) => (
                          <span key={c} className="chip bg-good/10 text-good text-[10px]">{c}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-bad">No active certification</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {h.openGaps > 0 && (
                      <Badge tone="bad">{h.openGaps} gap{h.openGaps > 1 ? "s" : ""}</Badge>
                    )}
                    {h.certifications.length > 0 ? (
                      <CheckCircle2 size={14} className="text-good shrink-0" />
                    ) : (
                      <XCircle size={14} className="text-bad shrink-0" />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      {/* Open gaps table */}
      <Card>
        <CardHeader
          title="Open Governance Gaps"
          hint="items requiring action"
          right={<Badge tone="bad">{totalGaps} total open gaps</Badge>}
        />
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Hotel</th>
                <th className="table-th text-right">Attestations %</th>
                <th className="table-th text-right">Supplier Code %</th>
                <th className="table-th text-right">Open Gaps</th>
                <th className="table-th text-right pr-6">Action</th>
              </tr>
            </thead>
            <tbody>
              {[...PORTFOLIO_GOVERNANCE_BY_HOTEL]
                .filter((h) => h.openGaps > 0)
                .sort((a, b) => b.openGaps - a.openGaps)
                .map((h) => (
                  <tr key={h.hotel} className="hover:bg-ink-50/60">
                    <td className="table-td font-medium text-ink-900 whitespace-nowrap">{h.hotel}</td>
                    <td className="table-td text-right">
                      <Badge tone={h.attestationsPct >= 85 ? "good" : h.attestationsPct >= 70 ? "warn" : "bad"}>
                        {h.attestationsPct}%
                      </Badge>
                    </td>
                    <td className="table-td text-right">
                      <Badge tone={h.supplierCodePct >= 75 ? "good" : h.supplierCodePct >= 55 ? "warn" : "bad"}>
                        {h.supplierCodePct}%
                      </Badge>
                    </td>
                    <td className="table-td text-right">
                      <Badge tone={h.openGaps <= 2 ? "warn" : "bad"}>{h.openGaps}</Badge>
                    </td>
                    <td className="table-td text-right pr-6">
                      <Link
                        to="/actions"
                        className="btn-secondary h-7 px-3 text-[11px] text-brand-700 border-brand-200 hover:bg-brand-50 inline-flex items-center gap-1"
                      >
                        Resolve
                      </Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default function SocialGovernanceTab() {
  return (
    <div className="space-y-8">
      {/* Social */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-xl bg-pillar-social/10 grid place-items-center">
            <Users size={16} className="text-pillar-social" />
          </div>
          <div>
            <div className="text-[14px] font-semibold text-ink-900">Social</div>
            <div className="text-[11px] text-ink-500">People, safety, and community</div>
          </div>
          <Link
            to="/performance/social/overview"
            className="ml-auto text-[12px] font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1"
          >
            Open Social Hub <ArrowRight size={12} />
          </Link>
        </div>
        <SocialSection />
      </div>

      <div className="h-px bg-ink-100" />

      {/* Governance */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-xl bg-pillar-gov/10 grid place-items-center">
            <ShieldCheck size={16} className="text-pillar-gov" />
          </div>
          <div>
            <div className="text-[14px] font-semibold text-ink-900">Governance</div>
            <div className="text-[11px] text-ink-500">Compliance, certifications, and accountability</div>
          </div>
          <Link
            to="/performance/governance/overview"
            className="ml-auto text-[12px] font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1"
          >
            Open Governance Hub <ArrowRight size={12} />
          </Link>
        </div>
        <GovernanceSection />
      </div>
    </div>
  );
}
