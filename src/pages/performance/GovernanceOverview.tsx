import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { ShieldCheck, FileCheck, Users, AlertCircle } from "lucide-react";
import KpiTile from "@/components/ui/KpiTile";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

/* ─── Data ───────────────────────────────────────────────────────────────── */
const ATTESTATION_TREND = [
  {q:"Q2 '24",pct:88},{q:"Q3 '24",pct:91},{q:"Q4 '24",pct:92},
  {q:"Q1 '25",pct:90},{q:"Q2 '25",pct:92},{q:"Q3 '25",pct:100},
];

const TRAINING_TREND = [
  {q:"Q2 '24",pct:84},{q:"Q3 '24",pct:88},{q:"Q4 '24",pct:91},
  {q:"Q1 '25",pct:93},{q:"Q2 '25",pct:95},{q:"Q3 '25",pct:96},
];

const SUPPLIER_TREND = [
  {q:"Q2 '24",pct:62},{q:"Q3 '24",pct:66},{q:"Q4 '24",pct:68},
  {q:"Q1 '25",pct:70},{q:"Q2 '25",pct:72},{q:"Q3 '25",pct:74},
];

const OUTSTANDING = [
  { item:"Annual sustainability attestation",   due:"22 Jun 2026", owner:"J. Wilson",      status:"overdue" },
  { item:"GDPR compliance review",             due:"30 Jun 2026", owner:"Legal team",      status:"due-soon" },
  { item:"Supplier code re-attestation × 12", due:"15 Jul 2026", owner:"Procurement",     status:"due-soon" },
  { item:"H&S management review — Zermatt",   due:"01 Aug 2026", owner:"F. Setiawan",     status:"pending" },
];

function BarTip({ active, payload, label }: { active?:boolean; payload?:{value:number}[]; label?:string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-ink-200 rounded-xl shadow-pop px-3 py-2 text-[12px]">
      <span className="font-semibold text-ink-800">{label} </span>
      <span className="font-bold text-ink-900">{payload[0].value}%</span>
    </div>
  );
}

function MiniTrend({ data, color, title }: { data: {q:string;pct:number}[]; color:string; title:string }) {
  const latest = data[data.length-1].pct;
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[12px] font-semibold text-ink-700">{title}</div>
          <div className="text-[1.5rem] font-extrabold tabular-nums text-ink-900 leading-tight mt-0.5">
            {latest}%
          </div>
        </div>
        <span className={cn("chip text-[11px] font-semibold mt-0.5",
          latest >= 95 ? "bg-good/10 text-good" : latest >= 85 ? "bg-warn/10 text-warn" : "bg-bad/10 text-bad"
        )}>
          {latest >= 95 ? "On track" : latest >= 85 ? "Needs attention" : "At risk"}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={80}>
        <BarChart data={data} barCategoryGap="30%">
          <XAxis dataKey="q" tick={{ fontSize:9, fill:"#9ca3af" }} axisLine={false} tickLine={false} />
          <YAxis domain={[60,100]} hide />
          <Tooltip content={<BarTip />} cursor={{ fill:"rgba(0,0,0,0.04)" }} />
          <Bar dataKey="pct" fill={color} radius={[2,2,0,0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function GovernanceOverview() {
  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiTile icon={<FileCheck size={18}/>}    iconBg="bg-pillar-gov/10 text-pillar-gov" label="Attestations" value="11/12" caption="1 outstanding" />
        <KpiTile icon={<ShieldCheck size={18}/>}   iconBg="bg-pillar-gov/10 text-pillar-gov" label="Anti-corruption training" value="96" unit="%" delta={4.0} goodDirection="up" />
        <KpiTile icon={<Users size={18}/>}          iconBg="bg-brand-50 text-brand-700"       label="Supplier code adoption" value="74" unit="%" delta={6.0} goodDirection="up" />
        <KpiTile icon={<AlertCircle size={18}/>}   iconBg="bg-good/10 text-good"              label="Whistleblowing cases" value="3" caption="all resolved" />
      </div>

      {/* Trend charts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MiniTrend data={ATTESTATION_TREND} color="#ea580c" title="Annual attestations" />
        <MiniTrend data={TRAINING_TREND}    color="#0F6A3C" title="Anti-corruption training" />
        <MiniTrend data={SUPPLIER_TREND}    color="#7c3aed" title="Supplier code adoption" />
      </div>

      {/* Outstanding items */}
      <Card>
        <CardHeader title="Outstanding items" />
        <div className="overflow-x-auto">
          <table className="min-w-full text-[13px]">
            <thead>
              <tr className="bg-ink-50 text-left">
                <th className="table-th">Item</th>
                <th className="table-th">Owner</th>
                <th className="table-th">Due</th>
                <th className="table-th text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {OUTSTANDING.map(item => (
                <tr key={item.item} className="hover:bg-ink-50/60">
                  <td className="table-td font-medium text-ink-900">{item.item}</td>
                  <td className="table-td text-ink-600 whitespace-nowrap">{item.owner}</td>
                  <td className="table-td text-ink-600 whitespace-nowrap">{item.due}</td>
                  <td className="table-td text-right">
                    <span className={cn("chip text-[11px] font-semibold",
                      item.status === "overdue"
                        ? "bg-bad/10 text-bad border border-bad/20"
                        : item.status === "due-soon"
                        ? "bg-warn/10 text-warn border border-warn/25"
                        : "bg-ink-100 text-ink-500"
                    )}>
                      {item.status === "overdue" ? "Overdue" : item.status === "due-soon" ? "Due soon" : "Pending"}
                    </span>
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
