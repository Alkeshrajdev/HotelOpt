import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, ShieldCheck, ArrowRight, ChevronRight,
  BookOpen, AlertTriangle, FileText, ClipboardList,
  Building2, AlertCircle, TrendingUp, CheckCircle2, ExternalLink, X,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  ReferenceLine, LineChart, Line, CartesianGrid,
} from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import {
  PORTFOLIO_SOCIAL_BY_HOTEL,
  PORTFOLIO_GOVERNANCE_BY_HOTEL,
  SG_TRAINING_BY_HOTEL,
  SG_LTIFR_TREND,
  SG_POLICY_MATRIX,
  SG_SUPPLIER_FUNNEL,
  SG_EVIDENCE_GAPS,
  SG_HOTEL_GAP_TABLE,
} from "@/lib/mock";
import { cn } from "@/lib/utils";

/* ─── Types ──────────────────────────────────────────────────────────────── */
type HotelStatus = "complete"|"partial"|"missing"|"needs-review"|"na";

function statusTone(s: string): "good"|"warn"|"bad" {
  if (s === "complete" || s === "current") return "good";
  if (s === "partial" || s === "needs-review" || s === "expiring") return "warn";
  return "bad";
}
function statusLabel(s: HotelStatus) {
  return { complete:"Complete", partial:"Partial", missing:"Missing", "needs-review":"Review", na:"N/A" }[s];
}

/* ─── Compact KPI tile ───────────────────────────────────────────────────── */
function KpiCard({ icon: Icon, iconBg, label, value, tone, sub }: {
  icon: React.ElementType; iconBg: string; label: string; value: string;
  tone?: "good"|"warn"|"bad"; sub?: string;
}) {
  const valueColor = tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : tone === "bad" ? "text-bad" : "text-ink-900";
  return (
    <div className="card p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400 leading-tight">{label}</span>
        <div className={cn("w-6 h-6 rounded-lg grid place-items-center shrink-0", iconBg)}>
          <Icon size={12} />
        </div>
      </div>
      <div className={cn("text-[1.6rem] font-bold tabular-nums leading-none mt-1", valueColor)}>{value}</div>
      {sub && <div className="text-[11px] text-ink-500">{sub}</div>}
    </div>
  );
}

/* ─── Collapsible section ────────────────────────────────────────────────── */
function Section({ title, defaultOpen = true, compact, children }: {
  title: string; defaultOpen?: boolean; compact?: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 py-3 border-b border-ink-100 hover:bg-ink-50/50 px-1 rounded-lg transition-colors"
      >
        <ChevronRight
          size={14}
          className={cn("text-ink-400 transition-transform shrink-0", open && "rotate-90")}
        />
        <span className="font-semibold text-[14px] text-ink-900">{title}</span>
        {!open && compact && (
          <span className="ml-2 text-[12px] text-ink-400">{compact}</span>
        )}
        <span className={cn("ml-auto text-[11px] font-medium", open ? "text-ink-400" : "text-brand-600")}>
          {open ? "Collapse" : "Expand"}
        </span>
      </button>
      {open && <div className="pt-5">{children}</div>}
    </div>
  );
}

/* ─── Short tooltip ──────────────────────────────────────────────────────── */
function ShortTip({ active, payload, label, suffix = "" }: {
  active?: boolean; payload?: { value: number }[]; label?: string; suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-ink-200 rounded-xl shadow-pop px-3 py-2 text-[12px]">
      <span className="font-semibold text-ink-800">{label}  </span>
      <span className="font-bold text-ink-900">{payload[0].value}{suffix}</span>
    </div>
  );
}

