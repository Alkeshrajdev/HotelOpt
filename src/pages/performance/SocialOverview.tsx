import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
  BarChart, Bar,
} from "recharts";
import { Users, Shield, BookOpen, AlertTriangle } from "lucide-react";
import KpiTile from "@/components/ui/KpiTile";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

/* ─── Data ───────────────────────────────────────────────────────────────── */
const HEADCOUNT = [
  {m:"May",ty:3080,py:2950},{m:"Jun",ty:3110,py:2970},{m:"Jul",ty:3180,py:3010},
  {m:"Aug",ty:3200,py:3040},{m:"Sep",ty:3220,py:3060},{m:"Oct",ty:3230,py:3080},
  {m:"Nov",ty:3240,py:3100},{m:"Dec",ty:3240,py:3110},{m:"Jan",ty:3220,py:3090},
  {m:"Feb",ty:3200,py:3070},{m:"Mar",ty:3230,py:3080},{m:"Apr",ty:3240,py:3110},
];

const DIVERSITY = [
  {q:"Q2 '24",leadership:38,broader:52},{q:"Q3 '24",leadership:39,broader:53},
  {q:"Q4 '24",leadership:40,broader:54},{q:"Q1 '25",leadership:41,broader:55},
  {q:"Q2 '25",leadership:42,broader:56},{q:"Q3 '25",leadership:42,broader:57},
];

const TRAINING = [
  {q:"Q2 '24",hrs:14.2},{q:"Q3 '24",hrs:15.8},{q:"Q4 '24",hrs:16.4},
  {q:"Q1 '25",hrs:17.1},{q:"Q2 '25",hrs:18.0},{q:"Q3 '25",hrs:18.0},
];

const SAFETY = [
  {q:"Q2 '24",ltifr:0.58,severity:2.1},{q:"Q3 '24",ltifr:0.52,severity:1.9},
  {q:"Q4 '24",ltifr:0.49,severity:1.7},{q:"Q1 '25",ltifr:0.46,severity:1.6},
  {q:"Q2 '25",ltifr:0.42,severity:1.4},{q:"Q3 '25",ltifr:0.42,severity:1.4},
];

// By property for table
const BY_PROP = [
  { name:"The Pavilion London",         fte:312,  female:48, training:21, ltifr:0.22 },
  { name:"Grand Harbour Lisbon",        fte:248,  female:45, training:19, ltifr:0.28 },
  { name:"The Montrose Paris",          fte:180,  female:52, training:22, ltifr:0.18 },
  { name:"Skyline Dubai",               fte:680,  female:38, training:18, ltifr:0.44 },
  { name:"Bay View Singapore",          fte:524,  female:44, training:17, ltifr:0.38 },
  { name:"Oceanfront Cape Town",        fte:210,  female:41, training:16, ltifr:0.55 },
  { name:"Marina Residences Barcelona", fte:290,  female:46, training:20, ltifr:0.32 },
  { name:"Peaks Resort Zermatt",        fte:140,  female:35, training:14, ltifr:0.62 },
  { name:"Riverside Bangkok",           fte:310,  female:49, training:15, ltifr:0.48 },
  { name:"Airport Hotel Dubai",         fte:546,  female:32, training:12, ltifr:0.72 },
];

