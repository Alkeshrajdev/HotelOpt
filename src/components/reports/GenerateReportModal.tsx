import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Layers,
  Mail,
  Settings,
  ShieldCheck,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3 | 4 | 5;
type Format = "pdf" | "pptx" | "xlsx" | "docx";

const FRAMEWORKS = [
  { value: "gri",       label: "GRI Standards (2021)",            tone: "good"  as const },
  { value: "ghg",       label: "GHG Protocol (Corporate)",        tone: "good"  as const },
  { value: "sbti",      label: "SBTi Corporate Net-Zero",         tone: "warn"  as const },
  { value: "hcmi",      label: "HCMI v1.2 (per-stay)",            tone: "good"  as const },
  { value: "csrd",      label: "CSRD / ESRS draft support",       tone: "warn"  as const },
  { value: "gresb",     label: "GRESB 2024",                       tone: "good"  as const },
  { value: "cdp",       label: "CDP Climate / Water",              tone: "warn"  as const },
  { value: "internal",  label: "Internal management report",       tone: "info"  as const },
  { value: "cert",      label: "Certification dossier",            tone: "info"  as const },
];

const TEMPLATES = [
  { value: "executive",  label: "Executive summary",        sections: 4,  brand: true  },
  { value: "operations", label: "Operations deep-dive",     sections: 8,  brand: true  },
  { value: "audit",      label: "Audit-ready dossier",      sections: 12, brand: false },
  { value: "board",      label: "Board pack (PPT)",         sections: 6,  brand: true  },
];

type Tone = "formal" | "concise" | "detailed";

type Form = {
  scope: "portfolio" | "property" | "group";
  property?: string;
  period: string;
  pillars: string[];
  framework: string;
  template: string;
  tone: Tone;
  format: Format;
  includeEvidence: boolean;
  whiteLabel: boolean;
  schedule: "none" | "monthly" | "quarterly" | "annual";
  recipients: string;
};

const ALL_PILLARS = ["energy", "water", "waste", "carbon", "social", "governance"] as const;

const SECTION_SKELETONS: Record<string, { title: string; pages: string; note?: string }[]> = {
  executive: [
    { title: "Executive summary",            pages: "1–2",  note: "AI-drafted, reviewed by SM" },
    { title: "KPI dashboard",                pages: "1" },
    { title: "Emissions overview (Sc 1+2)",  pages: "2–3" },
    { title: "Year-on-year trends",          pages: "1–2" },
  ],
  operations: [
    { title: "Executive summary",            pages: "1–2",  note: "AI-drafted, reviewed by SM" },
    { title: "Energy deep-dive",             pages: "4–6" },
    { title: "Water consumption",            pages: "3–4" },
    { title: "Waste & recycling",            pages: "3–4" },
    { title: "Carbon inventory",             pages: "5–7" },
    { title: "Social metrics",               pages: "3–4" },
    { title: "Governance attestations",      pages: "2–3" },
    { title: "Anomaly log & actions",        pages: "3–5" },
  ],
  audit: [
    { title: "Audit summary",                pages: "2–3",  note: "For third-party verifier" },
    { title: "Data provenance",              pages: "5–8" },
    { title: "Evidence index",               pages: "10–20" },
    { title: "EF version log",               pages: "2–3" },
    { title: "Anomaly investigation notes",  pages: "3–5" },
    { title: "Audit trail extract",          pages: "10–20" },
    { title: "Checker sign-off list",        pages: "5–10" },
    { title: "GHG boundary statement",       pages: "2–3" },
    { title: "Assurance declaration",        pages: "1–2" },
    { title: "Materiality matrix",           pages: "3–4" },
    { title: "Engagement disclosure",        pages: "2–3" },
    { title: "Methodology appendix",         pages: "5–8" },
  ],
  board: [
    { title: "Sustainability snapshot",      pages: "2" },
    { title: "Carbon trend (Sc 1+2+3)",      pages: "2" },
    { title: "Energy & intensity KPIs",      pages: "2" },
    { title: "Risk heat map",                pages: "2" },
    { title: "Target progress",              pages: "2" },
    { title: "Next-period priorities",       pages: "2" },
  ],
};

