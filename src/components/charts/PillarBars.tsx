type Item = { pillar: string; score: number; color: string };

export default function PillarBars({ data }: { data: Item[] }) {
  const max = 100;
  return (
    <div className="grid grid-cols-6 gap-3 items-end h-44">
      {data.map((d) => {
        const h = (d.score / max) * 100;
        return (
          <div key={d.pillar} className="flex flex-col items-center gap-2">
            <div className="text-[12px] font-semibold text-ink-700">
              {d.score}
            </div>
            <div className="relative w-full h-32 bg-ink-100 rounded-md overflow-hidden">
              <div
                className="absolute bottom-0 inset-x-0 rounded-md"
                style={{ height: `${h}%`, background: d.color }}
              />
            </div>
            <div className="text-[11px] text-ink-500 font-medium">
              {d.pillar}
            </div>
          </div>
        );
      })}
    </div>
  );
}
