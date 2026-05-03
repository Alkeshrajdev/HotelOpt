import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { tokens } from "@/lib/tokens";

export default function AreaTrend({
  data,
  dataKey,
  xKey = "x",
  color = tokens.brand[700],
  height = 240,
  format = (v: number) => v.toString(),
}: {
  data: Record<string, any>[];
  dataKey: string;
  xKey?: string;
  color?: string;
  height?: number;
  format?: (v: number) => string;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={tokens.ink[200]} vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fill: tokens.ink[500], fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: tokens.ink[200] }}
          />
          <YAxis
            tick={{ fill: tokens.ink[500], fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={format}
          />
          <Tooltip
            formatter={(v: number) => format(v)}
            contentStyle={{
              borderRadius: 12,
              border: `1px solid ${tokens.ink[200]}`,
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${dataKey})`}
            dot={{ r: 3, fill: color }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