function SimpleTip({ active, payload, label }: { active?:boolean; payload?:{dataKey:string;value:number}[]; label?:string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-ink-200 rounded-xl shadow-pop px-3 py-2 text-[12px]">
      <div className="font-semibold text-ink-800 mb-1">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex justify-between gap-3">
          <span className="text-ink-500 capitalize">{p.dataKey}</span>
          <span className="font-bold text-ink-900">{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function SocialOverview() {
  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiTile icon={<Users size={18}/>}        iconBg="bg-pillar-social/10 text-pillar-social" label="Total headcount" value="3,240" unit="FTE"  delta={4.1} goodDirection="up" />
        <KpiTile icon={<Shield size={18}/>}        iconBg="bg-pillar-social/10 text-pillar-social" label="Female leadership" value="42" unit="%" delta={3.5} goodDirection="up" />
        <KpiTile icon={<BookOpen size={18}/>}      iconBg="bg-brand-50 text-brand-700"             label="Training hrs/FTE" value="18" unit="hrs" delta={11.1} goodDirection="up" />
        <KpiTile icon={<AlertTriangle size={18}/>} iconBg="bg-warn/10 text-warn"                   label="LTIFR" value="0.42" delta={-12.0} goodDirection="down" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Headcount over time" />
          <div className="px-6 pb-6 pt-4">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={HEADCOUNT}>
                <CartesianGrid vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="m" tick={{ fontSize:11, fill:"#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis domain={[2800,3400]} tick={{ fontSize:11, fill:"#6b7280" }} axisLine={false} tickLine={false} width={36} />
                <Tooltip content={<SimpleTip />} cursor={{ stroke:"#e5e7eb" }} />
                <Legend wrapperStyle={{ fontSize:11, paddingTop:8 }} formatter={v=><span style={{color:"#6b7280"}}>{v==="ty"?"This year":"Prior year"}</span>} />
                <Line dataKey="py" name="py" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
                <Line dataKey="ty" name="ty" stroke="#7c3aed" strokeWidth={2.5} dot={{ fill:"#7c3aed",r:3 }} activeDot={{ r:5 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Female representation (%)" />
          <div className="px-6 pb-6 pt-4">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={DIVERSITY}>
                <CartesianGrid vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="q" tick={{ fontSize:11, fill:"#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis domain={[30,65]} tick={{ fontSize:11, fill:"#6b7280" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<SimpleTip />} cursor={{ stroke:"#e5e7eb" }} />
                <Legend wrapperStyle={{ fontSize:11, paddingTop:8 }} formatter={v=><span style={{color:"#6b7280"}}>{v==="leadership"?"Leadership":"All staff"}</span>} />
                <Line dataKey="broader" name="broader" stroke="#a5b4fc" strokeWidth={2} strokeDasharray="4 2" dot={false} isAnimationActive={false} />
                <Line dataKey="leadership" name="leadership" stroke="#7c3aed" strokeWidth={2.5} dot={{ fill:"#7c3aed",r:3 }} activeDot={{ r:5 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Training hours per FTE" />
          <div className="px-6 pb-6 pt-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={TRAINING} barCategoryGap="35%">
                <CartesianGrid vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="q" tick={{ fontSize:11, fill:"#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0,25]} tick={{ fontSize:11, fill:"#6b7280" }} axisLine={false} tickLine={false} width={24} />
                <Tooltip content={<SimpleTip />} cursor={{ fill:"rgba(0,0,0,0.03)" }} />
                <Bar dataKey="hrs" name="hrs/FTE" fill="#7c3aed" radius={[3,3,0,0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="LTIFR trend (lost time injury frequency rate)" />
          <div className="px-6 pb-6 pt-4">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={SAFETY}>
                <CartesianGrid vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="q" tick={{ fontSize:11, fill:"#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 0.8]} tick={{ fontSize:11, fill:"#6b7280" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<SimpleTip />} cursor={{ stroke:"#e5e7eb" }} />
                <Line dataKey="ltifr" name="LTIFR" stroke="#ef4444" strokeWidth={2.5} dot={{ fill:"#ef4444",r:3 }} activeDot={{ r:5 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* By property table */}
      <Card>
        <CardHeader title="Social metrics by property" />
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Property</th>
                <th className="table-th text-right">FTEs</th>
                <th className="table-th text-right">Female (%)</th>
                <th className="table-th text-right">Training (hrs/FTE)</th>
                <th className="table-th text-right">LTIFR</th>
              </tr>
            </thead>
            <tbody>
              {BY_PROP.map((p,i) => (
                <tr key={p.name} className={cn("hover:bg-ink-50/50", i%2===1 && "bg-ink-50/30")}>
                  <td className="table-td font-medium text-ink-900">{p.name}</td>
                  <td className="table-td text-right tabular-nums text-ink-700">{p.fte.toLocaleString()}</td>
                  <td className="table-td text-right tabular-nums">
                    <span className={cn("font-semibold", p.female >= 45 ? "text-good" : p.female >= 38 ? "text-ink-700" : "text-bad")}>{p.female}%</span>
                  </td>
                  <td className="table-td text-right tabular-nums">
                    <span className={cn("font-semibold", p.training >= 18 ? "text-good" : p.training >= 14 ? "text-warn" : "text-bad")}>{p.training} hrs</span>
                  </td>
                  <td className="table-td text-right tabular-nums">
                    <span className={cn("font-semibold", p.ltifr <= 0.35 ? "text-good" : p.ltifr <= 0.55 ? "text-warn" : "text-bad")}>{p.ltifr.toFixed(2)}</span>
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
