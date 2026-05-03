import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

type Slice = { name: string; value: number; color: string };

export default function Donut({
  data,
  totalLabel,
  totalValue,
  height = 220,
}: {
  data: Slice[];
  totalLabel?: string;
  totalValue?: string;
  height?: number;
}) {
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer>
        <PieChart>
          <Tooltip
            formatter={(v: number) => v.toLocaleString()}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #E2E8F0",
              fontSize: 12,
            }}
          />
          <Pie
            data={data}
            innerRadius="62%"
            outerRadius="92%"
            paddingAngle={1}
            dataKey="value"
            stroke="#fff"
            strokeWidth={2}
          >
            {data.map((s) => (
              <Cell key={s.name} fill={s.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {(totalLabel || totalValue) && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="text-center">
            {totalValue && (
              <div className="text-[20px] font-bold text-ink-900 tabular-nums">
                {totalValue}
              </div>
            )}
            {totalLabel && (
              <div className="text-[11px] text-ink-500">{totalLabel}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
