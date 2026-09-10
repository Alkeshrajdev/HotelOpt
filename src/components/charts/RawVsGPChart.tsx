import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { CHART } from "@/lib/chartPalette";

type Datum = { period: string; raw: number; gp: number };

export default function RawVsGPChart({ data }: { data: Datum[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fill: CHART.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: CHART.grid }}
          />
          <YAxis
            tick={{ fill: CHART.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            formatter={(v: number) => `${v.toFixed(1)}%`}
            contentStyle={{
              borderRadius: 12,
              border: `1px solid ${CHART.grid}`,
              fontSize: 12,
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="square"
            wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
            formatter={(v) => <span style={{ color: CHART.axis }}>{v}</span>}
          />
          <ReferenceLine y={0} stroke={CHART.reference} strokeDasharray="3 3" />
          <Bar
            name="Raw Improvement"
            dataKey="raw"
            fill={CHART.blush}
            radius={[4, 4, 0, 0]}
            maxBarSize={20}
          />
          <Bar
            name="Genuine Performance"
            dataKey="gp"
            fill={CHART.olive}
            radius={[4, 4, 0, 0]}
            maxBarSize={20}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
