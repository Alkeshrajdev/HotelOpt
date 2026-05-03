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
import { tokens } from "@/lib/tokens";

type Datum = { month: string; energy: number; cost: number; intensity: number };

export default function IntensityChart({ data }: { data: Datum[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={tokens.ink[200]} vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: tokens.ink[500], fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: tokens.ink[200] }}
          />
          <YAxis
            tick={{ fill: tokens.ink[500], fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: `1px solid ${tokens.ink[200]}`,
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
              fontSize: 12,
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
          />
          <Line
            name="Energy (kWh/OR)"
            type="monotone"
            dataKey="energy"
            stroke={tokens.brand[700]}
            strokeWidth={2}
            dot={{ r: 3, fill: tokens.brand[700] }}
            activeDot={{ r: 5 }}
          />
          <Line
            name="Energy Cost (USD/OR)"
            type="monotone"
            dataKey="cost"
            stroke={tokens.chart.cost}
            strokeWidth={2}
            dot={{ r: 3, fill: tokens.chart.cost }}
          />
          <Line
            name="Energy Intensity (kWh/OR)"
            type="monotone"
            dataKey="intensity"
            stroke={tokens.pillar.energy}
            strokeDasharray="4 4"
            strokeWidth={2}
            dot={{ r: 3, fill: tokens.pillar.energy }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