const INITIAL: Form = {
  scope: "portfolio",
  property: "",
  period: "May 2025 — Apr 2026",
  pillars: ["energy", "water", "waste", "carbon", "social", "governance"],
  framework: "ghg",
  template: "executive",
  tone: "formal",
  format: "pdf",
  includeEvidence: true,
  whiteLabel: true,
  schedule: "none",
  recipients: "",
};

export default function GenerateReportModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<Form>(INITIAL);

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function reset() {
    setStep(1);
    setForm(INITIAL);
  }

  // Mock readiness check — would query Supabase in production.
  const readiness = useMemo(() => {
    return {
      energy:    { records: 412, missing: 2,  approved: 96 },
      water:     { records: 178, missing: 4,  approved: 84 },
      waste:     { records: 296, missing: 7,  approved: 71 },
      carbon:    { records: 142, missing: 0,  approved: 92 },
      social:    { records:  84, missing: 1,  approved: 88 },
      governance:{ records:  48, missing: 0,  approved: 96 },
    };
  }, []);

  const totalRecords = Object.values(readiness).reduce((s, r) => s + r.records, 0);
  const totalMissing = Object.values(readiness).reduce((s, r) => s + r.missing, 0);

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Generate report"
      subtitle="Reports map approved data to the framework's disclosure points and produce a draft response. Sustainability managers review and finalise."
      size="xl"
      tabs={
        <div className="flex flex-wrap items-center gap-1">
          {(["Scope","Period","Framework","Readiness","Preview"] as const).map((label, i) => {
            const n = (i + 1) as Step;
            return (
              <button
                key={label}
                onClick={() => setStep(n)}
                className={cn("tab", n === step && "tab-active", n < step && "text-good")}
              >
                <span
                  className={cn(
                    "w-5 h-5 rounded-full grid place-items-center text-[10px] font-bold",
                    n === step
                      ? "bg-brand-700 text-white"
                      : n < step
                        ? "bg-good text-white"
                        : "bg-ink-100 text-ink-500"
                  )}
                >
                  {n < step ? <CheckCircle2 size={11} /> : n}
                </span>
                {label}
              </button>
            );
          })}
        </div>
      }
      footer={
        <>
          <button className="btn-secondary" onClick={() => { reset(); onClose(); }}>
            Cancel
          </button>
          {step > 1 && (
            <button className="btn-secondary" onClick={() => setStep((s) => (s - 1) as Step)}>
              Back
            </button>
          )}
          {step < 5 ? (
            <button className="btn-primary" onClick={() => setStep((s) => (s + 1) as Step)}>
              Continue <ArrowRight size={14} />
            </button>
          ) : (
            <>
              <button className="btn-secondary" onClick={() => alert("Saved as draft")}>
                <FileText size={14} /> Save as draft
              </button>
              <button className="btn-primary" onClick={() => alert(`Generating ${form.framework.toUpperCase()} ${form.format.toUpperCase()} …`)}>
                <Download size={14} /> Generate
              </button>
            </>
          )}
        </>
      }
    >
      {step === 1 && (
        <Section title="Scope" hint="Which properties does this report cover?">
          <div className="grid grid-cols-3 gap-3">
            <ChoiceTile active={form.scope === "portfolio"} onClick={() => set("scope", "portfolio")}
              icon={<Layers size={18} />} title="Entire portfolio" hint="All 8 properties under this client" />
            <ChoiceTile active={form.scope === "group"} onClick={() => set("scope", "group")}
              icon={<Building2 size={18} />} title="Property group" hint="Region or brand subset" />
            <ChoiceTile active={form.scope === "property"} onClick={() => set("scope", "property")}
              icon={<Building2 size={18} />} title="Single property" hint="One hotel" />
          </div>
          {form.scope === "property" && (
            <div className="mt-4">
              <label className="block">
                <span className="text-[12px] font-medium text-ink-600">Property</span>
                <select className="input mt-1" value={form.property} onChange={(e) => set("property", e.target.value)}>
                  <option value="">— Select —</option>
                  <option>Skyline Dubai</option>
                  <option>Peaks Resort Zermatt</option>
                  <option>Oceanfront Cape Town</option>
                  <option>The Pavilion London</option>
                </select>
              </label>
            </div>
          )}
          <div className="mt-4">
            <div className="text-[12px] font-medium text-ink-600 mb-2">Pillars to include</div>
            <div className="flex flex-wrap gap-2">
              {ALL_PILLARS.map((p) => {
                const active = form.pillars.includes(p);
                return (
                  <button
                    key={p}
                    onClick={() =>
                      set("pillars", active
                        ? form.pillars.filter((x) => x !== p)
                        : [...form.pillars, p])
                    }
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-[12px] font-medium capitalize transition-colors",
                      active
                        ? "border-brand-500 bg-brand-50 text-brand-800"
                        : "border-ink-200 text-ink-600 hover:bg-ink-50"
                    )}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] text-ink-400 mt-1">{form.pillars.length} of {ALL_PILLARS.length} pillars selected</div>
          </div>
        </Section>
      )}

      {step === 2 && (
        <Section title="Period" hint="The window the report covers. Periods must align with the GP baseline year for SBTi outputs.">
          <div className="grid grid-cols-3 gap-3">
            {[
              "May 2025 — Apr 2026",
              "Jan 2026 — Apr 2026 (YTD)",
              "FY 2025 calendar",
              "FY 2024 calendar",
              "Q1 2026",
              "Custom range…",
            ].map((p) => (
              <ChoiceTile
                key={p}
                active={form.period === p}
                onClick={() => set("period", p)}
                icon={<Clock size={16} />}
                title={p}
              />
            ))}
          </div>
        </Section>
      )}

      {step === 3 && (
        <Section title="Framework & template" hint="Mapping engine generates a draft aligned to the chosen disclosure framework.">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[12px] font-medium text-ink-600 mb-2">Framework</div>
              <ul className="space-y-1.5">
                {FRAMEWORKS.map((f) => (
                  <li key={f.value}>
                    <button
                      onClick={() => set("framework", f.value)}
                      className={cn(
                        "w-full text-left rounded-lg border px-3 py-2 text-sm flex items-center justify-between",
                        form.framework === f.value
                          ? "border-brand-500 ring-1 ring-brand-500 bg-brand-50"
                          : "border-ink-200 bg-white hover:bg-ink-50"
                      )}
                    >
                      <span>{f.label}</span>
                      <Badge tone={f.tone}>{f.tone === "good" ? "Mapped" : f.tone === "warn" ? "Draft" : "Internal"}</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-[12px] font-medium text-ink-600 mb-2">Template</div>
              <ul className="space-y-1.5 mb-3">
                {TEMPLATES.map((t) => (
                  <li key={t.value}>
                    <button
                      onClick={() => set("template", t.value)}
                      className={cn(
                        "w-full text-left rounded-lg border px-3 py-2 text-sm",
                        form.template === t.value
                          ? "border-brand-500 ring-1 ring-brand-500 bg-brand-50"
                          : "border-ink-200 bg-white hover:bg-ink-50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{t.label}</span>
                        <span className="text-[11px] text-ink-500">{t.sections} sections</span>
                      </div>
                      {t.brand && (
                        <div className="text-[11px] text-ink-500 mt-0.5">
                          Supports white-label branding
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="text-[12px] font-medium text-ink-600 mb-2">Narrative tone (AI-drafted intro)</div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {([
                  { value: "formal",   label: "Formal",   hint: "Regulatory / investor tone" },
                  { value: "concise",  label: "Concise",  hint: "Short bullets, no waffle"   },
                  { value: "detailed", label: "Detailed", hint: "Full narrative with context" },
                ] as { value: Tone; label: string; hint: string }[]).map((t) => (
                  <button
                    key={t.value}
                    onClick={() => set("tone", t.value)}
                    className={cn(
                      "rounded-lg border p-2 text-left",
                      form.tone === t.value
                        ? "border-brand-500 ring-1 ring-brand-500 bg-brand-50"
                        : "border-ink-200 hover:bg-ink-50"
                    )}
                  >
                    <div className="text-[12px] font-semibold text-ink-900">{t.label}</div>
                    <div className="text-[10px] text-ink-500">{t.hint}</div>
                  </button>
                ))}
              </div>
              <div className="text-[12px] font-medium text-ink-600 mb-2">Output format</div>
              <div className="grid grid-cols-4 gap-2">
                {(["pdf","pptx","xlsx","docx"] as Format[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => set("format", f)}
                    className={cn(
                      "rounded-lg border py-2 text-sm font-medium",
                      form.format === f
                        ? "border-brand-500 bg-brand-50 text-brand-800"
                        : "border-ink-200 text-ink-700 hover:bg-ink-50"
                    )}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>
      )}

      {step === 4 && (
        <Section title="Data readiness" hint="Pre-flight check across the six pillars. Records must be checker-approved to be included.">
          <ul className="space-y-2">
            {(Object.entries(readiness) as [keyof typeof readiness, any][]).map(([pillar, r]) => {
              const tone = r.approved >= 90 ? "good" : r.approved >= 75 ? "warn" : "bad";
              return (
                <li key={pillar} className="flex items-center gap-3 rounded-xl border border-ink-200 p-3">
                  <span className="w-24 text-sm font-semibold capitalize text-ink-900">{pillar}</span>
                  <div className="flex-1 h-2 rounded-full bg-ink-100 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        tone === "good" ? "bg-good" : tone === "warn" ? "bg-warn" : "bg-bad"
                      )}
                      style={{ width: `${r.approved}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-sm font-semibold tabular-nums">{r.approved}%</span>
                  <span className="text-[11px] text-ink-500 w-32 text-right">
                    {r.records} approved · {r.missing} missing
                  </span>
                </li>
              );
            })}
          </ul>
          {totalMissing > 0 ? (
            <div className="mt-3 rounded-xl border border-warn/25 bg-warn/10 p-3 text-[13px] text-warn flex items-start gap-2">
              <ShieldCheck size={14} className="text-warn mt-0.5" />
              <div>
                <strong>{totalMissing} records missing</strong> · the report will be generated as a draft with data-quality notes per pillar. Approve missing records first for a fully clean export.
                <div className="mt-1 text-[12px]">{totalRecords.toLocaleString()} approved records · evidence completeness 78%</div>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-good/25 bg-good/10 p-3 text-[13px] text-good flex items-start gap-2">
              <CheckCircle2 size={14} className="text-good mt-0.5" />
              <strong>All data approved.</strong> Report will be generated against the full dataset.
            </div>
          )}
        </Section>
      )}

      {step === 5 && (
        <Section title="Preview & options" hint="Review the report scope, branding, and optional scheduled delivery.">
          <div className="grid grid-cols-2 gap-3">
            <Summary label="Scope"     value={form.scope === "portfolio" ? "Entire portfolio" : form.scope === "group" ? "Property group" : `Property: ${form.property || "—"}`} />
            <Summary label="Period"    value={form.period} />
            <Summary label="Framework" value={FRAMEWORKS.find((f) => f.value === form.framework)?.label ?? "—"} />
            <Summary label="Template"  value={TEMPLATES.find((t) => t.value === form.template)?.label ?? "—"} />
            <Summary label="Format"    value={form.format.toUpperCase()} />
            <Summary label="Records"   value={`${totalRecords.toLocaleString()} approved · ${totalMissing} missing`} />
          </div>

          {/* Section skeleton */}
          <div className="mt-4">
            <div className="text-[12px] font-semibold text-ink-700 mb-2">
              Section skeleton — {SECTION_SKELETONS[form.template]?.length ?? 0} sections
              <span className="font-normal text-ink-400 ml-2">
                (~{SECTION_SKELETONS[form.template]?.reduce((sum, s) => {
                  const [lo] = s.pages.split("–").map(Number);
                  return sum + (lo || 0);
                }, 0)}–{SECTION_SKELETONS[form.template]?.reduce((sum, s) => {
                  const parts = s.pages.split("–").map(Number);
                  return sum + (parts[1] || parts[0] || 0);
                }, 0)} pages estimated)
              </span>
            </div>
            <ol className="space-y-1">
              {(SECTION_SKELETONS[form.template] ?? []).map((sec, i) => (
                <li key={i} className="flex items-center gap-3 rounded-lg border border-ink-100 px-3 py-2">
                  <span className="w-5 h-5 rounded-full bg-ink-100 text-[10px] font-bold text-ink-500 grid place-items-center shrink-0">{i + 1}</span>
                  <span className="flex-1 text-[12px] text-ink-800">{sec.title}</span>
                  {sec.note && <span className="text-[10px] text-brand-600 bg-brand-50 rounded px-1.5 py-0.5">{sec.note}</span>}
                  <span className="text-[11px] text-ink-400 tabular-nums shrink-0">{sec.pages} pp</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Toggle label="Include evidence files (audit-ready)" value={form.includeEvidence} onChange={(v) => set("includeEvidence", v)} icon={<ImageIcon size={14} />} />
            <Toggle label="Apply white-label branding"            value={form.whiteLabel}      onChange={(v) => set("whiteLabel", v)}      icon={<Settings size={14} />} />
          </div>

          <div className="mt-4 rounded-xl border border-ink-200 p-4">
            <div className="text-sm font-semibold text-ink-900 flex items-center gap-2">
              <Bell size={14} className="text-brand-700" /> Scheduled delivery
            </div>
            <p className="text-[12px] text-ink-500 mt-0.5">
              Optionally regenerate this report on a recurring schedule and email it to a distribution list.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <label className="block">
                <span className="text-[11px] font-medium text-ink-500">Cadence</span>
                <select className="input mt-1" value={form.schedule} onChange={(e) => set("schedule", e.target.value as Form["schedule"])}>
                  <option value="none">One-off (no schedule)</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-medium text-ink-500">Recipients</span>
                <input className="input mt-1" placeholder="comma-separated emails" value={form.recipients} onChange={(e) => set("recipients", e.target.value)} />
              </label>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-brand-50 border border-brand-100 p-3 text-[12px] text-brand-900 flex items-start gap-2">
            <Mail size={14} className="text-brand-700 mt-0.5" />
            <span>
              Generated reports get a version number and are saved to the report history with provenance. Re-running the same configuration produces a new version, never overwrites the previous one.
            </span>
          </div>
        </Section>
      )}
    </Modal>
  );
}

/* ---------- helpers ---------- */

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-4">
        <div className="text-sm font-bold text-ink-900">{title}</div>
        <div className="text-[12px] text-ink-500">{hint}</div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function ChoiceTile({
  active,
  onClick,
  icon,
  title,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl border p-4 text-left transition-all",
        active
          ? "border-brand-500 ring-1 ring-brand-500 bg-brand-50"
          : "border-ink-200 bg-white hover:shadow-card hover:-translate-y-0.5"
      )}
    >
      <div className="flex items-center gap-2 text-brand-700 mb-1">{icon}</div>
      <div className="text-sm font-bold text-ink-900">{title}</div>
      {hint && <div className="text-[11px] text-ink-500 mt-0.5">{hint}</div>}
    </button>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-200 p-3">
      <div className="text-[11px] uppercase tracking-wide font-semibold text-ink-500">
        {label}
      </div>
      <div className="text-sm text-ink-900 font-medium mt-0.5">{value}</div>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
  icon,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        "rounded-xl border p-3 text-left flex items-center gap-3",
        value ? "border-brand-500 ring-1 ring-brand-500 bg-brand-50" : "border-ink-200 bg-white"
      )}
    >
      <span className={cn(
        "w-9 h-5 rounded-full relative transition-colors",
        value ? "bg-brand-700" : "bg-ink-200"
      )}>
        <span className={cn(
          "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all",
          value ? "left-4" : "left-0.5"
        )} />
      </span>
      <div className="text-sm font-medium text-ink-900 flex-1">{label}</div>
      <span className="text-ink-400">{icon}</span>
    </button>
  );
}

// Helper to satisfy unused import warnings for some icons referenced earlier.
export const _icons = { FileSpreadsheet, Layers };
