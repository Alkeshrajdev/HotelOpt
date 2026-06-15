// ─────────────────────────────────────────────────────────────────────────────
// External benchmark provenance — one cited source of truth, so no benchmark
// bar or band is ever shown without a standard, year and cohort behind it.
//
// Real hotel benchmarking standards:
//   • CHSB  — Cornell Hotel Sustainability Benchmarking (energy/water/carbon by
//             segment + climate zone; the industry reference cohort)
//   • HCMI  — Hotel Carbon Measurement Initiative (carbon per occupied room)
//   • HWMI  — Hotel Water Measurement Initiative (water per occupied room)
//
// Figures here are illustrative/sample cohort values — defensibility comes from
// the cited standard + cohort definition + honest disclosure, not from claiming
// these are live numbers.
// ─────────────────────────────────────────────────────────────────────────────

export const BENCHMARK_SOURCE = {
  primary: "Cornell CHSB",
  primaryFull: "Cornell Hotel Sustainability Benchmarking (CHSB)",
  year: 2023,
  cohort: "full-service · hot & temperate climate zones",
  n: 312,
  carbonStd: "HCMI v1.2",
  waterStd: "HWMI 2.0",
  disclaimer:
    "Illustrative cohort — segment- and climate-matched. Sample values pending live pool sync.",
} as const;

/** The two cited reference points we show instead of anonymous "Peer A/B/C". */
export const COHORT_MEDIAN_LABEL = "Cohort median";
export const COHORT_BEST_LABEL = "Top quartile";

/** Per-metric source suffix (carbon → HCMI, water → HWMI, else CHSB only). */
export function benchmarkStd(metric?: "energy" | "water" | "waste" | "carbon"): string {
  if (metric === "carbon") return ` · carbon per ${BENCHMARK_SOURCE.carbonStd}`;
  if (metric === "water") return ` · water per ${BENCHMARK_SOURCE.waterStd}`;
  return "";
}
