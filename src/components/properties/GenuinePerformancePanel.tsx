import { useState } from "react";
import { FlaskConical, Info } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import RawVsGPChart from "@/components/charts/RawVsGPChart";
import {
  gpAll, gpResult, gpMonthly, GP_UTILITY_META, type GpUtility,
} from "@/lib/genuinePerformance";

const UTILITIES: GpUtility[] = ["energy", "water", "waste", "carbon"];

const fmt = (v: number, u: GpUtility) =>
  u === "waste"
    ? v.toLocaleString("en-US", { maximumFractionDigits: 1 })
    : Math.round(v).toLocaleString("en-US");

const pct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;

/**
 * Concrete Measured → Expected → Genuine view — the property's own-history
 * efficiency lens, replacing the opaque base-100 index. Genuine strips out
 * weather, occupancy and activity so what remains is real management impact.
 */
export default function GenuinePerformancePanel({ propertyName }: { propertyName: string }) {
  const [utility, setUtility] = useState<GpUtility>("energy");
  const rows = gpAll(propertyName);
  const r = gpResult(propertyName, utility);
  if (!rows.length || !r) return null;

  const meta = GP_UTILITY_META[utility];
  const monthly = gpMonthly(propertyName, utility);
  const drivers = r.decomposition.filter((d) => d.key !== "genuine");
  const genuine = r.decomposition.find((d) => d.key === "genuine")!;
  const better = r.genuinePct < r.rawPct; // genuine improvement exceeds the raw

  return (
    <div className="space-y-4">
      {/* Headline insight */}
      <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 flex items-start gap-2.5">
        <FlaskConical size={16} className="text-brand-700 mt-0.5 shrink-0" />
        <div className="text-[13px] text-brand-900">
          <strong>{meta.label}:</strong> raw change was{" "}
          <strong>{pct(r.rawPct)}</strong>, but after adjusting for weather, occupancy and
          activity, <strong>genuine efficiency moved {pct(r.genuinePct)}</strong>
          {better
            ? " — a real improvement the raw number understates."
            : " — the raw number flattered performance; drivers did the work."}
        </div>
      </div>

      {/* Measured / Expected / Genuine table — all utilities */}
      <Card>
        <CardHeader
          title="Measured → Expected → Genuine"
          hint="Expected = baseline scaled for how the drivers moved · Genuine = Measured vs Expected"
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-ink-50 text-left">
                <th className="table-th">Utility</th>
                <th className="table-th text-right">Measured</th>
                <th className="table-th text-right">Expected</th>
                <th className="table-th text-right">Raw vs PY</th>
                <th className="table-th text-right">Genuine</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const m = GP_UTILITY_META[row.utility];
                const sel = row.utility === utility;
                return (
                  <tr
                    key={row.utility}
                    onClick={() => setUtility(row.utility)}
                    className={`cursor-pointer border-t border-ink-100 ${sel ? "bg-brand-50/50" : "hover:bg-ink-50"}`}
                  >
                    <td className="table-td font-medium">{m.label}</td>
                    <td className="table-td text-right tabular-nums">{fmt(row.measured, row.utility)} <span className="text-ink-400">{m.unit}</span></td>
                    <td className="table-td text-right tabular-nums text-ink-500">{fmt(row.expected, row.utility)} <span className="text-ink-400">{m.unit}</span></td>
                    <td className="table-td text-right tabular-nums">{pct(row.rawPct)}</td>
                    <td className="table-td text-right tabular-nums font-semibold">
                      <span className={row.genuinePct <= 0 ? "text-good" : "text-bad"}>{pct(row.genuinePct)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-2.5 text-[11px] text-ink-400 border-t border-ink-100">
          Genuine &lt; 0 = used less than the drivers predicted (real efficiency gain). Click a row to inspect.
        </div>
      </Card>

      {/* Selected utility — Raw vs GP chart + driver decomposition */}
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-7">
          <CardHeader title={`${meta.label} — Raw vs Genuine`} hint="% better than prior year, by month" />
          <div className="px-6 pb-6">
            <RawVsGPChart data={monthly} />
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-5">
          <CardHeader title="What drove the change" hint={`Raw ${pct(r.rawPct)} = drivers + genuine`} />
          <ul className="p-5 space-y-2.5">
            {drivers.map((d) => (
              <li key={d.key} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-ink-700">
                  <FlaskConical size={14} className="text-ink-400" /> {d.label}
                </span>
                <Badge tone={d.tone}>{pct(d.pct)}</Badge>
              </li>
            ))}
            <li className="flex items-center justify-between text-sm border-t border-ink-100 pt-2.5 font-semibold">
              <span className="text-ink-800">{genuine.label}</span>
              <Badge tone={genuine.tone}>{pct(genuine.pct)}</Badge>
            </li>
          </ul>
          <div className="px-5 pb-4 -mt-1 flex items-start gap-1.5 text-[11px] text-ink-400">
            <Info size={12} className="mt-0.5 shrink-0" />
            Drivers + genuine reconcile to the raw change. Genuine is the own-history lens only — never used for external comparison.
          </div>
        </Card>
      </div>
    </div>
  );
}
