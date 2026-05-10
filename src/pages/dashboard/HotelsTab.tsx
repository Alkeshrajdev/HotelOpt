import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { HOTEL_HEATMAP, DATA_ASSURANCE_BY_HOTEL } from "@/lib/mock";
import { cn } from "@/lib/utils";

type Status = "ok" | "warn" | "bad";
type Region = "All" | "EMEA" | "APAC" | "Africa";
type StatusFilter = "All" | "On Track" | "Review" | "Critical";

const STATUS_LABEL: Record<Status, string> = {
  ok:   "OK",
  warn: "Review",
  bad:  "Critical",
};

const STATUS_CLASS: Record<Status, string> = {
  ok:   "bg-good/15 text-good",
  warn: "bg-warn/15 text-warn",
  bad:  "bg-bad/15 text-bad",
};

const AREA_HREF: Record<string, string> = {
  data:    "/review-approval",
  carbon:  "/performance/carbon/overview",
  energy:  "/performance/energy/overview",
  water:   "/performance/water/overview",
  waste:   "/performance/waste/overview",
  cert:    "/portfolio/reports-certifications",
  actions: "/actions",
  overall: "/properties",
};

const CARBON_TOP = [
  { name: "Airport Hotel Dubai",          value: "6,800 tCO₂e" },
  { name: "Marina Residences Barcelona",  value: "5,200 tCO₂e" },
  { name: "Grand Harbour Lisbon",          value: "4,100 tCO₂e" },
];

const ENERGY_TOP = [
  { name: "Airport Hotel Dubai",          value: "28.4 kWh/RN" },
  { name: "Riverside Bangkok",             value: "26.1 kWh/RN" },
  { name: "Marina Residences Barcelona",  value: "24.8 kWh/RN" },
];

const WASTE_BOTTOM = [
  { name: "Peaks Resort Zermatt",         value: "18% diversion" },
  { name: "Airport Hotel Dubai",          value: "24% diversion" },
  { name: "Marina Residences Barcelona",  value: "28% diversion" },
];

const dataRisk = DATA_ASSURANCE_BY_HOTEL.filter((h) => h.approved < 80);

export default function HotelsTab() {
  const [region, setRegion] = useState<Region>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  const filtered = HOTEL_HEATMAP.filter((h) => {
    const regionOk = region === "All" || h.region === region;
    const statusOk =
      statusFilter === "All" ||
      (statusFilter === "On Track" && h.overall === "ok") ||
      (statusFilter === "Review" && h.overall === "warn") ||
      (statusFilter === "Critical" && h.overall === "bad");
    return regionOk && statusOk;
  });

  const REGIONS: Region[] = ["All", "EMEA", "APAC", "Africa"];
  const STATUS_FILTERS: StatusFilter[] = ["All", "On Track", "Review", "Critical"];

  function StatusCell({ status, href }: { status: string; href: string }) {
    const s = status as Status;
    return (
      <td className="table-td">
        <Link
          to={href}
          className={cn(
            "chip text-[10px] font-semibold inline-flex items-center gap-1",
            STATUS_CLASS[s]
          )}
        >
          {s === "ok" ? (
            <CheckCircle2 size={10} />
          ) : s === "warn" ? (
            <AlertCircle size={10} />
          ) : (
            <AlertTriangle size={10} />
          )}
          {STATUS_LABEL[s]}
        </Link>
      </td>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1">
          {REGIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className={cn(
                "px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors",
                region === r
                  ? "bg-brand-700 text-white"
                  : "bg-ink-100 text-ink-600 hover:bg-ink-200"
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-ink-200 mx-1" />
        <div className="flex gap-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors",
                statusFilter === s
                  ? "bg-brand-700 text-white"
                  : "bg-ink-100 text-ink-600 hover:bg-ink-200"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white">
        <table className="min-w-full">
          <thead>
            <tr className="bg-ink-50">
              <th className="table-th">Hotel</th>
              <th className="table-th">Region</th>
              <th className="table-th">Data</th>
              <th className="table-th">Carbon</th>
              <th className="table-th">Energy</th>
              <th className="table-th">Water</th>
              <th className="table-th">Waste</th>
              <th className="table-th">Cert</th>
              <th className="table-th">Actions</th>
              <th className="table-th">Overall</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((h) => (
              <tr key={h.id} className="hover:bg-ink-50/60">
                <td className="table-td font-semibold text-ink-900 whitespace-nowrap">
                  <Link to="/properties" className="hover:text-brand-700 transition-colors">
                    {h.name}
                  </Link>
                </td>
                <td className="table-td text-ink-500">{h.region}</td>
                <StatusCell status={h.data} href={AREA_HREF.data} />
                <StatusCell status={h.carbon} href={AREA_HREF.carbon} />
                <StatusCell status={h.energy} href={AREA_HREF.energy} />
                <StatusCell status={h.water} href={AREA_HREF.water} />
                <StatusCell status={h.waste} href={AREA_HREF.waste} />
                <StatusCell status={h.cert} href={AREA_HREF.cert} />
                <StatusCell status={h.actions} href={AREA_HREF.actions} />
                <StatusCell status={h.overall} href={AREA_HREF.overall} />
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="table-td text-center text-ink-400 py-8">
                  No hotels match the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-500">
            Portfolio Hotspots
          </span>
          <div className="h-px flex-1 bg-ink-100" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card>
            <CardHeader title="Top Carbon Contributors" hint="tCO₂e total emissions" />
            <ul className="px-3 pb-4 mt-2 space-y-1">
              {CARBON_TOP.map((h) => (
                <li key={h.name}>
                  <Link
                    to="/performance/carbon/overview"
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-ink-50 transition-colors group"
                  >
                    <span className="text-[13px] text-ink-700 group-hover:text-ink-900">{h.name}</span>
                    <Badge tone="bad">{h.value}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Highest Energy Intensity" hint="kWh per room night" />
            <ul className="px-3 pb-4 mt-2 space-y-1">
              {ENERGY_TOP.map((h) => (
                <li key={h.name}>
                  <Link
                    to="/performance/energy/overview"
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-ink-50 transition-colors group"
                  >
                    <span className="text-[13px] text-ink-700 group-hover:text-ink-900">{h.name}</span>
                    <Badge tone="warn">{h.value}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader
              title="Hotels with Data Risk"
              hint="approved data below 80%"
              right={<Badge tone="bad">{dataRisk.length} hotels</Badge>}
            />
            <ul className="px-3 pb-4 mt-2 space-y-1">
              {dataRisk.map((h) => (
                <li key={h.hotel}>
                  <Link
                    to="/review-approval"
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-ink-50 transition-colors group"
                  >
                    <span className="text-[13px] text-ink-700 group-hover:text-ink-900">{h.hotel}</span>
                    <Badge tone={h.approved < 70 ? "bad" : "warn"}>{h.approved}% approved</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Lowest Waste Diversion" hint="% diverted from landfill" />
            <ul className="px-3 pb-4 mt-2 space-y-1">
              {WASTE_BOTTOM.map((h) => (
                <li key={h.name}>
                  <Link
                    to="/performance/waste/overview"
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-ink-50 transition-colors group"
                  >
                    <span className="text-[13px] text-ink-700 group-hover:text-ink-900">{h.name}</span>
                    <Badge tone="bad">{h.value}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
