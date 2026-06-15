import { Info } from "lucide-react";
import { BENCHMARK_SOURCE, benchmarkStd } from "@/lib/benchmarks";

/** Cited provenance footnote for any external-benchmark surface. */
export default function BenchmarkSource({
  metric,
}: {
  metric?: "energy" | "water" | "waste" | "carbon";
}) {
  const s = BENCHMARK_SOURCE;
  return (
    <div className="rounded-xl bg-ink-50 border border-ink-200 p-3 flex items-start gap-2 text-[11px] text-ink-500">
      <Info size={13} className="mt-0.5 shrink-0 text-ink-400" />
      <div>
        Source: <strong className="text-ink-600">{s.primaryFull} {s.year}</strong> · {s.cohort} · n={s.n}
        {benchmarkStd(metric)}. {s.disclaimer}
      </div>
    </div>
  );
}
