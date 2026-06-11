// Data Capture — BRD §6 compliant.
//
// 5-step flow per BRD revision:
//   Step 1: Pick a data type
//   Step 2: Pick an input method
//   Step 3: Method-specific capture workflow
//   Step 4: Shared preview — read-only summary + anomaly flags
//   Step 5: Confirmation (record in Maker–Checker queue)

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleSlash,
  ClipboardEdit,
  FileSpreadsheet,
  Image as ImageIcon,
  Info,
  Loader2,
  MessageSquare,
  Pencil,
  Plug,
  Plus,
  QrCode,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Upload,
  UserCheck,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import {
  DATA_TYPES,
  DATA_TYPES_BY_KEY,
  INTEGRATIONS,
  METHOD_META,
  STATUS_TEXT,
  STATUS_TONE,
  pseudoAnomaly,
  type DataTypeConfig,
  type DataTypeKey,
  type FieldDef,
  type Method,
} from "@/lib/dataCaptureConfig";
import { listProperties, createRecord, type Property } from "@/lib/api";
import { cn } from "@/lib/utils";

/* =================================================================== */
/* Types                                                                */
/* =================================================================== */

type Step = 1 | 2 | 3 | 4 | 5;

type CaptureResult = {
  propertyId: string;
  propertyName: string;
  currency: string;
  values: Record<string, string>;
  files: File[];
  anomalies: string[];
  displayRows: { label: string; value: string }[];
};

/* =================================================================== */
/* Helpers                                                              */
/* =================================================================== */

const COUNTRY_CURRENCY: Record<string, string> = {
  Indonesia: "IDR", Canada: "CAD", Australia: "AUD", Denmark: "DKK",
  Thailand: "THB", UAE: "AED", Turkey: "TRY", Philippines: "PHP",
  "United Arab Emirates": "AED", "United Kingdom": "GBP",
  Singapore: "SGD", Japan: "JPY", France: "EUR", Germany: "EUR",
  "United States": "USD", USA: "USD",
};

function getCurrencyFromCountry(country: string | null): string {
  if (!country) return "USD";
  return COUNTRY_CURRENCY[country] ?? "USD";
}

function validateRequiredFields(
  fields: FieldDef[],
  values: Record<string, string>
): Record<string, string> {
  const errs: Record<string, string> = {};
  for (const f of fields) {
    if (f.required && !values[f.key]?.trim()) {
      errs[f.key] = `${f.label} is required.`;
    }
  }
  return errs;
}

/* =================================================================== */
/* Main component                                                       */
/* =================================================================== */

