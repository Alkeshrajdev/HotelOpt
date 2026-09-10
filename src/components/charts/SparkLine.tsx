import { LineChart, Line, ResponsiveContainer } from "recharts";
import { CHART_PILLAR } from "@/lib/chartPalette";

type Props = {
  data: { x: string | number; y: number }[];
  color?: string;
  width?: number | string;
  height?: number;
};

export default function SparkLine({
  data,
  color = CHART_PILLAR.energy,
  width = 110,
  height = 28,
}: Props) {
  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="y"
            stroke={color}
            strokeWidth={1.75}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
