import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { CHART } from "@/lib/chartPalette";

type Datum = { month: string; energy: number; cost: number; intensity: number };

export default function IntensityChart({ data }: { data: Datum[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: CHART.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: CHART.grid }}
          />
          <YAxis
            tick={{ fill: CHART.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: `1px solid ${CHART.grid}`,
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
              fontSize: 12,
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
            formatter={(v) => <span style={{ color: CHART.axis }}>{v}</span>}
          />
          <Line
            name="Energy (kWh/OR)"
            type="monotone"
            dataKey="energy"
            stroke={CHART.olive}
            strokeWidth={2}
            dot={{ r: 3, fill: CHART.olive }}
            activeDot={{ r: 5 }}
          />
          <Line
            name="Energy Cost (USD/OR)"
            type="monotone"
            dataKey="cost"
            stroke={CHART.mauve}
            strokeWidth={2}
            dot={{ r: 3, fill: CHART.mauve }}
          />
          <Line
            name="Energy Intensity (kWh/OR)"
            type="monotone"
            dataKey="intensity"
            stroke={CHART.moss}
            strokeDasharray="4 4"
            strokeWidth={2}
            dot={{ r: 3, fill: CHART.moss }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
