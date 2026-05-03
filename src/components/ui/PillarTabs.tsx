import { Zap, Droplet, Trash2, Cloud, Users, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export const PILLARS = [
  { key: "energy", label: "Energy", icon: Zap, color: "text-pillar-energy" },
  { key: "water", label: "Water", icon: Droplet, color: "text-pillar-water" },
  { key: "waste", label: "Waste", icon: Trash2, color: "text-pillar-waste" },
  { key: "carbon", label: "Carbon", icon: Cloud, color: "text-pillar-carbon" },
  { key: "social", label: "Social", icon: Users, color: "text-pillar-social" },
  { key: "governance", label: "Governance", icon: ShieldCheck, color: "text-pillar-gov" },
] as const;

export type PillarKey = (typeof PILLARS)[number]["key"];

export default function PillarTabs({
  active,
  onChange,
  // BRD §1.2 — GP, Internal, External do not apply to Social/Governance for some pillars.
  exclude = [],
}: {
  active: PillarKey;
  onChange: (k: PillarKey) => void;
  exclude?: PillarKey[];
}) {
  return (
    <div className="flex items-center gap-1 border-b border-ink-200 mb-5 overflow-x-auto">
      {PILLARS.filter((p) => !exclude.includes(p.key)).map((p) => {
        const Icon = p.icon;
        const isActive = p.key === active;
        return (
          <button
            key={p.key}
            onClick={() => onChange(p.key)}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors -mb-px",
              isActive
                ? "text-ink-900 border-b-2 border-brand-700"
                : "text-ink-500 hover:text-ink-900 border-b-2 border-transparent"
            )}
          >
            <Icon size={16} className={isActive ? p.color : "text-ink-400"} />
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
