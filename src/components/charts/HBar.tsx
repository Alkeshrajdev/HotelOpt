import { cn } from "@/lib/utils";

type Item = { name: string; value: number };

export default function HBar({
  data,
  unit = "%",
  rowClass,
}: {
  data: Item[];
  unit?: string;
  rowClass?: string;
}) {
  const max = 100;
  return (
    <div className="space-y-3">
      {data.map((d) => {
        const w = Math.min(100, (d.value / max) * 100);
        return (
          <div key={d.name} className={cn("flex items-center gap-3", rowClass)}>
            <div className="w-44 shrink-0 text-sm text-ink-700 truncate">
              {d.name}
            </div>
            <div className="flex-1 h-2 bg-ink-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full"
                style={{ width: `${w}%` }}
              />
            </div>
            <div className="w-12 text-right text-sm font-semibold text-ink-700">
              {d.value}
              {unit}
            </div>
          </div>
        );
      })}
    </div>
  );
}
