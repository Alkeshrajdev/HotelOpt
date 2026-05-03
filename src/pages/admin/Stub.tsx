import { useParams } from "react-router-dom";
import { Construction } from "lucide-react";
import AdminShell from "./AdminShell";
import { Card } from "@/components/ui/Card";

const META: Record<string, { title: string; subtitle: string; eyebrow: string }> = {
  branding:        { title: "White-label branding",  eyebrow: "Tenancy",        subtitle: "Logo, colours, custom domain, email identity, report templates, module toggles." },
  "property-config":{ title: "Property configuration", eyebrow: "Configuration", subtitle: "Defaults, GP baseline year per property, enabled pillars, certification programmes." },
  "gp-config":     { title: "GP configuration",      eyebrow: "Configuration", subtitle: "Composite weights, normalisation parameters, baseline-year rules." },
  qr:              { title: "QR management",          eyebrow: "Configuration", subtitle: "Print sheets, point assignments, deactivation, scan analytics." },
  measures:        { title: "Measure library",        eyebrow: "Configuration", subtitle: "Capex measures with default impact, payback, recommended priority." },
  knowledge:       { title: "Knowledge base",         eyebrow: "Knowledge",     subtitle: "Knowledge Curator role only. Versioned articles, recommendation templates, criterion explainers." },
  alerts:          { title: "Alert rules",             eyebrow: "Operations",    subtitle: "Anomaly thresholds, SLA escalations, deadline reminders, integration failures." },
  templates:       { title: "Report templates",       eyebrow: "Reporting",     subtitle: "PDF/PPT/XLSX templates per framework. White-label branding overrides." },
  integrations:    { title: "Integrations & API keys", eyebrow: "Connectors",   subtitle: "OAuth secrets for QuickBooks/Xero/Workday. BMS receiver tokens. Outbound API consumers." },
  security:        { title: "Security & access",       eyebrow: "Connectors",   subtitle: "SSO, MFA, IP allowlists, session settings, sovereign hosting controls." },
  subscriptions:   { title: "Subscriptions",            eyebrow: "Connectors",   subtitle: "Plans, trials, discounts, white-label licence fees, AI/OCR pass-through costs." },
  audit:           { title: "Platform audit log",       eyebrow: "Connectors",   subtitle: "Immutable platform-wide audit trail. Filter by user, property, action, time." },
};

export default function AdminStub() {
  const { section = "" } = useParams();
  const m = META[section] ?? { title: section, eyebrow: "Admin", subtitle: "" };
  return (
    <AdminShell title={m.title} eyebrow={m.eyebrow} subtitle={m.subtitle}>
      <Card className="card-pad py-12 text-center">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-ink-50 grid place-items-center text-ink-400 mb-3">
          <Construction size={20} />
        </div>
        <div className="text-base font-semibold text-ink-900">Sub-page in build</div>
        <p className="text-sm text-ink-500 max-w-md mx-auto mt-1.5">
          The information architecture and shell are in place — fields and controls land as each backend area is wired up. Other admin sub-pages already shipped: Clients, EF Library, Users &amp; Roles, Comparable Pools.
        </p>
      </Card>
    </AdminShell>
  );
}
