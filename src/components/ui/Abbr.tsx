import { cn } from "@/lib/utils";

/** Plain-English expansions for the acronyms used across the platform. */
export const GLOSSARY: Record<string, string> = {
  ORN: "Occupied Room Night — one room sold for one night; the standard denominator for intensity metrics.",
  GP: "Genuine Performance — weather- and occupancy-normalised performance, so improvements reflect real efficiency gains rather than demand swings.",
  EF: "Emission Factor — the coefficient that converts an activity (kWh, litres, km) into greenhouse-gas emissions.",
  LTIFR: "Lost Time Injury Frequency Rate — lost-time injuries per million hours worked.",
  COP: "Coefficient of Performance — heating/cooling output divided by energy input; higher is more efficient.",
  GN: "Guest Night — one guest staying one night.",
  ORN_SHORT: "Occupied Room Night",
};

/**
 * Renders an acronym with a dotted underline and a hover/focus tooltip
 * explaining it. Falls back to plain text if the term isn't in the glossary.
 */
export default function Abbr({ term, children, className }: { term: keyof typeof GLOSSARY | string; children?: React.ReactNode; className?: string }) {
  const title = GLOSSARY[term];
  if (!title) return <>{children ?? term}</>;
  return (
    <abbr
      title={title}
      className={cn("no-underline border-b border-dotted border-current/40 cursor-help", className)}
    >
      {children ?? term}
    </abbr>
  );
}
