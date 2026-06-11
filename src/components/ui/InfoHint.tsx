import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Small inline ⓘ affordance that explains a metric or term on hover/focus.
 * Uses the native title tooltip so it works everywhere without extra state.
 */
export default function InfoHint({ text, className }: { text: string; className?: string }) {
  return (
    <span
      tabIndex={0}
      title={text}
      aria-label={text}
      className={cn(
        "inline-grid place-items-center align-middle text-ink-400 hover:text-ink-600 focus:text-ink-600 cursor-help outline-none",
        className
      )}
    >
      <Info size={13} />
    </span>
  );
}

/** Canonical explanation of the 0–100 sustainability score, reused wherever it shows. */
export const SUSTAINABILITY_SCORE_EXPLAINER =
  "Composite of the six pillar scores (energy, water, waste, carbon, social, governance), weighted by materiality and adjusted for data confidence. 0–100; higher is better.";
