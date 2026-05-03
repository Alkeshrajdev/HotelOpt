import { cn } from "@/lib/utils";

export type ViewKey = "overview" | "genuine" | "internal" | "external";

export const VIEWS: { key: ViewKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "genuine", label: "Genuine Performance" },
  { key: "internal", label: "Internal Comparison" },
  { key: "external", label: "External Comparison" },
];

export default function ViewTabs({
  active,
  onChange,
  exclude = [],
}: {
  active: ViewKey;
  onChange: (k: ViewKey) => void;
  exclude?: ViewKey[];
}) {
  return (
    <div className="inline-flex items-center gap-1 bg-ink-100 p-1 rounded-xl mb-4">
      {VIEWS.filter((v) => !exclude.includes(v.key)).map((v) => (
        <button
          key={v.key}
          onClick={() => onChange(v.key)}
          className={cn("tab", v.key === active && "tab-active")}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