export default function DataCapture() {
  const [step, setStep] = useState<Step>(1);
  const [dataType, setDataType] = useState<DataTypeKey | null>(null);
  const [method, setMethod] = useState<Method | null>(null);
  const [capture, setCapture] = useState<CaptureResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const cfg = dataType ? DATA_TYPES_BY_KEY[dataType] : null;

  function pickDataType(k: DataTypeKey) {
    setDataType(k);
    setMethod(null);
    setCapture(null);
    setStep(2);
  }
  function pickMethod(m: Method) {
    setMethod(m);
    setStep(3);
  }
  function reset() {
    setStep(1);
    setDataType(null);
    setMethod(null);
    setCapture(null);
    setSubmitError(null);
  }

  function handlePreview(result: CaptureResult) {
    setCapture(result);
    setSubmitError(null);
    setStep(4);
  }

  async function handleSubmit() {
    if (!capture || !cfg) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (cfg.key === "energy" && capture.propertyId) {
        const period = capture.values["period"] ?? new Date().toISOString().slice(0, 7);
        const [y, m] = period.split("-").map(Number);
        const start = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
        const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
        await createRecord({
          property_id: capture.propertyId,
          pillar: "energy",
          energy_source: (capture.values["sourceType"] as any) ?? "electricity_grid",
          period_start: start,
          period_end: end,
          consumption: parseFloat(capture.values["consumption"] ?? "0"),
          unit: capture.values["unit"] ?? "kWh",
          cost_amount: capture.values["cost"] ? parseFloat(capture.values["cost"]) : null,
          meter_id: capture.values["meterId"] || null,
          invoice_ref: capture.values["invoiceRef"] || null,
          notes: capture.values["notes"] || null,
          submit: true,
        });
      } else {
        await new Promise((r) => setTimeout(r, 500));
      }
      setStep(5);
    } catch (e: any) {
      setSubmitError(e.message ?? "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Enter and submit sustainability data"
        title="Data Capture"
        subtitle="Choose what to capture and how to enter it. All submissions are reviewed by a checker before they appear in dashboards or reports."
      />

      <Stepper
        step={step}
        dataTypeLabel={cfg?.label}
        methodLabel={method ? METHOD_META[method].label : undefined}
        onJump={(s) => {
          if (s === 1) reset();
          else if (s === 2 && dataType) { setMethod(null); setStep(2); }
          else if (s === 3 && method) setStep(3);
        }}
      />

      {step === 1 && <PickDataType onPick={pickDataType} />}

      {step === 2 && cfg && (
        <PickMethod cfg={cfg} onBack={() => setStep(1)} onPick={pickMethod} />
      )}

      {step === 3 && cfg && method && (
        <MethodWorkflow
          cfg={cfg}
          method={method}
          onBack={() => setStep(2)}
          onPreview={handlePreview}
        />
      )}

      {step === 4 && capture && cfg && (
        <PreviewScreen
          capture={capture}
          cfg={cfg}
          method={method!}
          onBack={() => setStep(3)}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitError={submitError}
        />
      )}

      {step === 5 && (
        <SuccessScreen capture={capture} onReset={reset} />
      )}
    </div>
  );
}

/* =================================================================== */
/* Stepper — 5 steps                                                    */
/* =================================================================== */

function Stepper({
  step,
  dataTypeLabel,
  methodLabel,
  onJump,
}: {
  step: Step;
  dataTypeLabel?: string;
  methodLabel?: string;
  onJump: (s: Step) => void;
}) {
  const steps = [
    { n: 1, label: "Data type",    value: dataTypeLabel },
    { n: 2, label: "Input method", value: methodLabel },
    { n: 3, label: "Capture",      value: undefined },
    { n: 4, label: "Preview",      value: undefined },
    { n: 5, label: "Submitted",    value: undefined },
  ];
  return (
    <div className="card card-pad flex flex-wrap items-center gap-3">
      {steps.map((s, idx) => {
        const active = step === s.n;
        const done = step > s.n;
        return (
          <div key={s.n} className="flex items-center gap-3">
            <button
              onClick={() => onJump(s.n as Step)}
              disabled={!done}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
                active
                  ? "bg-brand-700 text-white shadow-sm"
                  : done
                    ? "bg-good/10 text-good ring-1 ring-good/25 hover:bg-good/15"
                    : "bg-ink-100 text-ink-500"
              )}
            >
              <span
                className={cn(
                  "w-5 h-5 rounded-full grid place-items-center text-[11px] font-bold",
                  active ? "bg-white text-brand-700" : done ? "bg-good text-white" : "bg-white/70 text-ink-500"
                )}
              >
                {done ? <CheckCircle2 size={12} /> : s.n}
              </span>
              <span className="font-medium">{s.label}</span>
              {s.value && <span className="text-[11px] opacity-90">· {s.value}</span>}
            </button>
            {idx < steps.length - 1 && (
              <ChevronRight size={14} className="text-ink-300" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* =================================================================== */
/* Step 1 — Pick data type                                              */
/* =================================================================== */

function PickDataType({ onPick }: { onPick: (k: DataTypeKey) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-500">Step 1</div>
          <h2 className="text-lg font-bold text-ink-900">What do you want to capture?</h2>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {DATA_TYPES.map((dt) => {
          const Icon = dt.icon;
          return (
            <button
              key={dt.key}
              onClick={() => onPick(dt.key)}
              className="card text-left p-5 hover:shadow-pop hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className={cn("w-10 h-10 rounded-xl grid place-items-center shrink-0", dt.iconBg)}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-ink-900">{dt.label}</div>
                </div>
                <ChevronRight size={14} className="text-ink-300 mt-2.5" />
              </div>
              <p className="text-[12px] text-ink-500 mt-3 leading-snug">{dt.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-1">
                {dt.methods.slice(0, 3).map((m) => (
                  <span key={m} className="chip rounded-full bg-ink-100 text-ink-600 text-[10px] uppercase tracking-wider">
                    {m}
                  </span>
                ))}
                {dt.methods.length > 3 && (
                  <span className="text-[10px] text-ink-400">+{dt.methods.length - 3} more</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* =================================================================== */
/* Step 2 — Pick method                                                 */
/* =================================================================== */

function PickMethod({
  cfg, onPick, onBack,
}: {
  cfg: DataTypeConfig;
  onPick: (m: Method) => void;
  onBack: () => void;
}) {
  const ALL_METHODS: Method[] = ["manual", "ocr", "bulk", "qr", "api", "survey", "ai-assist"];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button onClick={onBack} className="btn-ghost h-7 px-2 text-[12px] mb-1">
            <ArrowLeft size={12} /> Change data type
          </button>
          <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-500">
            Step 2 · {cfg.label}
          </div>
          <h2 className="text-lg font-bold text-ink-900">How would you like to enter it?</h2>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ALL_METHODS.map((m) => {
          const supported = cfg.methods.includes(m);
          const meta = METHOD_META[m];
          return (
            <button
              key={m}
              onClick={() => supported && onPick(m)}
              disabled={!supported}
              className={cn(
                "card text-left p-4 transition-all flex items-start gap-3",
                supported ? "hover:shadow-pop hover:-translate-y-0.5" : "opacity-60 cursor-not-allowed"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl grid place-items-center shrink-0",
                supported ? "bg-brand-50 text-brand-700" : "bg-ink-100 text-ink-400"
              )}>
                {iconFor(m)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-bold text-ink-900">{meta.label}</div>
                </div>
                <p className="text-[12px] text-ink-500 mt-1 leading-snug">{meta.description}</p>
                <div className="mt-2">
                  {supported ? (
                    <Badge tone={m === "manual" ? "good" : "info"}>
                      {m === "manual" ? "Always available" : "Available"}
                    </Badge>
                  ) : (
                    <Badge tone="neutral"><CircleSlash size={11} /> Not applicable for this data type</Badge>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function iconFor(m: Method) {
  switch (m) {
    case "manual":    return <ClipboardEdit size={18} />;
    case "ocr":       return <ScanLine size={18} />;
    case "bulk":      return <Upload size={18} />;
    case "qr":        return <QrCode size={18} />;
    case "api":       return <Plug size={18} />;
    case "survey":    return <MessageSquare size={18} />;
    case "ai-assist": return <Sparkles size={18} />;
  }
}

/* =================================================================== */
/* Step 3 — Method workflow                                             */
/* =================================================================== */

function MethodWorkflow({
  cfg, method, onBack, onPreview,
}: {
  cfg: DataTypeConfig;
  method: Method;
  onBack: () => void;
  onPreview: (r: CaptureResult) => void;
}) {
  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 lg:col-span-8">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={onBack} className="btn-ghost h-7 px-2 text-[12px]">
            <ArrowLeft size={12} /> Change method
          </button>
          <span className="text-[12px] text-ink-500">·</span>
          <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-500">
            Step 3 · {cfg.label} · {METHOD_META[method].label}
          </span>
        </div>

        {method === "manual"    && <ManualWorkflow cfg={cfg} onPreview={onPreview} />}
        {method === "ocr"       && <OcrWorkflow cfg={cfg} onPreview={onPreview} />}
        {method === "bulk"      && <BulkWorkflow cfg={cfg} onPreview={onPreview} />}
        {method === "qr"        && <QrWorkflow cfg={cfg} onPreview={onPreview} />}
        {method === "api"       && <ApiWorkflow cfg={cfg} />}
        {method === "survey"    && <SurveyWorkflow cfg={cfg} />}
        {method === "ai-assist" && <AiAssistWorkflow cfg={cfg} onPreview={onPreview} />}
      </div>

      <div className="col-span-12 lg:col-span-4 space-y-4">
        <Card>
          <CardHeader title="Submission flow" hint="review before commit" />
          <ol className="px-5 pb-5 space-y-3 text-sm">
            <FlowStep n={1} title="Capture" body="Manual, OCR, bulk, QR, API, or supplier portal." />
            <FlowStep n={2} title="Preview" body="Read-only summary. Anomaly flags surfaced before submission." />
            <FlowStep n={3} title="Submit" body="Maker explicitly submits — record locks until checker acts." />
            <FlowStep n={4} title="Checker" body="Anomaly-flagged records surface first. Approve / Query / Reject." />
            <FlowStep n={5} title="Audit trail" body="Immutable log; original value preserved." done />
          </ol>
        </Card>
        <Card>
          <CardHeader title="Why this approach" />
          <ul className="p-5 space-y-2 text-sm text-ink-700">
            <li className="flex items-start gap-2">
              <Sparkles size={14} className="text-brand-700 mt-1" />
              <span>AI is assistive, never authoritative — every field can be edited before submission.</span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck size={14} className="text-good mt-1" />
              <span>Audit log writes automatically — actor, change, and reason preserved.</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-warn mt-1" />
              <span>Anomaly flags (spike / drop / range / unit / tier-regression) are computed before the checker sees the record.</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function FlowStep({ n, title, body, done }: { n: number; title: string; body: string; done?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <span className={cn(
        "w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold shrink-0",
        done ? "bg-good text-white" : "bg-brand-100 text-brand-800"
      )}>
        {done ? <CheckCircle2 size={13} /> : n}
      </span>
      <div>
        <div className="font-medium text-ink-900">{title}</div>
        <div className="text-[12px] text-ink-500 leading-snug">{body}</div>
      </div>
    </li>
  );
}

/* =================================================================== */
/* Step 4 — Shared Preview screen                                       */
/* =================================================================== */

function PreviewScreen({
  capture, cfg, method, onBack, onSubmit, submitting, submitError,
}: {
  capture: CaptureResult;
  cfg: DataTypeConfig;
  method: Method;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitError: string | null;
}) {
  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 lg:col-span-8 space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="btn-ghost h-7 px-2 text-[12px]">
            <ArrowLeft size={12} /> Back to edit
          </button>
          <span className="text-[12px] text-ink-500">·</span>
          <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-500">
            Step 4 · Preview
          </span>
        </div>

        <Card>
          <CardHeader
            title="Submission preview"
            hint={`${cfg.label} · ${METHOD_META[method].label}`}
          />
          <div className="px-5 pb-5 space-y-4">
            {/* Property + method summary */}
            <div className="rounded-xl bg-ink-50 border border-ink-200 p-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[13px]">
              <PreviewRow label="Property" value={capture.propertyName || "—"} />
              <PreviewRow label="Data type" value={cfg.label} />
              <PreviewRow label="Input method" value={METHOD_META[method].label} />
              <PreviewRow label="Currency" value={capture.currency} />
            </div>

            {/* Captured values */}
            <div>
              <div className="text-[12px] font-semibold text-ink-700 uppercase tracking-wide mb-2">
                Captured values
              </div>
              <div className="rounded-xl border border-ink-200 divide-y divide-ink-100">
                {capture.displayRows.map((r) => (
                  <div key={r.label} className="flex items-start justify-between gap-4 px-4 py-2.5">
                    <span className="text-[12px] text-ink-500 shrink-0 w-40">{r.label}</span>
                    <span className="text-[13px] text-ink-900 font-medium text-right flex-1 break-all">
                      {r.value || <span className="text-ink-400 italic">—</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Evidence files */}
            {capture.files.length > 0 && (
              <div>
                <div className="text-[12px] font-semibold text-ink-700 uppercase tracking-wide mb-2">
                  Evidence files ({capture.files.length})
                </div>
                <ul className="space-y-1">
                  {capture.files.map((f) => (
                    <li key={f.name} className="flex items-center gap-2 text-[12px] text-ink-700">
                      <ImageIcon size={12} className="text-ink-400" />
                      {f.name}
                      <span className="text-ink-400">· {Math.round(f.size / 1024)} KB</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Anomaly flags */}
            {capture.anomalies.length > 0 && (
              <div className="rounded-xl border border-warn/25 bg-warn/10 p-3">
                <div className="flex items-center gap-2 text-[12px] font-semibold text-warn mb-1">
                  <AlertTriangle size={14} /> Anomaly flags — checker will review
                </div>
                <ul className="text-[12px] text-warn space-y-1">
                  {capture.anomalies.map((a) => <li key={a}>• {a}</li>)}
                </ul>
              </div>
            )}

            {capture.anomalies.length === 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-good/10 border border-good/20 px-3 py-2 text-[12px] text-good">
                <CheckCircle2 size={14} /> No anomalies detected.
              </div>
            )}

            {/* DP-03 notice */}
            <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 flex items-start gap-2 text-[12px] text-brand-900">
              <Sparkles size={14} className="text-brand-700 mt-0.5 shrink-0" />
              Submitting routes through Maker–Checker. Nothing commits to dashboards or reports until a checker approves.
            </div>

            {submitError && (
              <div className="rounded-lg border border-bad/25 bg-bad/10 text-bad px-3 py-2 text-sm">
                {submitError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={onBack} className="btn-secondary" disabled={submitting}>
                <Pencil size={14} /> Edit
              </button>
              <button
                onClick={onSubmit}
                disabled={submitting}
                className="btn-primary"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                Submit for review
              </button>
            </div>
          </div>
        </Card>
      </div>

      <div className="col-span-12 lg:col-span-4">
        <Card>
          <CardHeader title="What happens next" hint="review workflow" />
          <ol className="px-5 pb-5 space-y-3 text-sm">
            <FlowStep n={1} title="Record locked" body="Once submitted, the record is locked for editing until checker acts." />
            <FlowStep n={2} title="Anomaly triage" body="Flagged records surface first in the checker queue." />
            <FlowStep n={3} title="Checker review" body="Approve, Query (request changes), or Reject." />
            <FlowStep n={4} title="Live in reports" body="Approved data flows to dashboards, GP score, and certifications." done />
          </ol>
        </Card>
      </div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-ink-500">{label}</span>
      <span className="font-medium text-ink-900">{value}</span>
    </>
  );
}

/* =================================================================== */
/* Step 5 — Success screen                                              */
/* =================================================================== */

function SuccessScreen({
  capture, onReset,
}: {
  capture: CaptureResult | null;
  onReset: () => void;
}) {
  return (
    <div className="max-w-lg mx-auto text-center space-y-6 py-12">
      <div className="w-20 h-20 mx-auto rounded-full bg-good/10 grid place-items-center text-good">
        <CheckCircle2 size={40} />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-ink-900">Submitted for review</h2>
        <p className="text-ink-500 mt-2">
          Your entry has been added to the Maker–Checker queue.
          {capture?.propertyName ? ` (${capture.propertyName})` : ""} A checker will review it shortly — anomaly flags have been computed automatically.
        </p>
      </div>
      <div className="rounded-xl bg-brand-50 border border-brand-100 p-4 text-left text-[13px] text-brand-900 space-y-1">
        <div className="font-semibold mb-2">What was submitted</div>
        <div className="flex justify-between">
          <span className="text-brand-700">Property</span>
          <span>{capture?.propertyName || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-brand-700">Status</span>
          <span>Pending checker review</span>
        </div>
      </div>
      <div className="flex items-center justify-center gap-3">
        <button onClick={onReset} className="btn-primary">
          <Plus size={14} /> Capture another entry
        </button>
      </div>
    </div>
  );
}

/* =================================================================== */
/* MANUAL — dynamic form per data type                                  */
/* =================================================================== */

function ManualWorkflow({
  cfg, onPreview,
}: {
  cfg: DataTypeConfig;
  onPreview: (r: CaptureResult) => void;
}) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState<string>("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    listProperties().then((rows) => {
      setProperties(rows);
      if (rows[0]) setPropertyId(rows[0].id);
    });
  }, []);

  const selectedProperty = properties.find((p) => p.id === propertyId) ?? null;
  const currency = useMemo(
    () => getCurrencyFromCountry(selectedProperty?.country ?? null),
    [selectedProperty]
  );

  // For social: use sub-type-specific fields alongside the base ones
  const isSocial = cfg.key === "social";
  const isGovernance = cfg.key === "governance";
  const subType = values["subType"] ?? "";

  const consumption = parseFloat(
    values["consumption"] ?? values["quantity"] ?? values["amount"] ?? values["value"] ?? ""
  );
  const anomalies = pseudoAnomaly(
    Number.isFinite(consumption) ? consumption : null,
    values["unit"] ?? "",
    values["sourceType"] ?? ""
  );
  const evidenceMissing = files.length === 0 && cfg.fields.some((f) => f.key === "evidence");

  function set(k: string, v: string) {
    setValues((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  }

  function handleBlur(f: FieldDef) {
    if (f.required && !values[f.key]?.trim()) {
      setErrors((e) => ({ ...e, [f.key]: `${f.label} is required.` }));
    }
  }

  function buildDisplayRows(extraFields?: FieldDef[]): { label: string; value: string }[] {
    const allFields = [...cfg.fields, ...(extraFields ?? [])];
    const rows: { label: string; value: string }[] = [];
    for (const f of allFields) {
      if (f.key === "evidence") continue;
      const v = values[f.key] ?? "";
      if (!v) continue;
      let display = v;
      if (f.type === "select" && f.options) {
        display = f.options.find((o) => o.value === v)?.label ?? v;
      }
      if (f.type === "currency") display = `${currency} ${v}`;
      rows.push({ label: f.label, value: display });
    }
    return rows;
  }

  function handleContinue(extraFields?: FieldDef[]) {
    if (!propertyId) {
      setErrors((e) => ({ ...e, propertyId: "Please select a property." }));
      return;
    }
    setAttempted(true);
    const allFields = [...cfg.fields, ...(extraFields ?? [])];
    const errs = validateRequiredFields(allFields, values);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const property = properties.find((p) => p.id === propertyId);
    onPreview({
      propertyId,
      propertyName: property?.name ?? "",
      currency,
      values,
      files,
      anomalies: [
        ...anomalies,
        ...(evidenceMissing ? ["No evidence file attached. Audit-ready submissions should include source documentation."] : []),
      ],
      displayRows: buildDisplayRows(extraFields),
    });
  }

  if (isGovernance) {
    return <GovernanceWorkflow onPreview={onPreview} properties={properties} propertyId={propertyId} setPropertyId={setPropertyId} />;
  }

  return (
    <Card>
      <CardHeader
        title={`Manual entry — ${cfg.label}`}
        hint={cfg.label}
      />
      <div className="px-5 pt-4">
        <Field label="Property" required error={errors["propertyId"]}>
          <select
            className={cn("input", errors["propertyId"] && "border-bad")}
            value={propertyId}
            onChange={(e) => { setPropertyId(e.target.value); setErrors((e2) => { const n = { ...e2 }; delete n["propertyId"]; return n; }); }}
          >
            {properties.length === 0 && <option value="">No properties available</option>}
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4 px-5 pt-4 pb-5">
        {cfg.fields.map((f) => (
          <FormField
            key={f.key}
            f={f}
            value={values[f.key] ?? ""}
            onChange={(v) => set(f.key, v)}
            onBlur={() => handleBlur(f)}
            files={files}
            setFiles={setFiles}
            currency={currency}
            onUnitChange={(u) => set("unit", u)}
            error={attempted || errors[f.key] ? errors[f.key] : undefined}
          />
        ))}

        {/* Social sub-type-specific fields */}
        {isSocial && subType && SOCIAL_SUB_FIELDS[subType] && (
          <>
            <div className="col-span-2 border-t border-ink-200 pt-4">
              <div className="text-[12px] font-semibold text-ink-700 uppercase tracking-wide mb-3">
                {cfg.fields.find((f) => f.key === "subType")?.options?.find((o) => o.value === subType)?.label ?? subType} — details
              </div>
              <div className="grid grid-cols-2 gap-4">
                {SOCIAL_SUB_FIELDS[subType].map((f) => (
                  <FormField
                    key={f.key}
                    f={f}
                    value={values[f.key] ?? ""}
                    onChange={(v) => set(f.key, v)}
                    onBlur={() => handleBlur(f)}
                    files={files}
                    setFiles={setFiles}
                    currency={currency}
                    error={attempted ? errors[f.key] : undefined}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Anomaly preview pane */}
        {(anomalies.length > 0 || evidenceMissing) && (
          <div className="col-span-2 rounded-xl border border-warn/25 bg-warn/10 p-3">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-warn mb-1">
              <AlertTriangle size={14} /> Pre-submit checks
            </div>
            <ul className="text-[12px] text-warn space-y-1">
              {anomalies.map((a) => <li key={a}>• {a}</li>)}
              {evidenceMissing && <li>• No evidence file attached. Audit-ready submissions should include source documentation.</li>}
            </ul>
          </div>
        )}

        <div className="col-span-2 rounded-xl bg-brand-50 border border-brand-100 p-3 text-[12px] text-brand-800 flex items-center gap-2">
          <Sparkles size={14} />
          Submitting routes through Maker–Checker. No data commits without checker approval.
        </div>

        {Object.keys(errors).length > 0 && attempted && (
          <div className="col-span-2 text-sm rounded-lg border border-bad/25 bg-bad/10 text-bad px-3 py-2">
            Please fix the highlighted fields before continuing.
          </div>
        )}

        <div className="col-span-2 flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            className="btn-primary"
            onClick={() => handleContinue(isSocial && subType ? SOCIAL_SUB_FIELDS[subType] : undefined)}
          >
            Preview &amp; submit <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </Card>
  );
}

/* =================================================================== */
/* Social sub-type fields                                               */
/* =================================================================== */

const SOCIAL_SUB_FIELDS: Record<string, FieldDef[]> = {
  headcount: [
    { key: "totalEmployees", label: "Total employees", type: "number", required: true },
    { key: "fte", label: "Full-time (FTE)", type: "number" },
    { key: "pte", label: "Part-time (PTE)", type: "number" },
    { key: "femalePct", label: "Female %", type: "number", help: "% of total headcount who identify as female." },
    { key: "localPct", label: "Local hire %", type: "number", help: "% employees from the property's host country." },
    { key: "managementFemalePct", label: "Female in management %", type: "number" },
  ],
  training: [
    { key: "headcountTrained", label: "Headcount trained", type: "number", required: true },
    { key: "totalHours", label: "Total training hours", type: "number", required: true },
    { key: "hoursPerEmployee", label: "Hours per employee", type: "number", help: "Auto-calculated if blank." },
    {
      key: "trainingType", label: "Training type", type: "select",
      options: [
        { value: "sustainability", label: "Sustainability" },
        { value: "safety", label: "Health & Safety" },
        { value: "skills", label: "Skills development" },
        { value: "compliance", label: "Compliance / ethics" },
        { value: "leadership", label: "Leadership" },
        { value: "other", label: "Other" },
      ],
    },
  ],
  "hs-incident": [
    {
      key: "incidentType", label: "Incident type", type: "select", required: true,
      options: [
        { value: "lti", label: "Lost Time Injury (LTI)" },
        { value: "mtc", label: "Medical Treatment Case" },
        { value: "fac", label: "First Aid Case" },
        { value: "near-miss", label: "Near miss / dangerous occurrence" },
      ],
    },
    {
      key: "severity", label: "Severity", type: "select", required: true,
      options: [
        { value: "minor", label: "Minor" },
        { value: "moderate", label: "Moderate" },
        { value: "serious", label: "Serious" },
        { value: "fatal", label: "Fatal" },
      ],
    },
    { key: "lostDays", label: "Lost time days", type: "number" },
    {
      key: "affectedParty", label: "Affected party", type: "select",
      options: [
        { value: "employee", label: "Employee" },
        { value: "contractor", label: "Contractor" },
        { value: "guest", label: "Guest" },
      ],
    },
    { key: "correctiveAction", label: "Corrective action taken", type: "textarea", full: true },
  ],
  community: [
    {
      key: "engagementType", label: "Engagement type", type: "select", required: true,
      options: [
        { value: "donation", label: "Monetary donation" },
        { value: "volunteering", label: "Staff volunteering" },
        { value: "in-kind", label: "In-kind contribution" },
        { value: "partnership", label: "Community partnership" },
      ],
    },
    { key: "beneficiaries", label: "Beneficiaries (count)", type: "number" },
    { key: "amountCommitted", label: "Amount committed", type: "currency" },
    { key: "organisation", label: "Organisation / cause", type: "text" },
  ],
  "local-sourcing": [
    { key: "totalProcurementSpend", label: "Total procurement spend", type: "currency", required: true },
    { key: "localSpendPct", label: "Local spend %", type: "number", required: true, help: "% of total spend with local / in-country suppliers." },
    {
      key: "localDefinition", label: "Local definition", type: "select",
      options: [
        { value: "city", label: "Same city / district" },
        { value: "country", label: "Same country" },
        { value: "region", label: "Same region" },
      ],
    },
    { key: "verifiedBy", label: "Verified by", type: "text" },
  ],
};

/* =================================================================== */
/* Governance attestation form                                          */
/* =================================================================== */

const GOV_ITEMS = [
  { key: "ac-policy",       label: "Anti-corruption policy in place",          gri: "GRI 205-1" },
  { key: "code-conduct",    label: "Code of conduct in place",                 gri: "GRI 102-16" },
  { key: "whistleblowing",  label: "Whistleblowing / speak-up channel in place", gri: "GRI 102-16" },
  { key: "supplier-code",   label: "Supplier code of conduct in place",        gri: "GRI 414-1" },
  { key: "board-oversight", label: "Board sustainability oversight in place",  gri: "GRI 102-19" },
];

function GovernanceWorkflow({
  onPreview, properties, propertyId, setPropertyId,
}: {
  onPreview: (r: CaptureResult) => void;
  properties: Property[];
  propertyId: string;
  setPropertyId: (id: string) => void;
}) {
  const [responses, setResponses] = useState<Record<string, "yes" | "no" | "na">>({});
  const [attestedBy, setAttestedBy] = useState("");
  const [attestedDate, setAttestedDate] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attempted, setAttempted] = useState(false);

  function handleContinue() {
    setAttempted(true);
    const errs: Record<string, string> = {};
    if (!propertyId) errs["propertyId"] = "Required.";
    for (const item of GOV_ITEMS) {
      if (!responses[item.key]) errs[item.key] = "Select Yes, No, or N/A.";
    }
    if (!attestedBy.trim()) errs["attestedBy"] = "Required.";
    if (!attestedDate.trim()) errs["attestedDate"] = "Required.";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    const property = properties.find((p) => p.id === propertyId);
    const displayRows = [
      ...GOV_ITEMS.map((item) => ({
        label: item.label,
        value: responses[item.key] === "yes" ? "Yes" : responses[item.key] === "no" ? "No" : "N/A",
      })),
      { label: "Attested by", value: attestedBy },
      { label: "Attested date", value: attestedDate },
    ];

    onPreview({
      propertyId,
      propertyName: property?.name ?? "",
      currency: getCurrencyFromCountry(property?.country ?? null),
      values: { ...responses, attestedBy, attestedDate },
      files,
      anomalies: [],
      displayRows,
    });
  }

  return (
    <Card>
      <CardHeader title="Governance attestation" hint="GRI 102/205/414 · annual" />
      <div className="px-5 pt-4 pb-5 space-y-5">
        <Field label="Property" required error={attempted ? errors["propertyId"] : undefined}>
          <select
            className={cn("input", attempted && errors["propertyId"] && "border-bad")}
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
          >
            {properties.length === 0 && <option value="">No properties available</option>}
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>

        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_auto] items-center bg-ink-50 rounded-t-xl border border-ink-200 px-4 py-2">
            <div className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide">Policy / attestation item</div>
            <div className="flex gap-3 text-[11px] font-semibold text-ink-500 uppercase tracking-wide">
              <span className="w-10 text-center">Yes</span>
              <span className="w-10 text-center">No</span>
              <span className="w-10 text-center">N/A</span>
            </div>
          </div>
          {GOV_ITEMS.map((item, idx) => (
            <div
              key={item.key}
              className={cn(
                "grid grid-cols-[1fr_auto] items-center border border-ink-200 px-4 py-3 rounded-xl",
                idx === GOV_ITEMS.length - 1 && "rounded-b-xl",
                attempted && errors[item.key] && "border-bad/50 bg-bad/5"
              )}
            >
              <div>
                <div className="text-sm text-ink-900">{item.label}</div>
                <div className="text-[11px] text-ink-400 mt-0.5">{item.gri}</div>
                {attempted && errors[item.key] && (
                  <div className="text-[11px] text-bad mt-0.5">{errors[item.key]}</div>
                )}
              </div>
              <div className="flex gap-3">
                {(["yes", "no", "na"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      setResponses((r) => ({ ...r, [item.key]: v }));
                      setErrors((e) => { const n = { ...e }; delete n[item.key]; return n; });
                    }}
                    className={cn(
                      "w-10 h-10 rounded-lg border text-xs font-bold transition-all",
                      responses[item.key] === v
                        ? v === "yes"
                          ? "bg-good text-white border-good"
                          : v === "no"
                            ? "bg-bad text-white border-bad"
                            : "bg-ink-400 text-white border-ink-400"
                        : "border-ink-200 bg-white text-ink-500 hover:border-ink-400"
                    )}
                  >
                    {v.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Attested by" required error={attempted ? errors["attestedBy"] : undefined}>
            <input
              className={cn("input", attempted && errors["attestedBy"] && "border-bad")}
              value={attestedBy}
              onChange={(e) => { setAttestedBy(e.target.value); setErrors((e2) => { const n = { ...e2 }; delete n["attestedBy"]; return n; }); }}
              placeholder="Full name / role"
            />
          </Field>
          <Field label="Attestation date" required error={attempted ? errors["attestedDate"] : undefined}>
            <input
              className={cn("input", attempted && errors["attestedDate"] && "border-bad")}
              type="date"
              value={attestedDate}
              onChange={(e) => { setAttestedDate(e.target.value); setErrors((e2) => { const n = { ...e2 }; delete n["attestedDate"]; return n; }); }}
            />
          </Field>
        </div>

        <FileDrop files={files} setFiles={setFiles} />

        <div className="flex justify-end">
          <button onClick={handleContinue} className="btn-primary">
            Preview &amp; submit <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </Card>
  );
}

/* =================================================================== */
/* FormField                                                            */
/* =================================================================== */

function FormField({
  f, value, onChange, onBlur, files, setFiles, currency, onUnitChange, error,
}: {
  f: FieldDef;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  files: File[];
  setFiles: (f: File[]) => void;
  currency: string;
  onUnitChange?: (u: string) => void;
  error?: string;
}) {
  const labelEl = (
    <span className="text-[12px] font-medium text-ink-600">
      {f.type === "currency" ? `${f.label} (${currency})` : f.label}
      {f.required && <span className="text-bad ml-0.5">*</span>}
    </span>
  );

  let input: React.ReactNode;
  switch (f.type) {
    case "text":
      input = <input className={cn("input", error && "border-bad")} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />;
      break;
    case "number":
      input = <input className={cn("input", error && "border-bad")} type="number" step="any" value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} placeholder="0" />;
      break;
    case "currency":
      input = <input className={cn("input", error && "border-bad")} type="number" step="0.01" value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} placeholder="0.00" />;
      break;
    case "month":
      input = <input className={cn("input", error && "border-bad")} type="month" value={value || new Date().toISOString().slice(0, 7)} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />;
      break;
    case "date":
      input = <input className={cn("input", error && "border-bad")} type="date" value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />;
      break;
    case "select":
      input = (
        <select className={cn("input", error && "border-bad")} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur}>
          <option value="">— Select —</option>
          {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
      break;
    case "unit":
      input = (
        <select
          className="input"
          value={value || f.defaultUnit || f.unitOptions?.[0] || ""}
          onChange={(e) => { onChange(e.target.value); onUnitChange?.(e.target.value); }}
        >
          {(f.unitOptions ?? []).map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      );
      break;
    case "textarea":
      input = <textarea className="input min-h-[72px] py-2" value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />;
      break;
    case "file":
      input = <FileDrop files={files} setFiles={setFiles} />;
      break;
    case "tier":
      input = (
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange(String(t))}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm",
                value === String(t)
                  ? "border-brand-500 ring-1 ring-brand-500 bg-brand-50 text-brand-800"
                  : "border-ink-200 bg-white text-ink-700"
              )}
            >
              Tier {t}
            </button>
          ))}
        </div>
      );
      break;
    case "pillar-multi":
      input = (
        <PillarMulti
          value={value ? value.split(",") : []}
          onChange={(arr) => onChange(arr.join(","))}
        />
      );
      break;
    default:
      input = <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />;
  }

  return (
    <label className={cn("block", f.full && "col-span-2")}>
      {labelEl}
      <div className="mt-1">{input}</div>
      {error && <div className="text-[11px] text-bad mt-1">{error}</div>}
      {!error && (f.help || f.hint) && (
        <div className="text-[11px] text-ink-500 mt-1">{f.help ?? f.hint}</div>
      )}
    </label>
  );
}

function FileDrop({ files, setFiles }: { files: File[]; setFiles: (f: File[]) => void }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-ink-200 bg-ink-50/40 p-4 text-center">
      {files.length === 0 ? (
        <>
          <ImageIcon size={20} className="mx-auto text-ink-400" />
          <div className="text-[12px] text-ink-500 mt-1">
            Drag a bill, invoice, meter photo, or contractor report here
          </div>
          <input
            type="file"
            multiple
            className="mt-2 text-[12px]"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv"
          />
        </>
      ) : (
        <ul className="text-left space-y-1">
          {files.map((f) => (
            <li key={f.name} className="flex items-center justify-between text-[12px] text-ink-700">
              <span className="truncate flex items-center gap-2">
                <ImageIcon size={12} className="text-ink-400" /> {f.name}
              </span>
              <span className="text-ink-500">{Math.round(f.size / 1024)} KB</span>
            </li>
          ))}
          <li className="text-[11px] text-brand-700 font-semibold cursor-pointer" onClick={() => setFiles([])}>
            Clear
          </li>
        </ul>
      )}
    </div>
  );
}

function PillarMulti({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const PILLARS = ["energy", "water", "waste", "carbon", "social", "governance"];
  return (
    <div className="flex flex-wrap gap-2">
      {PILLARS.map((p) => {
        const on = value.includes(p);
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(on ? value.filter((x) => x !== p) : [...value, p])}
            className={cn(
              "chip rounded-full px-3 py-1 text-[12px] capitalize",
              on ? "bg-brand-700 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
            )}
          >
            {p}
          </button>
        );
      })}
    </div>
  );
}

function Field({
  label, required, children, error,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium text-ink-600">
        {label}
        {required && <span className="text-bad ml-0.5">*</span>}
      </span>
      <div className="mt-1">{children}</div>
      {error && <div className="text-[11px] text-bad mt-1">{error}</div>}
    </label>
  );
}

/* =================================================================== */
/* OCR workflow                                                         */
/* =================================================================== */

type OcrField = { key: string; label: string; value: string; conf: number };

const SAMPLE_OCR: OcrField[] = [
  { key: "vendor",      label: "Vendor",         value: "EmiratesGreen Power Co.", conf: 97 },
  { key: "account",     label: "Account number", value: "84-220-915-A",            conf: 94 },
  { key: "period",      label: "Billing period", value: "2026-04",                 conf: 92 },
  { key: "consumption", label: "Consumption",    value: "412580",                  conf: 88 },
  { key: "cost",        label: "Cost",           value: "64920",                   conf: 71 },
  { key: "meterId",     label: "Meter ID",       value: "ELEC-MAIN-01",            conf: 62 },
];

function OcrWorkflow({ cfg, onPreview }: { cfg: DataTypeConfig; onPreview: (r: CaptureResult) => void }) {
  const [extracted, setExtracted] = useState<OcrField[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState<string>("");

  useEffect(() => {
    listProperties().then((rows) => {
      setProperties(rows);
      if (rows[0]) setPropertyId(rows[0].id);
    });
  }, []);

  function simulateUpload() {
    setBusy(true);
    setTimeout(() => {
      setExtracted(SAMPLE_OCR);
      const preload: Record<string, string> = {};
      for (const f of SAMPLE_OCR) preload[f.key] = f.value;
      setEditValues(preload);
      setBusy(false);
    }, 800);
  }

  function handleContinue() {
    const property = properties.find((p) => p.id === propertyId);
    const values = editMode ? editValues : Object.fromEntries((extracted ?? []).map((f) => [f.key, f.value]));
    const anomalies = pseudoAnomaly(
      parseFloat(values["consumption"] ?? ""), values["unit"] ?? "kWh", "electricity_grid"
    );
    const displayRows = (extracted ?? []).map((f) => ({
      label: f.label,
      value: values[f.key] ?? f.value,
    }));
    onPreview({
      propertyId,
      propertyName: property?.name ?? "",
      currency: getCurrencyFromCountry(property?.country ?? null),
      values,
      files: [],
      anomalies,
      displayRows,
    });
  }

  return (
    <Card>
      <CardHeader title={`OCR — ${cfg.label}`} hint="text recognition from documents" />
      <div className="grid grid-cols-2 gap-4 p-5">
        {/* Upload + document preview */}
        <div className="rounded-xl border-2 border-dashed border-ink-200 bg-ink-50 grid place-items-center text-center p-6 min-h-[300px]">
          {extracted ? (
            <div className="text-left w-full">
              <div className="rounded-lg bg-white border border-ink-200 p-4">
                <div className="text-[12px] text-ink-500 mb-2">Source document</div>
                <div className="aspect-[3/4] bg-gradient-to-b from-ink-100 to-ink-50 rounded grid place-items-center text-ink-400">
                  <ImageIcon size={32} />
                </div>
                <div className="text-[11px] text-ink-500 mt-2">utility-bill-apr2026.pdf · 412 KB</div>
              </div>
              <button onClick={() => { setExtracted(null); setEditMode(false); }} className="btn-ghost h-7 px-2 text-[12px] text-brand-700 mt-2">
                Replace file
              </button>
            </div>
          ) : (
            <div>
              <ImageIcon size={28} className="mx-auto text-ink-400" />
              <div className="mt-2 text-sm font-semibold text-ink-700">Drop bill, invoice, or receipt</div>
              <div className="text-[12px] text-ink-500">JPG · PNG · PDF (multi-page) — any global format</div>
              <button onClick={simulateUpload} disabled={busy} className="btn-primary mt-3">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {busy ? "Extracting…" : "Upload & extract"}
              </button>
            </div>
          )}
        </div>

        {/* Extracted fields / edit form */}
        <div>
          <div className="text-sm font-semibold text-ink-900 mb-2">
            {editMode ? "Edit extracted values" : "Extracted preview"}
            {extracted && (
              <span className="ml-2 text-[11px] text-ink-400">
                {extracted.filter((f) => f.conf < 85).length} field(s) below confidence threshold
              </span>
            )}
          </div>

          {!extracted ? (
            <div className="text-[12px] text-ink-500">
              Upload a document to start. Fields below the confidence threshold will be highlighted amber and surfaced first to the checker.
            </div>
          ) : editMode ? (
            <div className="space-y-3">
              <Field label="Property" required>
                <select className="input" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              {extracted.map((f) => (
                <div key={f.key}>
                  <label className="block">
                    <span className={cn(
                      "text-[12px] font-medium",
                      f.conf < 85 ? "text-warn" : "text-ink-600"
                    )}>
                      {f.label}
                      {f.conf < 85 && <span className="ml-1 text-[10px]">(conf {f.conf}% — verify)</span>}
                    </span>
                    <input
                      className={cn("input mt-1", f.conf < 85 && "border-warn/50 bg-warn/5")}
                      value={editValues[f.key] ?? f.value}
                      onChange={(e) => setEditValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    />
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <ul className="space-y-2 text-sm">
              {extracted.map((f) => (
                <ExtractedRow key={f.key} field={f.label} value={f.value} conf={f.conf} />
              ))}
            </ul>
          )}

          {extracted && (
            <div className="mt-3 flex items-center justify-end gap-2 flex-wrap">
              {!editMode && (
                <button onClick={() => setEditMode(true)} className="btn-secondary">
                  <Pencil size={14} /> Edit values
                </button>
              )}
              {editMode && (
                <button onClick={() => setEditMode(false)} className="btn-ghost text-[12px] h-8 px-2">
                  Cancel edit
                </button>
              )}
              <button onClick={handleContinue} className="btn-primary">
                Preview &amp; submit <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function ExtractedRow({ field, value, conf }: { field: string; value: string; conf: number }) {
  const tone = conf >= 85 ? "good" : conf >= 70 ? "warn" : "bad";
  return (
    <li className={cn(
      "flex items-center gap-3 rounded-lg border px-3 py-2",
      (tone === "warn" || tone === "bad") ? "border-warn/25 bg-warn/10" : "border-ink-200"
    )}>
      <span className="w-32 text-[12px] text-ink-500 shrink-0">{field}</span>
      <span className="flex-1 text-ink-900 font-medium">{value}</span>
      <Badge tone={tone}>{conf}%</Badge>
    </li>
  );
}

/* =================================================================== */
/* Bulk CSV workflow                                                    */
/* =================================================================== */

type BulkRow = {
  row: number;
  values: string[];
  status: "ok" | "warn" | "bad";
  reason?: string;
};

const INITIAL_BULK: { headers: string[]; rows: BulkRow[] } = {
  headers: ["Period", "Source", "Consumption", "Unit", "Cost (USD)"],
  rows: [
    { row: 1, values: ["Apr 2026", "Electricity",      "412,580", "kWh", "64,920"],  status: "ok" },
    { row: 2, values: ["Apr 2026", "District cooling", "84,200",  "kWh", "18,300"],  status: "ok" },
    { row: 3, values: ["Apr 2026", "Diesel",           "22.5",    "L",   "—"],       status: "warn", reason: "Cost missing" },
    { row: 4, values: ["Apr 2026", "Solar PV",         "-12,000", "kWh", "0"],       status: "bad",  reason: "Negative consumption" },
    { row: 5, values: ["Apr 2026", "Natural gas",      "9,200",   "m³",  "11,400"],  status: "ok" },
  ],
};

function BulkWorkflow({ cfg, onPreview }: { cfg: DataTypeConfig; onPreview: (r: CaptureResult) => void }) {
  const [uploaded, setUploaded] = useState(false);
  const [rows, setRows] = useState<BulkRow[]>(INITIAL_BULK.rows);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editBuf, setEditBuf] = useState<string[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState<string>("");

  useEffect(() => {
    listProperties().then((rows) => {
      setProperties(rows);
      if (rows[0]) setPropertyId(rows[0].id);
    });
  }, []);

  const validCount = rows.filter((r) => r.status === "ok").length;
  const errorCount = rows.filter((r) => r.status === "bad").length;
  const warnCount  = rows.filter((r) => r.status === "warn").length;

  function startEdit(r: BulkRow) {
    setEditingRow(r.row);
    setEditBuf([...r.values]);
  }

  function saveEdit(r: BulkRow) {
    setRows((prev) => prev.map((row) =>
      row.row === r.row
        ? { ...row, values: editBuf, status: "ok", reason: undefined }
        : row
    ));
    setEditingRow(null);
  }

  function handleContinue() {
    const property = properties.find((p) => p.id === propertyId);
    const displayRows = rows.map((r) => ({
      label: `Row ${r.row}`,
      value: r.values.join(" · "),
    }));
    onPreview({
      propertyId,
      propertyName: property?.name ?? "",
      currency: getCurrencyFromCountry(property?.country ?? null),
      values: {},
      files: [],
      anomalies: warnCount > 0 ? [`${warnCount} row(s) have warnings that the checker will review.`] : [],
      displayRows,
    });
  }

  return (
    <Card>
      <CardHeader title={`Bulk upload — ${cfg.label}`} hint="all rows pass or none commit" />
      <div className="p-5 space-y-3">
        <div className="flex flex-wrap gap-3">
          <Field label="Property" required>
            <select className="input max-w-xs" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        </div>

        <div className="flex flex-wrap gap-3">
          <select className="input max-w-xs">
            <option>{cfg.label} template</option>
          </select>
          <button className="btn-secondary">
            <FileSpreadsheet size={14} /> Download template
          </button>
          <button className="btn-primary ml-auto" onClick={() => setUploaded(true)}>
            <Upload size={14} /> Upload file
          </button>
        </div>

        {!uploaded ? (
          <div className="rounded-xl border-2 border-dashed border-ink-200 bg-ink-50 p-6 text-center">
            <FileSpreadsheet size={24} className="mx-auto text-ink-400" />
            <div className="text-sm font-semibold text-ink-700 mt-2">Upload your CSV or Excel file</div>
            <div className="text-[12px] text-ink-500">Header row must match system field names exactly.</div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 text-[13px] flex-wrap">
              <Badge tone="info">{rows.length} rows</Badge>
              <Badge tone="good">{validCount} valid</Badge>
              {warnCount > 0 && <Badge tone="warn">{warnCount} warnings</Badge>}
              {errorCount > 0 && <Badge tone="bad">{errorCount} blocking</Badge>}
              {errorCount > 0 && <span className="text-ink-500">Fix blocking errors to continue. Click a row to edit.</span>}
            </div>
            <div className="overflow-x-auto rounded-xl border border-ink-200">
              <table className="min-w-full">
                <thead className="bg-ink-50">
                  <tr>
                    <th className="table-th">Row</th>
                    {INITIAL_BULK.headers.map((h) => <th key={h} className="table-th">{h}</th>)}
                    <th className="table-th">Status</th>
                    <th className="table-th"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    editingRow === r.row ? (
                      <tr key={r.row} className="bg-brand-50/40">
                        <td className="table-td font-medium">{r.row}</td>
                        {editBuf.map((v, i) => (
                          <td key={i} className="table-td">
                            <input
                              className="input h-7 text-[12px] px-2"
                              value={v}
                              onChange={(e) => setEditBuf((b) => b.map((x, j) => j === i ? e.target.value : x))}
                            />
                          </td>
                        ))}
                        <td className="table-td">
                          <button onClick={() => saveEdit(r)} className="btn-primary h-7 px-2 text-[11px]">Save</button>
                        </td>
                        <td className="table-td">
                          <button onClick={() => setEditingRow(null)} className="btn-ghost h-7 px-2 text-[11px]">Cancel</button>
                        </td>
                      </tr>
                    ) : (
                      <tr
                        key={r.row}
                        className={cn(
                          r.status === "bad" && "bg-bad/10",
                          r.status === "warn" && "bg-warn/5"
                        )}
                      >
                        <td className="table-td font-medium">{r.row}</td>
                        {r.values.map((v, i) => <td key={i} className="table-td tabular-nums">{v}</td>)}
                        <td className="table-td">
                          {r.status === "ok"   && <Badge tone="good">Valid</Badge>}
                          {r.status === "warn" && <Badge tone="warn">Warn — {r.reason}</Badge>}
                          {r.status === "bad"  && <Badge tone="bad">Error — {r.reason}</Badge>}
                        </td>
                        <td className="table-td">
                          {(r.status === "bad" || r.status === "warn") && (
                            <button onClick={() => startEdit(r)} className="btn-ghost h-7 px-2 text-[11px]">
                              <Pencil size={11} /> Fix
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button className="btn-secondary" onClick={() => setUploaded(false)}>Discard</button>
              <button
                className="btn-primary"
                disabled={errorCount > 0}
                onClick={handleContinue}
              >
                Preview {validCount} rows <ArrowRight size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

/* =================================================================== */
/* QR workflow — mobile-first with enhanced fields                      */
/* =================================================================== */

function QrWorkflow({ cfg, onPreview }: { cfg: DataTypeConfig; onPreview: (r: CaptureResult) => void }) {
  const [stage, setStage] = useState<"scan" | "form" | "preview" | "submitted">("scan");
  const [stream, setStream] = useState<string>("organic");
  const [weight, setWeight] = useState("");
  const [photo, setPhoto] = useState(false);
  const [contaminated, setContaminated] = useState(false);
  const [notes, setNotes] = useState("");
  const [staffId, setStaffId] = useState("");
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState(0);
  const timestamp = useMemo(() => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }), []);

  function handleSubmitQr() {
    if (online) setStage("submitted");
    else { setQueue((q) => q + 1); setStage("submitted"); }
  }

  function handlePreviewContinue() {
    onPreview({
      propertyId: "",
      propertyName: "Skyline Dubai",
      currency: "USD",
      values: { stream, weight, staffId, notes, contaminated: contaminated ? "yes" : "no", timestamp },
      files: [],
      anomalies: [],
      displayRows: [
        { label: "Property", value: "Skyline Dubai" },
        { label: "Collection point", value: "Kitchen — Loading Bay" },
        { label: "Stream", value: stream },
        { label: "Weight", value: `${weight} kg` },
        { label: "Photo", value: photo ? "Attached" : "None" },
        { label: "Contaminated", value: contaminated ? "Yes — flagged" : "No" },
        { label: "Staff ID", value: staffId || "—" },
        { label: "Notes", value: notes || "—" },
        { label: "Timestamp", value: timestamp },
      ],
    });
  }

  return (
    <Card>
      <CardHeader
        title={`QR scan — ${cfg.label}`}
        hint="sub-30s mobile flow"
        right={
          <div className="flex items-center gap-2 text-[11px]">
            <button
              onClick={() => setOnline((v) => !v)}
              className={cn("chip rounded-full", online ? "bg-good/10 text-good" : "bg-warn/10 text-warn")}
            >
              {online ? <Wifi size={11} /> : <WifiOff size={11} />}
              {online ? "Online" : "Offline"}
            </button>
            {queue > 0 && <Badge tone="info">Queue: {queue}</Badge>}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 p-5">
        {/* Phone-style preview */}
        <div className="grid place-items-center">
          <div className="w-[280px] rounded-[24px] border-2 border-ink-300 bg-ink-50 p-3 shadow-pop">
            <div className="rounded-[16px] bg-white border border-ink-200 p-4 min-h-[520px]">
              {stage === "scan" && (
                <div className="text-center space-y-3">
                  <div className="text-[10px] uppercase tracking-wider text-ink-500">Step 1 of 4</div>
                  <h3 className="text-lg font-bold text-ink-900">Scan a QR</h3>
                  <p className="text-[12px] text-ink-500">Point at any waste collection QR. Works with gloves.</p>
                  <div className="w-32 h-32 mx-auto rounded-xl bg-ink-100 grid place-items-center text-ink-400">
                    <QrCode size={64} />
                  </div>
                  <button onClick={() => setStage("form")} className="btn-primary w-full">
                    <QrCode size={14} /> Simulate scan
                  </button>
                </div>
              )}

              {stage === "form" && (
                <div className="space-y-3">
                  <div className="text-[10px] uppercase tracking-wider text-ink-500">Step 2 of 4</div>
                  <div className="rounded-lg bg-brand-50 border border-brand-100 p-2 text-[12px] text-brand-800">
                    Skyline Dubai · Kitchen — Loading Bay
                  </div>
                  <div>
                    <div className="text-[12px] font-medium text-ink-700 mb-1">Stream</div>
                    <div className="grid grid-cols-2 gap-2">
                      {[{ v: "organic", l: "Organic" }, { v: "recyclable", l: "Recyclable" }, { v: "landfill", l: "Landfill" }, { v: "glass", l: "Glass" }].map((s) => (
                        <button
                          key={s.v}
                          onClick={() => setStream(s.v)}
                          className={cn(
                            "rounded-lg border py-2 text-sm font-medium",
                            stream === s.v ? "border-brand-500 bg-brand-50 text-brand-800 ring-1 ring-brand-500" : "border-ink-200 bg-white text-ink-700"
                          )}
                        >
                          {s.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[12px] font-medium text-ink-700 mb-1">Weight (kg)</div>
                    <input className="input text-lg" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => setPhoto((v) => !v)}
                      className={cn("w-full rounded-lg border py-2 text-sm flex items-center justify-center gap-2", photo ? "border-brand-500 bg-brand-50 text-brand-800" : "border-ink-200 text-ink-600")}
                    >
                      <Camera size={14} /> {photo ? "Photo attached" : "Attach photo (optional)"}
                    </button>
                    <button
                      onClick={() => setContaminated((v) => !v)}
                      className={cn("w-full rounded-lg border py-2 text-sm flex items-center justify-center gap-2", contaminated ? "border-bad/50 bg-bad/10 text-bad" : "border-ink-200 text-ink-600")}
                    >
                      <AlertTriangle size={14} /> {contaminated ? "Contaminated — flagged" : "Flag contamination"}
                    </button>
                  </div>
                  <div>
                    <div className="text-[12px] font-medium text-ink-700 mb-1">Staff ID (optional)</div>
                    <input className="input" value={staffId} onChange={(e) => setStaffId(e.target.value)} placeholder="e.g. EMP-042" />
                  </div>
                  <div>
                    <div className="text-[12px] font-medium text-ink-700 mb-1">Notes</div>
                    <textarea className="input text-[12px] min-h-[52px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anomaly or context…" />
                  </div>
                  <button onClick={() => setStage("preview")} className="btn-primary w-full" disabled={!weight}>
                    Preview <ArrowRight size={14} />
                  </button>
                </div>
              )}

              {stage === "preview" && (
                <div className="space-y-3">
                  <div className="text-[10px] uppercase tracking-wider text-ink-500">Step 3 of 4</div>
                  <h3 className="text-base font-bold text-ink-900">Preview &amp; submit</h3>
                  <div className="text-[10px] text-ink-400">{timestamp}</div>
                  <ul className="text-[13px] divide-y divide-ink-200 rounded-lg border border-ink-200">
                    <QrRow label="Property" value="Skyline Dubai" />
                    <QrRow label="Point" value="Kitchen — Loading Bay" />
                    <QrRow label="Stream" value={stream} />
                    <QrRow label="Weight" value={`${weight} kg`} />
                    {photo && <QrRow label="Photo" value="Attached" />}
                    {contaminated && <QrRow label="Contaminated" value="Yes — flagged" highlight />}
                    {staffId && <QrRow label="Staff ID" value={staffId} />}
                    {notes && <QrRow label="Notes" value={notes} />}
                  </ul>
                  <button onClick={handleSubmitQr} className="btn-primary w-full">Submit</button>
                </div>
              )}

              {stage === "submitted" && (
                <div className="space-y-3 text-center">
                  <div className="w-14 h-14 mx-auto rounded-full bg-good/10 grid place-items-center text-good">
                    <CheckCircle2 size={28} />
                  </div>
                  <div className="text-base font-bold text-ink-900">{online ? "Submitted" : "Queued"}</div>
                  <p className="text-[12px] text-ink-500">
                    {online
                      ? "Sent to the checker queue. You'll see it appear in Review & Approval."
                      : "We'll auto-sync as soon as you reconnect — your scan is safe."}
                  </p>
                  <button onClick={() => { setStage("scan"); setWeight(""); setPhoto(false); setContaminated(false); setNotes(""); setStaffId(""); }} className="btn-secondary w-full">
                    Scan another
                  </button>
                  <button onClick={handlePreviewContinue} className="btn-primary w-full">
                    View in preview <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right side — config */}
        <div>
          <div className="text-sm font-semibold text-ink-900 mb-2">Mobile flow</div>
          <ol className="space-y-2 text-sm text-ink-700">
            <li className="flex items-center gap-2"><Smartphone size={14} className="text-brand-700" /> Scan QR on phone — no app install.</li>
            <li className="flex items-center gap-2"><ClipboardEdit size={14} className="text-brand-700" /> Tap the stream — large gloved-hand-friendly buttons.</li>
            <li className="flex items-center gap-2"><Camera size={14} className="text-brand-700" /> Optional photo attachment per scan.</li>
            <li className="flex items-center gap-2"><AlertTriangle size={14} className="text-warn" /> Flag contamination — surfaces to checker automatically.</li>
            <li className="flex items-center gap-2"><UserCheck size={14} className="text-brand-700" /> Optional staff ID for traceability.</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-good" /> Auto-feeds waste dashboard + Cat 5 Scope 3.</li>
          </ol>
          <div className="mt-3 rounded-xl bg-brand-50 border border-brand-100 p-3 text-[12px] text-brand-800">
            Offline mode: entries queue locally and sync when network returns. Sync confirmation shown to staff.
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button className="btn-secondary"><QrCode size={14} /> Print QR sheet</button>
            <button className="btn-secondary"><Plus size={14} /> Add collection point</button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function QrRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <li className={cn("flex items-center justify-between gap-2 px-2 py-1.5", highlight && "bg-bad/10")}>
      <span className="text-[11px] text-ink-500">{label}</span>
      <span className={cn("font-medium capitalize", highlight ? "text-bad" : "text-ink-900")}>{value}</span>
    </li>
  );
}

/* =================================================================== */
/* API integrations                                                     */
/* =================================================================== */

const MOCK_FIELD_MAPPING: Record<string, { source: string; target: string; notes?: string }[]> = {
  opera: [
    { source: "opera.occupiedRooms",      target: "occupiedRoomNights", notes: "Daily roll-up to monthly" },
    { source: "opera.availableRooms",     target: "availableRooms" },
    { source: "opera.conferenceGuests",   target: "conferenceGuests" },
    { source: "opera.fbCovers",           target: "fbCovers" },
  ],
  workday: [
    { source: "workday.headcount.total",  target: "totalEmployees" },
    { source: "workday.headcount.fte",    target: "fte" },
    { source: "workday.training.hours",   target: "totalHours", notes: "Sum of all training events" },
    { source: "workday.incidents.lti",    target: "value", notes: "LTI count" },
  ],
};

const MOCK_SYNC_LOG = [
  { time: "Today 08:14", status: "ok",   records: 124, message: "Energy — 124 meter readings synced" },
  { time: "Today 06:12", status: "ok",   records: 31,  message: "Occupancy — monthly roll-up complete" },
  { time: "Yesterday",   status: "warn", records: 0,   message: "QuickBooks — authentication expired" },
  { time: "Yesterday",   status: "ok",   records: 18,  message: "Hauler API — 18 weight tickets" },
];

function ApiWorkflow({ cfg }: { cfg: DataTypeConfig }) {
  const [expandedMapping, setExpandedMapping] = useState<string | null>(null);

  const relevant = INTEGRATIONS.filter((i) => {
    if (cfg.key === "energy" || cfg.key === "water") return ["weather", "bms", "accounting"].includes(i.category);
    if (cfg.key === "occupancy") return i.category === "pms";
    if (cfg.key === "procurement" || cfg.key === "travel-commute") return i.category === "accounting";
    if (cfg.key === "social") return i.category === "hr";
    if (cfg.key === "waste") return ["hauler", "food"].includes(i.category);
    return true;
  });

  return (
    <Card>
      <CardHeader title={`API integrations — ${cfg.label}`} hint="last sync · field mapping" />
      <div className="p-5 space-y-3">
        {relevant.map((i) => {
          const tone = STATUS_TONE[i.status];
          const mapping = MOCK_FIELD_MAPPING[i.key];
          const isExpanded = expandedMapping === i.key;
          return (
            <div key={i.key} className="rounded-xl border border-ink-200">
              <div className="p-3 flex items-start gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg grid place-items-center shrink-0",
                  i.status === "active" ? "bg-good/10 text-good" : i.status === "configured" ? "bg-info/10 text-info" : i.status === "action-needed" ? "bg-warn/10 text-warn" : "bg-ink-100 text-ink-500"
                )}>
                  <Plug size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-ink-900 truncate">{i.name}</div>
                    <Badge tone={tone}>{STATUS_TEXT[i.status]}</Badge>
                  </div>
                  <div className="text-[12px] text-ink-500 truncate">{i.scope}</div>
                  {i.lastSync && <div className="text-[11px] text-ink-500 mt-1">Last sync · {i.lastSync}</div>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {i.status === "not-configured" || i.status === "optional" ? (
                      <button className="btn-secondary h-7 px-2 text-[11px]">Connect</button>
                    ) : (
                      <>
                        <button
                          onClick={() => setExpandedMapping(isExpanded ? null : i.key)}
                          className="btn-secondary h-7 px-2 text-[11px]"
                        >
                          {isExpanded ? "Hide mapping" : "Field mapping"}
                        </button>
                        <button className="btn-secondary h-7 px-2 text-[11px]">Test connection</button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {isExpanded && mapping && (
                <div className="border-t border-ink-200 px-4 py-3">
                  <div className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide mb-2">Field mapping</div>
                  <table className="min-w-full text-[12px]">
                    <thead>
                      <tr className="text-left text-ink-400">
                        <th className="pb-1 pr-4 font-medium">Source field</th>
                        <th className="pb-1 pr-4 font-medium">Target field</th>
                        <th className="pb-1 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                      {mapping.map((m, idx) => (
                        <tr key={idx}>
                          <td className="py-1 pr-4 font-mono text-ink-700">{m.source}</td>
                          <td className="py-1 pr-4 font-mono text-brand-700">{m.target}</td>
                          <td className="py-1 text-ink-500">{m.notes ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-5 pb-5 space-y-3">
        <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 flex items-start gap-2 text-[12px] text-brand-900">
          <Info size={14} className="text-brand-700 mt-0.5" />
          <span>All API responses are pre-populated into the standard form for the maker to review. Nothing commits without explicit submission.</span>
        </div>

        <div>
          <div className="text-[12px] font-semibold text-ink-700 uppercase tracking-wide mb-2">Recent sync log</div>
          <div className="rounded-xl border border-ink-200 divide-y divide-ink-100">
            {MOCK_SYNC_LOG.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-3 px-3 py-2 text-[12px]">
                <span className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  entry.status === "ok" ? "bg-good" : "bg-warn"
                )} />
                <span className="text-ink-400 w-24 shrink-0">{entry.time}</span>
                <span className="flex-1 text-ink-700">{entry.message}</span>
                {entry.records > 0 && <Badge tone={entry.status === "ok" ? "good" : "warn"}>{entry.records}</Badge>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

/* =================================================================== */
/* Survey workflow                                                      */
/* =================================================================== */

const SAMPLE_SURVEYS = [
  { id: "s-1", name: "Employee commute — Cat 7",           audience: "Employees", sent: 412,  responses: 284, deadline: "15 May 2026", status: "open" as const },
  { id: "s-2", name: "Supplier sustainability attestation", audience: "Suppliers", sent: 120,  responses: 68,  deadline: "31 May 2026", status: "open" as const },
  { id: "s-3", name: "Guest opt-in feedback (Q1)",         audience: "Guests",    sent: 2840, responses: 724, deadline: "Closed 30 Apr", status: "closed" as const },
];

function SurveyWorkflow({ cfg }: { cfg: DataTypeConfig }) {
  const [createMode, setCreateMode] = useState(false);
  return (
    <Card>
      <CardHeader
        title={`Surveys — ${cfg.label}`}
        hint="supplier · employee · guest · manager"
        right={
          <button onClick={() => setCreateMode((v) => !v)} className="btn-primary">
            <Plus size={14} /> {createMode ? "Cancel" : "New campaign"}
          </button>
        }
      />


      {createMode && (
        <div className="p-5 grid grid-cols-2 gap-4">
          <Field label="Campaign name" required><input className="input" placeholder="e.g. Q3 Supplier sustainability survey" /></Field>
          <Field label="Audience" required>
            <select className="input">
              <option>Suppliers</option>
              <option>Employees (commute)</option>
              <option>Employees (general / social)</option>
              <option>Managers</option>
              <option>Guests (opt-in)</option>
            </select>
          </Field>
          <Field label="Deadline" required><input className="input" type="date" /></Field>
          <Field label="Reminder cadence">
            <select className="input">
              <option>None</option>
              <option>Day 7</option>
              <option>Day 7, 14</option>
              <option>Day 7, 14, 21</option>
            </select>
          </Field>
          <label className="block col-span-2">
            <span className="text-[12px] font-medium text-ink-600">Recipients (CSV / paste / pick from supplier book)</span>
            <textarea className="input min-h-[80px] py-2" placeholder="emails, one per line" />
          </label>
          <div className="col-span-2 rounded-xl bg-brand-50 border border-brand-100 p-3 text-[12px] text-brand-800">
            Responses pre-populate the relevant entry form for Checker review before they commit.
          </div>
          <div className="col-span-2 flex justify-end gap-2">
            <button onClick={() => setCreateMode(false)} className="btn-secondary">Cancel</button>
            <button className="btn-primary">Send invitations</button>
          </div>
        </div>
      )}
      {!createMode && (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Campaign</th>
                <th className="table-th">Audience</th>
                <th className="table-th">Sent</th>
                <th className="table-th">Responses</th>
                <th className="table-th">Deadline</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_SURVEYS.map((s) => {
                const pct = Math.round((s.responses / s.sent) * 100);
                return (
                  <tr key={s.id}>
                    <td className="table-td font-medium">{s.name}</td>
                    <td className="table-td">{s.audience}</td>
                    <td className="table-td tabular-nums">{s.sent}</td>
                    <td className="table-td tabular-nums">{s.responses} ({pct}%)</td>
                    <td className="table-td">{s.deadline}</td>
                    <td className="table-td">
                      <Badge tone={s.status === "open" ? "warn" : "good"}>{s.status}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* =================================================================== */
/* AI Assist workflow — 4 phases: upload → analyzing → questions → extraction */
/* =================================================================== */

type AiPhase = "upload" | "analyzing" | "questions" | "extraction";

const ANALYSIS_STEPS = [
  "Reading file structure…",
  "Detecting data type and format…",
  "Extracting consumption values…",
  "Cross-referencing emission factors…",
  "Running anomaly checks…",
  "Preparing field mapping…",
];

type QaPair = { question: string; chips: string[]; key: string };

const AI_QUESTIONS: Record<string, QaPair[]> = {
  energy: [
    { key: "meter",  question: "Which meter does this bill cover?",                              chips: ["Main electricity meter", "Diesel generator", "District cooling", "Natural gas", "Solar PV"] },
    { key: "period", question: "Does Apr 2026 look correct as the billing period?",              chips: ["Yes, Apr 2026", "No — let me correct it", "Covers multiple months"] },
  ],
  water: [
    { key: "source", question: "What is the water source for this bill?",                        chips: ["Municipal supply", "Borewell / well water", "Recycled / greywater", "Rainwater harvested"] },
    { key: "period", question: "Is Apr 2026 the correct billing period?",                        chips: ["Yes, Apr 2026", "No — I'll update it", "Bi-monthly bill"] },
  ],
  waste: [
    { key: "streams", question: "Which waste streams does this report cover?",                   chips: ["Organic / food", "Mixed recyclable", "Landfill", "Glass", "Hazardous", "All streams"] },
    { key: "period",  question: "Is the collection period Apr 2026?",                            chips: ["Yes, Apr 2026", "No — different period", "Weekly data"] },
  ],
  procurement: [
    { key: "category", question: "Which Scope 3 category does this invoice fall under?",        chips: ["Cat 1 — Purchased goods & services", "Cat 2 — Capital goods", "Cat 4 — Upstream transport"] },
    { key: "period",   question: "Is Apr 2026 the invoice date / period?",                      chips: ["Yes, Apr 2026", "No — different date", "Quarterly invoice"] },
  ],
  "travel-commute": [
    { key: "category", question: "Is this business travel or employee commute data?",           chips: ["Business travel (Cat 6)", "Employee commute (Cat 7)", "Both"] },
    { key: "period",   question: "Does Apr 2026 look correct as the report period?",            chips: ["Yes, Apr 2026", "No — different period"] },
  ],
  social: [
    { key: "subtype", question: "What kind of social data does this report contain?",           chips: ["Headcount / HR", "Training records", "H&S incidents", "Community engagement"] },
    { key: "period",  question: "Is Apr 2026 the correct period for this report?",              chips: ["Yes, Apr 2026", "No — different period"] },
  ],
  generic: [
    { key: "period",  question: "Does the extracted period — Apr 2026 — look correct?",        chips: ["Yes, confirmed", "No — I'll correct it", "Not sure"] },
    { key: "confirm", question: "Should I proceed with these extracted values?",                chips: ["Yes — looks right", "I want to review first"] },
  ],
};

type AiExtractedField = { key: string; label: string; value: string; conf: "high" | "medium" | "low"; reasoning: string };

const AI_EXTRACTED: Record<string, AiExtractedField[]> = {
  energy: [
    { key: "sourceType",  label: "Source type",      value: "Electricity — grid",      conf: "high",   reasoning: "Header: 'EmiratesGreen Power Co.' — grid electricity provider" },
    { key: "period",      label: "Billing period",   value: "2026-04",                 conf: "high",   reasoning: "Invoice date field: '1 April 2026 – 30 April 2026'" },
    { key: "consumption", label: "Consumption",      value: "412580",                  conf: "high",   reasoning: "Line item 'Total kWh': 412,580 — confirmed by tariff calculation" },
    { key: "unit",        label: "Unit",             value: "kWh",                     conf: "high",   reasoning: "Unit column consistently 'kWh' throughout document" },
    { key: "cost",        label: "Cost",             value: "64920",                   conf: "medium", reasoning: "Total due field — currency matched from property country (UAE → AED)" },
    { key: "meterId",     label: "Meter ID",         value: "ELEC-MAIN-01",            conf: "medium", reasoning: "Partially obscured text. Extracted: 'ELEC-MA*N-01'" },
    { key: "invoiceRef",  label: "Invoice reference", value: "INV-2026-04-0082",       conf: "low",    reasoning: "Barcode decoded — verify against physical invoice" },
  ],
  water: [
    { key: "sourceType",  label: "Source type",      value: "Municipal supply",        conf: "high",   reasoning: "Letterhead: 'Dubai Municipality Water Authority'" },
    { key: "period",      label: "Billing period",   value: "2026-04",                 conf: "high",   reasoning: "Billing period explicitly stated on page 1" },
    { key: "consumption", label: "Consumption",      value: "1840",                    conf: "high",   reasoning: "Total m³ field found at bottom of bill" },
    { key: "unit",        label: "Unit",             value: "m³",                      conf: "high",   reasoning: "Unit column header: m³" },
    { key: "cost",        label: "Cost",             value: "3680",                    conf: "medium", reasoning: "Total due field extracted — verify currency" },
    { key: "invoiceRef",  label: "Invoice reference", value: "WTR-2026-04-019",        conf: "medium", reasoning: "Reference number partially legible on top-right" },
  ],
  waste: [
    { key: "stream",        label: "Waste stream",   value: "Organic / food",          conf: "high",   reasoning: "Report header: 'Organic waste collection log — Kitchen'" },
    { key: "date",          label: "Collection date", value: "2026-04-30",             conf: "high",   reasoning: "Report end date field" },
    { key: "quantity",      label: "Quantity",        value: "2840",                   conf: "high",   reasoning: "Total column sum: 2,840 kg across 28 collection days" },
    { key: "unit",          label: "Unit",            value: "kg",                     conf: "high",   reasoning: "Column header: 'Weight (kg)'" },
    { key: "disposalRoute", label: "Disposal route",  value: "Composted",              conf: "medium", reasoning: "Contractor field: 'GreenCycle Composting Ltd'" },
    { key: "contractor",    label: "Contractor",      value: "GreenCycle Composting Ltd", conf: "high", reasoning: "Company name on report letterhead" },
  ],
  procurement: [
    { key: "category",    label: "Scope 3 category",  value: "Cat 1 — Purchased goods & services", conf: "high",   reasoning: "Invoice type: standard goods purchase from supplier" },
    { key: "vendor",      label: "Vendor",             value: "FreshFoods Distribution Ltd",         conf: "high",   reasoning: "Supplier name on invoice header" },
    { key: "description", label: "Description",        value: "Monthly food & beverage supplies",    conf: "high",   reasoning: "Line item description field" },
    { key: "amount",      label: "Amount",             value: "28400",                               conf: "high",   reasoning: "Invoice total extracted" },
    { key: "unit",        label: "Currency",           value: "USD",                                 conf: "medium", reasoning: "Currency symbol '$' found — assumed USD" },
    { key: "invoiceRef",  label: "Invoice reference",  value: "FF-2026-04-0112",                    conf: "medium", reasoning: "Invoice number partially obscured" },
  ],
  "travel-commute": [
    { key: "category",  label: "Category",    value: "Cat 6 — Business travel",  conf: "high",   reasoning: "Document title: 'Business Travel Expense Report'" },
    { key: "mode",      label: "Mode",        value: "Air — long-haul",          conf: "medium", reasoning: "Airline references found — haul classification inferred from route codes" },
    { key: "period",    label: "Period",      value: "2026-04",                  conf: "high",   reasoning: "Report period stated in header" },
    { key: "distance",  label: "Distance",    value: "24800",                    conf: "low",    reasoning: "Sum of route distances — verify against booking system" },
    { key: "unit",      label: "Unit",        value: "pkm",                      conf: "medium", reasoning: "Passenger-km assumed from person × km data" },
  ],
  social: [
    { key: "subType",   label: "Sub-type",    value: "Headcount snapshot",       conf: "high",   reasoning: "Report title: 'Monthly HR Headcount Report'" },
    { key: "period",    label: "Period",      value: "2026-04",                  conf: "high",   reasoning: "Report date field" },
    { key: "value",     label: "Value",       value: "248",                      conf: "high",   reasoning: "Total headcount figure on summary page" },
    { key: "unit",      label: "Unit",        value: "count",                    conf: "high",   reasoning: "Headcount is a count" },
    { key: "breakdown", label: "Breakdown",   value: "FTE: 198, PTE: 50",        conf: "medium", reasoning: "Sub-totals found on page 2 — verify against HR system" },
  ],
  generic: [
    { key: "period",      label: "Period",      value: "2026-04",                conf: "high",   reasoning: "Date extracted from document header" },
    { key: "value",       label: "Value",       value: "",                       conf: "low",    reasoning: "Multiple numeric fields found — please enter the correct value" },
    { key: "description", label: "Description", value: "Extracted from uploaded document", conf: "medium", reasoning: "AI summarised document content" },
  ],
};

function AiAssistWorkflow({
  cfg, onPreview,
}: {
  cfg: DataTypeConfig;
  onPreview: (r: CaptureResult) => void;
}) {
  const [phase, setPhase]               = useState<AiPhase>("upload");
  const [file, setFile]                 = useState<File | null>(null);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [qaAnswers, setQaAnswers]       = useState<Record<string, string>>({});
  const [qaIdx, setQaIdx]               = useState(0);
  const [editValues, setEditValues]     = useState<Record<string, string>>({});
  const [properties, setProperties]     = useState<Property[]>([]);
  const [propertyId, setPropertyId]     = useState<string>("");
  const dropRef                         = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listProperties().then((rows) => {
      setProperties(rows);
      if (rows[0]) setPropertyId(rows[0].id);
    });
  }, []);

  const questions = AI_QUESTIONS[cfg.key] ?? AI_QUESTIONS["generic"];
  const extracted = AI_EXTRACTED[cfg.key] ?? AI_EXTRACTED["generic"];

  useEffect(() => {
    if (phase === "extraction") {
      const initial: Record<string, string> = {};
      for (const f of extracted) initial[f.key] = f.value;
      setEditValues(initial);
    }
  }, [phase]);

  function startAnalysis(f: File) {
    setFile(f);
    setPhase("analyzing");
    setAnalysisStep(0);
    ANALYSIS_STEPS.forEach((_, idx) => {
      setTimeout(() => {
        setAnalysisStep(idx + 1);
        if (idx === ANALYSIS_STEPS.length - 1) {
          setTimeout(() => { setPhase("questions"); setQaIdx(0); }, 600);
        }
      }, (idx + 1) * 700);
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) startAnalysis(dropped);
  }

  function answerQuestion(key: string, answer: string) {
    setQaAnswers((prev) => ({ ...prev, [key]: answer }));
    if (qaIdx < questions.length - 1) {
      setQaIdx((i) => i + 1);
    } else {
      setPhase("extraction");
    }
  }

  function handleReset() {
    setPhase("upload");
    setFile(null);
    setAnalysisStep(0);
    setQaAnswers({});
    setQaIdx(0);
    setEditValues({});
  }

  function handleUseData() {
    const property = properties.find((p) => p.id === propertyId);
    const displayRows = extracted.map((f) => ({
      label: f.label,
      value: editValues[f.key] ?? f.value,
    }));
    const lowConfFields = extracted.filter((f) => f.conf !== "high").map((f) => f.label);
    const anomalies = lowConfFields.length > 0
      ? [`AI confidence was medium/low on: ${lowConfFields.join(", ")}. Please verify these values.`]
      : [];
    onPreview({
      propertyId,
      propertyName: property?.name ?? "",
      currency: getCurrencyFromCountry(property?.country ?? null),
      values: editValues,
      files: file ? [file] : [],
      anomalies,
      displayRows,
    });
  }

  return (
    <Card>
      <CardHeader
        title={`AI Assist — ${cfg.label}`}
        hint="Drop a file · AI extracts · you review"
        right={
          phase !== "upload" ? (
            <button onClick={handleReset} className="btn-ghost h-7 px-2 text-[12px]">
              <X size={12} /> Start over
            </button>
          ) : undefined
        }
      />

      {/* ── Phase 1: Upload ── */}
      {phase === "upload" && (
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-2 rounded-xl bg-brand-50 border border-brand-100 p-3 text-[12px] text-brand-900">
            <Sparkles size={14} className="text-brand-700 mt-0.5 shrink-0" />
            <span>
              Drop any raw file — a PDF bill, Excel report, scanned invoice, or image receipt.
              AI reads it, extracts relevant fields, asks a couple of clarifying questions,
              and prepares a preview for your approval.{" "}
              <strong>Nothing is committed without your review.</strong>
            </span>
          </div>

          <div
            ref={dropRef}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".pdf,.xlsx,.xls,.csv,.doc,.docx,.jpg,.jpeg,.png";
              input.onchange = () => { if (input.files?.[0]) startAnalysis(input.files[0]); };
              input.click();
            }}
            className="rounded-xl border-2 border-dashed border-brand-200 bg-brand-50/40 p-10 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors"
          >
            <Sparkles size={32} className="mx-auto text-brand-400 mb-3" />
            <div className="text-sm font-semibold text-ink-700">Drop your file here</div>
            <div className="text-[12px] text-ink-500 mt-1">or click to browse</div>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {[
                { icon: <ScanLine size={12} />, label: "PDF bill" },
                { icon: <FileSpreadsheet size={12} />, label: "Excel / CSV" },
                { icon: <ScanLine size={12} />, label: "Scanned invoice" },
                { icon: <ClipboardEdit size={12} />, label: "Word report" },
                { icon: <ImageIcon size={12} />, label: "Image / receipt" },
              ].map((fmt) => (
                <span
                  key={fmt.label}
                  className="chip inline-flex items-center gap-1 rounded-full bg-white border border-ink-200 text-ink-600 text-[11px] px-2 py-1"
                >
                  {fmt.icon} {fmt.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Phase 2: Analyzing ── */}
      {phase === "analyzing" && (
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-[13px] text-ink-600">
            <Sparkles size={16} className="text-brand-600 shrink-0" />
            <span>Analysing <strong className="text-ink-900">{file?.name}</strong>…</span>
          </div>

          <div className="space-y-1.5">
            {ANALYSIS_STEPS.map((step, idx) => {
              const done   = analysisStep > idx + 1;
              const active = analysisStep === idx + 1;
              return (
                <div
                  key={step}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all",
                    done   && "text-good",
                    active && "bg-brand-50 border border-brand-100 text-brand-700 font-medium",
                    !done && !active && "text-ink-400"
                  )}
                >
                  {done
                    ? <CheckCircle2 size={14} className="shrink-0 text-good" />
                    : active
                      ? <Loader2 size={14} className="shrink-0 animate-spin text-brand-600" />
                      : <span className="w-3.5 h-3.5 rounded-full border border-ink-300 shrink-0" />
                  }
                  {step}
                </div>
              );
            })}
          </div>

          <div className="rounded-xl bg-ink-50 border border-ink-200 p-3 text-[12px] text-ink-500">
            Processing is on-platform. Your file is not sent to any external service.
          </div>
        </div>
      )}

      {/* ── Phase 3: Chat-style Q&A ── */}
      {phase === "questions" && (
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-[12px] text-ink-500">
            <CheckCircle2 size={13} className="text-good shrink-0" />
            <span>File analysed — <strong className="text-ink-700">{file?.name}</strong></span>
          </div>

          <div className="space-y-5 max-w-lg">
            {questions.slice(0, qaIdx + 1).map((qa, idx) => (
              <div key={qa.key} className="space-y-2">
                {/* AI bubble */}
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-brand-100 grid place-items-center shrink-0 mt-0.5">
                    <Sparkles size={13} className="text-brand-700" />
                  </div>
                  <div className="bg-ink-50 border border-ink-200 rounded-xl rounded-tl-none px-3 py-2 text-[13px] text-ink-800 leading-snug">
                    {qa.question}
                  </div>
                </div>

                {/* User reply (answered) or chip options (current) */}
                {qaAnswers[qa.key] ? (
                  <div className="flex justify-end">
                    <div className="bg-brand-700 text-white rounded-xl rounded-tr-none px-3 py-1.5 text-[13px] max-w-xs">
                      {qaAnswers[qa.key]}
                    </div>
                  </div>
                ) : idx === qaIdx ? (
                  <div className="flex flex-wrap gap-2 pl-9">
                    {qa.chips.map((chip) => (
                      <button
                        key={chip}
                        onClick={() => answerQuestion(qa.key, chip)}
                        className="chip rounded-full bg-white border border-brand-200 text-brand-700 hover:bg-brand-50 hover:border-brand-400 text-[12px] px-3 py-1.5 transition-colors"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Phase 4: Extraction table ── */}
      {phase === "extraction" && (
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[12px] text-ink-500">
              <CheckCircle2 size={13} className="text-good shrink-0" />
              <span>Extraction complete — review and edit before continuing</span>
            </div>
            <Field label="Property" required>
              <select
                className="input max-w-xs"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="rounded-xl border border-ink-200 overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-ink-50">
                <tr>
                  <th className="table-th">Field</th>
                  <th className="table-th">Extracted value</th>
                  <th className="table-th">Confidence</th>
                  <th className="table-th">AI reasoning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {extracted.map((f) => (
                  <tr
                    key={f.key}
                    className={cn(
                      f.conf === "low"    && "bg-bad/5",
                      f.conf === "medium" && "bg-warn/5"
                    )}
                  >
                    <td className="table-td font-medium text-ink-800">{f.label}</td>
                    <td className="table-td">
                      {f.conf === "high" ? (
                        <span className="font-medium text-ink-900">{editValues[f.key] ?? f.value}</span>
                      ) : (
                        <input
                          className={cn(
                            "input h-7 text-[12px] px-2 max-w-[180px]",
                            f.conf === "low" ? "border-bad/40 bg-bad/5" : "border-warn/40 bg-warn/5"
                          )}
                          value={editValues[f.key] ?? f.value}
                          onChange={(e) => setEditValues((v) => ({ ...v, [f.key]: e.target.value }))}
                        />
                      )}
                    </td>
                    <td className="table-td">
                      <Badge tone={f.conf === "high" ? "good" : f.conf === "medium" ? "warn" : "bad"}>
                        {f.conf === "high" ? "High" : f.conf === "medium" ? "Medium — verify" : "Low — edit"}
                      </Badge>
                    </td>
                    <td className="table-td text-[11px] text-ink-500 max-w-[220px] leading-snug">
                      {f.reasoning}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-brand-50 border border-brand-100 p-3 text-[12px] text-brand-900">
            <Sparkles size={13} className="text-brand-700 shrink-0" />
            Medium and low confidence fields are editable above. All fields can be updated in the preview step before submission.
          </div>

          <div className="flex items-center justify-end gap-2">
            <button onClick={handleUseData} className="btn-primary">
              Use this data <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
