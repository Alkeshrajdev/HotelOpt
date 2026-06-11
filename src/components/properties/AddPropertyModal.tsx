import { useState } from "react";
import {
  Building2,
  Cloud,
  Droplet,
  MapPin,
  Recycle,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Thermometer,
  Users as UsersIcon,
  Zap,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import {
  CERTIFICATIONS,
  CURRENCIES,
  LAUNDRY_TYPES,
  OPERATION_TYPES,
  OWNERSHIP_TYPES,
  REGIONS,
  TIMEZONES,
  type CertificationProgramme,
  type LaundryType,
  type OperationType,
  type OwnershipType,
} from "@/lib/propertiesData";
import type { PillarKey } from "@/pages/performance/Shell";
import { cn } from "@/lib/utils";

const PILLARS: { key: PillarKey; label: string; icon: any }[] = [
  { key: "energy",     label: "Energy",     icon: Zap },
  { key: "water",      label: "Water",      icon: Droplet },
  { key: "waste",      label: "Waste",      icon: Recycle },
  { key: "carbon",     label: "Carbon",     icon: Cloud },
  { key: "social",     label: "Social",     icon: UsersIcon },
  { key: "governance", label: "Governance", icon: ShieldCheck },
];

type Form = {
  name: string;
  brand: string;
  client: string;
  region: string;
  country: string;
  city: string;
  address: string;
  latitude: string;
  longitude: string;
  timezone: string;
  currency: string;
  starRating: number;
  rooms: string;
  gfa: string;
  buildingYear: string;
  fbOutlets: string;
  fbCoversAnnual: string;
  laundryType: LaundryType;
  poolCount: string;
  spaCount: string;
  operationType: OperationType;
  ownership: OwnershipType;
  baselineYear: string;
  reportingYear: string;
  enabledPillars: PillarKey[];
  certifications: CertificationProgramme[];
  poolEligible: boolean;
};

type Errors = Partial<Record<keyof Form, string>>;

const INITIAL: Form = {
  name: "",
  brand: "Hotel Optimizer",
  client: "Direct SaaS",
  region: "APAC",
  country: "",
  city: "",
  address: "",
  latitude: "",
  longitude: "",
  timezone: "Asia/Singapore",
  currency: "USD",
  starRating: 4,
  rooms: "",
  gfa: "",
  buildingYear: "",
  fbOutlets: "1",
  fbCoversAnnual: "",
  laundryType: "outsourced",
  poolCount: "0",
  spaCount: "0",
  operationType: "full-service",
  ownership: "managed",
  baselineYear: String(new Date().getFullYear() - 1),
  reportingYear: String(new Date().getFullYear()),
  enabledPillars: ["energy", "water", "waste", "carbon", "social", "governance"],
  certifications: [],
  poolEligible: true,
};

function validateStep(step: 1 | 2 | 3 | 4, form: Form): Errors {
  const errors: Errors = {};
  const currentYear = new Date().getFullYear();

  if (step === 1) {
    if (!form.name.trim())   errors.name   = "Property name is required";
    if (!form.client.trim()) errors.client = "Portfolio / client is required";
    if (!form.country.trim()) errors.country = "Country is required";
    if (!form.city.trim())    errors.city   = "City is required";
    if (!form.latitude.trim()) {
      errors.latitude = "Latitude is required";
    } else {
      const lat = parseFloat(form.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) errors.latitude = "Must be between −90 and 90";
    }
    if (!form.longitude.trim()) {
      errors.longitude = "Longitude is required";
    } else {
      const lng = parseFloat(form.longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) errors.longitude = "Must be between −180 and 180";
    }
  }

  if (step === 2) {
    if (!form.rooms.trim()) {
      errors.rooms = "Room count is required";
    } else if (!/^\d+$/.test(form.rooms) || parseInt(form.rooms) <= 0) {
      errors.rooms = "Must be a positive whole number";
    }
    if (!form.gfa.trim()) {
      errors.gfa = "GFA (m²) is required";
    } else if (isNaN(parseFloat(form.gfa)) || parseFloat(form.gfa) <= 0) {
      errors.gfa = "Must be a positive number";
    }
  }

  if (step === 4) {
    if (form.enabledPillars.length === 0) {
      errors.enabledPillars = "At least one pillar must be enabled";
    }
    if (!form.baselineYear.trim()) {
      errors.baselineYear = "Baseline year is required";
    } else {
      const by = parseInt(form.baselineYear);
      if (isNaN(by)) {
        errors.baselineYear = "Must be a valid year";
      } else if (by > currentYear) {
        errors.baselineYear = "Baseline year cannot be in the future";
      } else if (by < currentYear - 10) {
        errors.baselineYear = `Cannot be more than 10 years ago (min ${currentYear - 10})`;
      }
    }
    if (!form.reportingYear.trim()) {
      errors.reportingYear = "Reporting year is required";
    } else {
      const ry = parseInt(form.reportingYear);
      if (isNaN(ry) || ry > currentYear + 1) {
        errors.reportingYear = "Cannot be more than 1 year ahead";
      }
    }
  }

  return errors;
}

function deriveClimateZone(lat: string): string {
  if (!lat.trim()) return "Enter GPS coordinates above to auto-derive";
  const n = parseFloat(lat);
  if (isNaN(n)) return "Invalid latitude";
  const abs = Math.abs(n);
  if (abs <= 23.5) return "Tropical (Af/Am/Aw) · Koppen — used for CDD/HDD normalisation";
  if (abs <= 35)   return "Subtropical (Bs/Bw) · Koppen — used for CDD/HDD normalisation";
  if (abs <= 55)   return "Temperate (Cf/Cw/Cs) · Koppen — used for CDD/HDD normalisation";
  if (abs <= 70)   return "Continental (Df/Dw) · Koppen — used for CDD/HDD normalisation";
  return "Polar (E) · Koppen — used for CDD/HDD normalisation";
}

export default function AddPropertyModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit?: (data: Form) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<Form>(INITIAL);
  const [errors, setErrors] = useState<Errors>({});

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const togglePillar = (k: PillarKey) => {
    setForm((f) => ({
      ...f,
      enabledPillars: f.enabledPillars.includes(k)
        ? f.enabledPillars.filter((x) => x !== k)
        : [...f.enabledPillars, k],
    }));
    if (errors.enabledPillars) setErrors((e) => ({ ...e, enabledPillars: undefined }));
  };

  const toggleCert = (k: CertificationProgramme) =>
    setForm((f) => ({
      ...f,
      certifications: f.certifications.includes(k)
        ? f.certifications.filter((x) => x !== k)
        : [...f.certifications, k],
    }));

  function reset() {
    setForm(INITIAL);
    setErrors({});
    setStep(1);
  }

  function handleContinue() {
    const stepErrors = validateStep(step, form);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
  }

  function handleSubmit() {
    const stepErrors = validateStep(4, form);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    onSubmit?.(form);
    reset();
    onClose();
  }

  const STEPS = [
    { n: 1 as const, title: "Identity & location",   icon: MapPin },
    { n: 2 as const, title: "Physical attributes",   icon: Building2 },
    { n: 3 as const, title: "Operations",            icon: SettingsIcon },
    { n: 4 as const, title: "Reporting & pillars",   icon: Sparkles },
  ];

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="Add property"
      subtitle="Configure a new hotel property — every field here drives downstream calculations."
      size="xl"
      tabs={
        <div className="flex flex-wrap items-center gap-1">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isActive = s.n === step;
            const isDone = s.n < step;
            return (
              <button
                key={s.n}
                onClick={() => setStep(s.n)}
                className={cn("tab", isActive && "tab-active", isDone && "text-good")}
              >
                <span className={cn(
                  "w-5 h-5 rounded-full grid place-items-center text-[10px] font-bold",
                  isActive ? "bg-brand-700 text-white" : isDone ? "bg-good text-white" : "bg-ink-100 text-ink-500"
                )}>
                  {s.n}
                </span>
                <Icon size={13} />
                {s.title}
              </button>
            );
          })}
        </div>
      }
      footer={
        <>
          <button className="btn-secondary" onClick={() => { reset(); onClose(); }}>Cancel</button>
          {step > 1 && (
            <button className="btn-secondary" onClick={() => { setErrors({}); setStep((s) => (s - 1) as any); }}>
              Back
            </button>
          )}
          {step < 4 ? (
            <button className="btn-primary" onClick={handleContinue}>Continue</button>
          ) : (
            <button className="btn-primary" onClick={handleSubmit}>Add property</button>
          )}
        </>
      }
    >
      {step === 1 && (
        <Section title="Identity & location" hint="Used for branding, climate normalisation (CDD/HDD by GPS), and pool isolation per BRD §2.3">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Property name" required error={errors.name}>
              <input className={cn("input", errors.name && "border-bad ring-1 ring-bad/25")} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Skyline Dubai" />
            </Field>
            <Field label="Brand">
              <input className="input" value={form.brand} onChange={(e) => set("brand", e.target.value)} />
            </Field>
            <Field label="Portfolio / client" required error={errors.client}>
              <input className={cn("input", errors.client && "border-bad ring-1 ring-bad/25")} value={form.client} onChange={(e) => set("client", e.target.value)} />
            </Field>
            <Field label="Region">
              <select className="input" value={form.region} onChange={(e) => set("region", e.target.value)}>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Country" required error={errors.country}>
              <input className={cn("input", errors.country && "border-bad ring-1 ring-bad/25")} value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="e.g. Indonesia" />
            </Field>
            <Field label="City" required error={errors.city}>
              <input className={cn("input", errors.city && "border-bad ring-1 ring-bad/25")} value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Bali" />
            </Field>
            <Field label="Address" full>
              <input className="input" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Street, district, postal code" />
            </Field>
            <Field label="Latitude" required hint="GPS — feeds Open-Meteo for CDD/HDD" error={errors.latitude}>
              <input className={cn("input", errors.latitude && "border-bad ring-1 ring-bad/25")} value={form.latitude} onChange={(e) => set("latitude", e.target.value)} placeholder="-8.7283" />
            </Field>
            <Field label="Longitude" required error={errors.longitude}>
              <input className={cn("input", errors.longitude && "border-bad ring-1 ring-bad/25")} value={form.longitude} onChange={(e) => set("longitude", e.target.value)} placeholder="115.1683" />
            </Field>
            <Field label="Climate zone" full hint="Source: Open-Meteo · CDD/HDD weather normalisation only — not a risk classification">
              <div className="flex items-center gap-2 rounded-lg border border-ink-200 bg-ink-50 px-3 py-2.5 text-sm text-ink-600">
                <Thermometer size={14} className="text-brand-700 shrink-0" />
                <span>{deriveClimateZone(form.latitude)}</span>
                <span className="ml-auto text-[10px] uppercase font-semibold tracking-wide text-ink-400">Auto-derived</span>
              </div>
            </Field>
            <Field label="Timezone">
              <select className="input" value={form.timezone} onChange={(e) => set("timezone", e.target.value)}>
                {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Currency">
              <select className="input" value={form.currency} onChange={(e) => set("currency", e.target.value)}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
        </Section>
      )}

      {step === 2 && (
        <Section title="Physical attributes" hint="Star rating, room count, GFA, F&B coverage, pool/spa — drives comparison eligibility and intensity normalisation.">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Star rating" hint="Required: 1–5 or Unrated">
              <div className="flex items-center gap-1.5 mt-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => set("starRating", n)}
                    className={cn("w-8 h-8 rounded-md text-sm font-semibold border",
                      form.starRating >= n ? "bg-warn border-warn text-white" : "bg-white border-ink-200 text-ink-400"
                    )}>★</button>
                ))}
              </div>
            </Field>
            <Field label="Building year">
              <input className="input" type="number" value={form.buildingYear} onChange={(e) => set("buildingYear", e.target.value)} placeholder="e.g. 2014" />
            </Field>
            <Field label="Rooms" required error={errors.rooms}>
              <input className={cn("input", errors.rooms && "border-bad ring-1 ring-bad/25")} type="number" value={form.rooms} onChange={(e) => set("rooms", e.target.value)} placeholder="e.g. 240" />
            </Field>
            <Field label="GFA (m²)" required error={errors.gfa}>
              <input className={cn("input", errors.gfa && "border-bad ring-1 ring-bad/25")} type="number" value={form.gfa} onChange={(e) => set("gfa", e.target.value)} placeholder="e.g. 18500" />
            </Field>
            <Field label="F&B outlets">
              <input className="input" type="number" value={form.fbOutlets} onChange={(e) => set("fbOutlets", e.target.value)} />
            </Field>
            <Field label="F&B covers (annual)">
              <input className="input" type="number" value={form.fbCoversAnnual} onChange={(e) => set("fbCoversAnnual", e.target.value)} placeholder="e.g. 312000" />
            </Field>
            <Field label="Laundry type">
              <select className="input" value={form.laundryType} onChange={(e) => set("laundryType", e.target.value as LaundryType)}>
                {LAUNDRY_TYPES.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
              </select>
            </Field>
            <Field label="Pool count">
              <input className="input" type="number" value={form.poolCount} onChange={(e) => set("poolCount", e.target.value)} />
            </Field>
            <Field label="Spa count">
              <input className="input" type="number" value={form.spaCount} onChange={(e) => set("spaCount", e.target.value)} />
            </Field>
          </div>
        </Section>
      )}

      {step === 3 && (
        <Section title="Operations" hint="Operation type and ownership influence comparison-pool grouping.">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Operation type" required full>
              <div className="grid grid-cols-2 gap-2">
                {OPERATION_TYPES.map((o) => (
                  <button key={o.key} type="button" onClick={() => set("operationType", o.key)}
                    className={cn("rounded-lg border px-3 py-2 text-sm text-left",
                      form.operationType === o.key ? "border-brand-500 ring-1 ring-brand-500 bg-brand-50 text-brand-800" : "border-ink-200 bg-white text-ink-700"
                    )}>
                    {o.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Ownership / management" full>
              <div className="grid grid-cols-3 gap-2">
                {OWNERSHIP_TYPES.map((o) => (
                  <button key={o.key} type="button" onClick={() => set("ownership", o.key)}
                    className={cn("rounded-lg border px-3 py-2 text-sm",
                      form.ownership === o.key ? "border-brand-500 ring-1 ring-brand-500 bg-brand-50 text-brand-800" : "border-ink-200 bg-white text-ink-700"
                    )}>
                    {o.label}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </Section>
      )}

      {step === 4 && (
        <Section title="Reporting & pillars" hint="Choose the GP baseline year, enabled pillars, and certification programmes.">
          <div className="grid grid-cols-2 gap-4">
            <Field label="GP baseline year" required error={errors.baselineYear}>
              <input className={cn("input", errors.baselineYear && "border-bad ring-1 ring-bad/25")} type="number" value={form.baselineYear} onChange={(e) => set("baselineYear", e.target.value)} />
            </Field>
            <Field label="Reporting year" required error={errors.reportingYear}>
              <input className={cn("input", errors.reportingYear && "border-bad ring-1 ring-bad/25")} type="number" value={form.reportingYear} onChange={(e) => set("reportingYear", e.target.value)} />
            </Field>

            <Field label="Enabled pillars" required full error={errors.enabledPillars}>
              <div className="grid grid-cols-3 gap-2">
                {PILLARS.map((p) => {
                  const Icon = p.icon;
                  const active = form.enabledPillars.includes(p.key);
                  return (
                    <button key={p.key} type="button" onClick={() => togglePillar(p.key)}
                      className={cn("rounded-lg border px-3 py-2 text-sm inline-flex items-center gap-2",
                        active ? "border-brand-500 ring-1 ring-brand-500 bg-brand-50 text-brand-800" : "border-ink-200 bg-white text-ink-500"
                      )}>
                      <Icon size={14} /> {p.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Certification programmes" full>
              <div className="grid grid-cols-3 gap-2">
                {CERTIFICATIONS.map((c) => {
                  const active = form.certifications.includes(c.key);
                  return (
                    <button key={c.key} type="button" onClick={() => toggleCert(c.key)}
                      className={cn("rounded-lg border px-3 py-2 text-sm text-left",
                        active ? "border-brand-500 ring-1 ring-brand-500 bg-brand-50 text-brand-800" : "border-ink-200 bg-white text-ink-500"
                      )}>
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="External comparison" full>
              <label className="flex items-start gap-3 rounded-lg border border-ink-200 p-3 cursor-pointer">
                <input type="checkbox" className="mt-0.5" checked={form.poolEligible} onChange={(e) => set("poolEligible", e.target.checked)} />
                <div>
                  <div className="text-sm font-medium text-ink-900">Include in the comparable pool</div>
                  <div className="text-[12px] text-ink-500">Properties only enter the pool once they have 12 months of approved data and a complete baseline (BRD §2.3).</div>
                </div>
              </label>
            </Field>
          </div>
        </Section>
      )}
    </Modal>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4">
        <div className="text-sm font-bold text-ink-900">{title}</div>
        <div className="text-[12px] text-ink-500">{hint}</div>
      </div>
      <div className="card-pad-lg bg-white border border-ink-200 rounded-xl2">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
  hint,
  required,
  full,
  error,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  required?: boolean;
  full?: boolean;
  error?: string;
}) {
  return (
    <label className={cn("block", full && "col-span-2")}>
      <span className="text-[12px] font-medium text-ink-600">
        {label}
        {required && <span className="text-bad ml-0.5">*</span>}
      </span>
      <div className="mt-1">{children}</div>
      {error  && <div className="text-[11px] text-bad mt-1 font-medium">{error}</div>}
      {!error && hint && <div className="text-[11px] text-ink-500 mt-1">{hint}</div>}
    </label>
  );
}
