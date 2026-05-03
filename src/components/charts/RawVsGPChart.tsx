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
import { tokens } from "@/lib/tokens";

type Datum = { period: string; raw: number; gp: number };

export default function RawVsGPChart({ data }: { data: Datum[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={tokens.ink[200]} vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fill: tokens.ink[500], fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: tokens.ink[200] }}
          />
          <YAxis
            tick={{ fill: tokens.ink[500], fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            formatter={(v: number) => `${v.toFixed(1)}%`}
            contentStyle={{
              borderRadius: 12,
              border: `1px solid ${tokens.ink[200]}`,
              fontSize: 12,
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="square"
            wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
          />
          <ReferenceLine y={0} stroke={tokens.ink[400]} strokeDasharray="3 3" />
          <Bar
            name="Raw Improvement"
            dataKey="raw"
            fill={tokens.chart.softGreen}
            radius={[4, 4, 0, 0]}
            maxBarSize={20}
          />
          <Bar
            name="Genuine Performance"
            dataKey="gp"
            fill={tokens.brand[700]}
            radius={[4, 4, 0, 0]}
            maxBarSize={20}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