/* ─── People section ─────────────────────────────────────────────────────── */
function PeopleSection() {
  const avgTurnover = Math.round(
    PORTFOLIO_SOCIAL_BY_HOTEL.reduce((s, h) => s + h.turnoverPct, 0) / PORTFOLIO_SOCIAL_BY_HOTEL.length
  );

  const turnoverData = [...PORTFOLIO_SOCIAL_BY_HOTEL]
    .sort((a, b) => b.turnoverPct - a.turnoverPct)
    .map(h => ({
      name: h.hotel.replace(" Hotel","").replace("Residences ","").replace(" Resort","").replace("The ",""),
      val: h.turnoverPct,
    }));

  const trainingData = [...SG_TRAINING_BY_HOTEL]
    .sort((a, b) => b.overall - a.overall)
    .map(h => ({ name: h.shortName, val: h.overall }));
  const avgTraining = Math.round(trainingData.reduce((s, d) => s + d.val, 0) / trainingData.length);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

      {/* Training */}
      <Card>
        <CardHeader title="Training completion by hotel" />
        <div className="px-4 pb-4 pt-2">
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={trainingData} layout="vertical" margin={{ top:0, right:40, bottom:0, left:100 }}>
              <XAxis type="number" domain={[0,100]} tick={{ fontSize:10, fill:"#64748B" }} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`} />
              <YAxis type="category" dataKey="name" width={96} tick={{ fontSize:10, fill:"#334155" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ShortTip suffix="%" />} />
              <ReferenceLine x={avgTraining} stroke="#94A3B8" strokeDasharray="4 3" label={{ value:`Avg ${avgTraining}%`, position:"top", fontSize:10, fill:"#64748B" }} />
              <ReferenceLine x={75} stroke="#EF4444" strokeDasharray="3 3" opacity={0.3} />
              <Bar dataKey="val" radius={[0,4,4,0]} maxBarSize={16} isAnimationActive={false}>
                {trainingData.map(d => <Cell key={d.name} fill={d.val>=85?"#22C55E":d.val>=70?"#F59E0B":"#EF4444"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Turnover */}
      <Card>
        <CardHeader title="Employee turnover by hotel" />
        <div className="px-4 pb-4 pt-2">
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={turnoverData} layout="vertical" margin={{ top:0, right:40, bottom:0, left:100 }}>
              <XAxis type="number" tick={{ fontSize:10, fill:"#64748B" }} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`} />
              <YAxis type="category" dataKey="name" width={96} tick={{ fontSize:10, fill:"#334155" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ShortTip suffix="%" />} />
              <ReferenceLine x={avgTurnover} stroke="#94A3B8" strokeDasharray="4 3" label={{ value:`Avg ${avgTurnover}%`, position:"top", fontSize:10, fill:"#64748B" }} />
              <Bar dataKey="val" radius={[0,4,4,0]} maxBarSize={16} isAnimationActive={false}>
                {turnoverData.map(d => <Cell key={d.name} fill={d.val>25?"#EF4444":d.val>18?"#F59E0B":"#22C55E"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* LTIFR trend */}
      <Card className="lg:col-span-2">
        <CardHeader title="LTIFR — 12-month trend" />
        <div className="px-4 pb-4 pt-2">
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={SG_LTIFR_TREND} margin={{ top:4, right:8, bottom:0, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize:10, fill:"#64748B" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:10, fill:"#64748B" }} axisLine={false} tickLine={false} width={28} domain={[0,1.3]} />
              <Tooltip content={<ShortTip />} />
              <Line type="monotone" dataKey="ltifr" stroke="#F59E0B" strokeWidth={2.5} dot={false} activeDot={{ r:4, strokeWidth:0 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

    </div>
  );
}

/* ─── Governance section ─────────────────────────────────────────────────── */
function GovernanceSection() {
  const avgAttestation = Math.round(
    PORTFOLIO_GOVERNANCE_BY_HOTEL.reduce((s, h) => s + h.attestationsPct, 0) / PORTFOLIO_GOVERNANCE_BY_HOTEL.length
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

      {/* Policy status */}
      <Card>
        <CardHeader title="Policy status" />
        <div className="px-4 pb-4 pt-2 space-y-1">
          {SG_POLICY_MATRIX.map(p => (
            <div key={p.policy} className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-ink-50">
              <div className={cn("w-2 h-2 rounded-full shrink-0",
                p.status==="current"?"bg-good":p.status==="expiring"?"bg-warn":"bg-bad"
              )} />
              <div className="flex-1 min-w-0">
                <span className="text-[12px] font-medium text-ink-800">{p.policy}</span>
                <span className="text-[10px] text-ink-400 ml-2">{p.category}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {p.status==="expired"  && <Badge tone="bad">Expired {Math.abs(p.expiryDays)}d ago</Badge>}
                {p.status==="expiring" && <Badge tone="warn">Expires {p.expiryDays}d</Badge>}
                {p.status==="current"  && <Badge tone="good">Current</Badge>}
                {p.missingEvidence>0   && <span className="text-[10px] text-warn font-semibold">{p.missingEvidence} gap{p.missingEvidence>1?"s":""}</span>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Attestation by hotel */}
      <Card>
        <CardHeader
          title="Attestation completion"
          right={<span className="text-[12px] font-semibold text-ink-500">Avg {avgAttestation}% · target ≥90%</span>}
        />
        <div className="px-4 pb-4 pt-3 space-y-2">
          {[...PORTFOLIO_GOVERNANCE_BY_HOTEL]
            .sort((a, b) => a.attestationsPct - b.attestationsPct)
            .map(h => {
              const done = Math.round(h.attestationsPct / 100 * 12);
              const tone = h.attestationsPct>=85?"good":h.attestationsPct>=70?"warn":"bad";
              return (
                <div key={h.hotel} className="flex items-center gap-2.5">
                  <div className="w-[130px] shrink-0 text-[11px] text-ink-700 truncate">{h.hotel}</div>
                  <div className="flex-1 h-2.5 bg-ink-100 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", `bg-${tone}`)} style={{ width:`${h.attestationsPct}%` }} />
                  </div>
                  <span className={cn("text-[12px] font-bold tabular-nums w-9 text-right", `text-${tone}`)}>{h.attestationsPct}%</span>
                  <span className="text-[10px] text-ink-400 w-12">{done}/12</span>
                </div>
              );
            })}
        </div>
      </Card>

      {/* Supplier funnel */}
      <Card className="lg:col-span-2">
        <CardHeader title="Supplier governance funnel" />
        <div className="px-4 pb-4 pt-3">
          <div className="space-y-2 max-w-xl">
            {SG_SUPPLIER_FUNNEL.map((step, i) => {
              const prev = i>0 ? SG_SUPPLIER_FUNNEL[i-1].count : step.count;
              const drop = i>0 ? Math.round((1 - step.count/prev)*100) : null;
              return (
                <div key={step.stage}>
                  {drop !== null && (
                    <div className="text-[10px] text-ink-400 pl-2 py-0.5">
                      <span className="text-bad font-semibold">−{drop}%</span> ({prev-step.count} suppliers)
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="w-[130px] shrink-0 text-[11px] font-medium text-ink-700">{step.stage}</div>
                    <div className="flex-1 h-7 bg-ink-50 rounded-lg overflow-hidden relative">
                      <div
                        className="h-full rounded-lg flex items-center px-3"
                        style={{
                          width:`${Math.max(step.pct,15)}%`,
                          background: i===0?"#6366F1":i===1?"#818CF8":i===2?"#A5B4FC":"#C7D2FE",
                        }}
                      >
                        <span className="text-[11px] font-bold text-white">{step.count}</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-ink-600 tabular-nums w-10 text-right">{step.pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-3">
            {[{v:"74%",l:"Code signed",t:"ink"},{v:"52%",l:"ESG submitted",t:"warn"},{v:"43%",l:"Approved",t:"bad"}].map(s => (
              <div key={s.l} className="rounded-lg bg-ink-50 px-4 py-2 text-center">
                <div className={cn("text-[1.2rem] font-bold", s.t==="warn"?"text-warn":s.t==="bad"?"text-bad":"text-ink-900")}>{s.v}</div>
                <div className="text-[10px] text-ink-400">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

    </div>
  );
}

/* ─── Evidence gaps table ────────────────────────────────────────────────── */
function EvidenceSection() {
  const [filterHotel,  setFilterHotel]  = useState("All");
  const [filterArea,   setFilterArea]   = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  const hotels   = ["All", ...Array.from(new Set(SG_EVIDENCE_GAPS.map(g => g.hotel)))];
  const visible  = SG_EVIDENCE_GAPS.filter(g =>
    (filterHotel  === "All" || g.hotel  === filterHotel)  &&
    (filterArea   === "All" || g.area   === filterArea)   &&
    (filterStatus === "All" || g.status === filterStatus)
  );

  return (
    <div className="space-y-5">
      {/* Gaps table */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center text-[11px]">
          <select value={filterHotel} onChange={e=>setFilterHotel(e.target.value)}
            className="border border-ink-200 rounded-lg px-2 py-1.5 bg-white text-ink-700 text-[11px] focus:outline-none">
            {hotels.map(h=><option key={h}>{h}</option>)}
          </select>
          {["All","Social","Governance"].map(a=>(
            <button key={a} onClick={()=>setFilterArea(a)}
              className={cn("px-2.5 py-1.5 rounded-lg font-medium transition-colors",filterArea===a?"bg-brand-700 text-white":"bg-ink-100 text-ink-600 hover:bg-ink-200")}>
              {a}
            </button>
          ))}
          {["All","missing","overdue","expiring"].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)}
              className={cn("px-2.5 py-1.5 rounded-lg font-medium capitalize transition-colors",filterStatus===s?"bg-brand-700 text-white":"bg-ink-100 text-ink-600 hover:bg-ink-200")}>
              {s==="All"?"All statuses":s}
            </button>
          ))}
          {(filterHotel!=="All"||filterArea!=="All"||filterStatus!=="All") && (
            <button onClick={()=>{setFilterHotel("All");setFilterArea("All");setFilterStatus("All");}}
              className="text-brand-600 hover:underline font-medium">
              Clear
            </button>
          )}
        </div>
        <div className="rounded-xl border border-ink-100 overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-ink-50 border-b border-ink-100">
                <th className="table-th min-w-[200px]">Evidence needed</th>
                <th className="table-th">Hotel</th>
                <th className="table-th">Area</th>
                <th className="table-th">Owner</th>
                <th className="table-th">Due</th>
                <th className="table-th">Status</th>
                <th className="table-th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {visible.map(g=>(
                <tr key={g.id} className="hover:bg-ink-50/60">
                  <td className="table-td font-medium text-ink-800">{g.gap}</td>
                  <td className="table-td text-[11px] text-ink-600 whitespace-nowrap">{g.hotel}</td>
                  <td className="table-td">
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded",
                      g.area==="Social"?"bg-pillar-social/10 text-pillar-social":"bg-pillar-gov/10 text-pillar-gov"
                    )}>{g.area}</span>
                  </td>
                  <td className="table-td text-[11px] text-ink-600 whitespace-nowrap">{g.owner}</td>
                  <td className="table-td text-[11px] tabular-nums whitespace-nowrap">{g.due}</td>
                  <td className="table-td">
                    <Badge tone={g.status==="overdue"?"bad":g.status==="missing"?"bad":"warn"}>
                      {g.status==="overdue"?"Overdue":g.status==="missing"?"Missing":"Expiring"}
                    </Badge>
                  </td>
                  <td className="table-td">
                    <Link to="/review-approval"
                      className="btn-secondary h-7 px-2.5 text-[11px] text-brand-700 inline-flex items-center gap-1">
                      {g.status==="overdue"?"Follow up":g.status==="expiring"?"Renew":"Upload"}
                      <ExternalLink size={9} />
                    </Link>
                  </td>
                </tr>
              ))}
              {visible.length===0 && (
                <tr><td colSpan={7} className="table-td text-center text-ink-400 py-8">No gaps match the selected filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hotel overview */}
      <div className="rounded-xl border border-ink-100 overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-ink-50 border-b border-ink-100">
              <th className="table-th min-w-[140px]">Hotel</th>
              <th className="table-th text-center">Training</th>
              <th className="table-th text-center">H&S</th>
              <th className="table-th text-center">Policies</th>
              <th className="table-th text-right">Attestations</th>
              <th className="table-th text-center">Supplier Gov.</th>
              <th className="table-th text-right">Gaps</th>
              <th className="table-th text-center">Overall</th>
              <th className="table-th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50">
            {[...SG_HOTEL_GAP_TABLE]
              .sort((a,b)=>{
                const o = {"needs-review":0,"missing":1,"partial":2,"complete":3,"na":4};
                return (o[a.overall as HotelStatus]??3)-(o[b.overall as HotelStatus]??3);
              })
              .map(h=>(
                <tr key={h.hotel} className="hover:bg-ink-50/60">
                  <td className="table-td font-medium text-ink-900 whitespace-nowrap">{h.shortName}</td>
                  {([h.training,h.hs,h.policies] as string[]).map((s,i)=>(
                    <td key={i} className="table-td text-center">
                      <Badge tone={statusTone(s)}>{statusLabel(s as HotelStatus)}</Badge>
                    </td>
                  ))}
                  <td className="table-td text-right">
                    <span className={cn("text-[12px] font-bold tabular-nums",
                      h.attestations>=85?"text-good":h.attestations>=70?"text-warn":"text-bad"
                    )}>{h.attestations}%</span>
                  </td>
                  <td className="table-td text-center"><Badge tone={statusTone(h.supplierGov)}>{statusLabel(h.supplierGov as HotelStatus)}</Badge></td>
                  <td className="table-td text-right">
                    {h.gaps>0
                      ? <Badge tone={h.gaps<=2?"warn":"bad"}>{h.gaps}</Badge>
                      : <CheckCircle2 size={14} className="text-good mx-auto" />}
                  </td>
                  <td className="table-td text-center"><Badge tone={statusTone(h.overall)}>{statusLabel(h.overall as HotelStatus)}</Badge></td>
                  <td className="table-td">
                    <Link to="/properties"
                      className="btn-secondary h-7 px-2.5 text-[11px] text-brand-700 inline-flex items-center gap-1">
                      Review <ExternalLink size={9} />
                    </Link>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        <div className="px-4 py-2 border-t border-ink-50 flex flex-wrap gap-4 text-[10px] text-ink-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-good inline-block" />Complete</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warn inline-block" />Partial</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-bad inline-block" />Missing / Review</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Root ───────────────────────────────────────────────────────────────── */
export default function SocialGovernanceTab() {
  const criticalGaps = SG_EVIDENCE_GAPS.filter(g => g.status==="overdue"||g.status==="missing").length;
  const hotelsWithGaps = new Set(SG_EVIDENCE_GAPS.map(g => g.hotel)).size;
  const gapSummary = `${SG_EVIDENCE_GAPS.length} open · ${criticalGaps} critical · ${hotelsWithGaps} hotels`;

  return (
    <div className="space-y-2">

      {/* Hub links */}
      <div className="flex items-center justify-end gap-5 text-[12px] pb-2">
        <Link to="/performance/social/overview" className="font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1">
          Social hub <ArrowRight size={12} />
        </Link>
        <Link to="/performance/governance/overview" className="font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1">
          Governance hub <ArrowRight size={12} />
        </Link>
      </div>

      {/* KPI tiles — 6 practical tracking metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <KpiCard icon={TrendingUp}    iconBg="bg-pillar-social/10 text-pillar-social" label="Turnover"         value="22%"  tone="warn" sub="portfolio avg" />
        <KpiCard icon={BookOpen}      iconBg="bg-pillar-social/10 text-pillar-social" label="Training"         value="76%"  tone="warn" sub="completion" />
        <KpiCard icon={AlertTriangle} iconBg="bg-warn/10 text-warn"                   label="LTIFR"            value="0.82" tone="good" sub="improving ↓" />
        <KpiCard icon={FileText}      iconBg="bg-pillar-gov/10 text-pillar-gov"       label="Policies current" value="75%"  tone="warn" sub="6 of 8" />
        <KpiCard icon={ClipboardList} iconBg="bg-pillar-gov/10 text-pillar-gov"       label="Attestations"     value="81%"  tone="warn" sub="avg completion" />
        <KpiCard icon={Building2}     iconBg="bg-pillar-gov/10 text-pillar-gov"       label="Supplier code"    value="74%"  tone="warn" sub="89 of 120" />
      </div>

      {/* People */}
      <Section title="People" defaultOpen compact="Training · Turnover · LTIFR">
        <PeopleSection />
      </Section>

      {/* Governance */}
      <Section title="Governance" defaultOpen compact="Policies · Attestations · Supplier funnel">
        <GovernanceSection />
      </Section>

      {/* Evidence & gaps — compact summary always visible, collapsed by default */}
      <Section title="Evidence & gaps" defaultOpen={false} compact={gapSummary}>
        <EvidenceSection />
      </Section>

    </div>
  );
}
