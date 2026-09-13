/**
 * The review queue on live data. Rows from Supabase are shaped into the
 * `ReviewRecord` the queue already renders, so the page is the same in both modes.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listActivitiesForReview, listAudit, listComments, listProfiles, listRecords,
  resubmitActivity, resubmitRecord, transitionActivity, transitionRecord,
  type ActivityWithProperty, type AuditRow, type Comment as DbComment, type EvidencePointer,
  type Profile, type QueueKind, type RecordWithProperty,
} from "@/lib/api";
import type { AnomalyFlag, AuditEntry, Comment, EvidenceFile, QueryRound, ReviewRecord, Role, Status } from "@/lib/reviewMock";

const SLA_DAYS = 5;
const SOURCE_LABEL: Record<string, string> = {
  electricity_grid: "Electricity — grid", natural_gas: "Natural gas", district_cooling: "District cooling", diesel: "Diesel", solar_pv: "Solar PV (on-site)",
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const shortId = (uuid: string) => `REC-${uuid.slice(0, 6).toUpperCase()}`;
const periodLabel = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
const stamp = (iso: string | null) => (iso ? iso.slice(0, 16).replace("T", " ") : "");
const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function dataTypeOf(r: RecordWithProperty) {
  const p = r.source_payload as Record<string, unknown> | null;
  if (r.pillar === "energy") return `Energy bill · ${SOURCE_LABEL[r.energy_source ?? ""] ?? "energy"}`;
  if (r.pillar === "water") return `Water bill · ${title(String(p?.source ?? "municipal"))}`;
  if (r.pillar === "waste") return `Waste · ${title(String(p?.stream ?? "mixed"))} → ${title(String(p?.route ?? "landfill"))}`;
  return "Carbon record";
}

function toStatus(s: RecordWithProperty["status"]): Status {
  return s; // draft | submitted | queried | approved | rejected map 1:1; "resubmitted"/"locked" are UI-only
}

/* ---- Capture-time anomalies → the queue's typed flags ---- */

const FLAG_RULES: { test: RegExp; flag: Omit<AnomalyFlag, "hint"> }[] = [
  { test: /very large|unit issue/i, flag: { key: "unit", label: "Value is very large for a monthly figure", severity: "warn" } },
  { test: /negative/i, flag: { key: "range", label: "Negative consumption", severity: "bad" } },
  { test: /spike/i, flag: { key: "spike", label: "Spike vs same month last year", severity: "warn" } },
  { test: /\bdrop\b/i, flag: { key: "drop", label: "Drop vs same month last year", severity: "warn" } },
  { test: /no evidence/i, flag: { key: "missing-evidence", label: "No evidence file attached", severity: "warn" } },
  { test: /confidence/i, flag: { key: "ai-low", label: "Low extraction confidence", severity: "warn" } },
];

/** The capture wizard raises plain-language warnings; the queue wants typed flags (one per key). */
export function anomalyFlagsFor(messages: string[]): AnomalyFlag[] {
  const out: AnomalyFlag[] = [];
  for (const m of messages) {
    const rule = FLAG_RULES.find((r) => r.test.test(m));
    const flag: AnomalyFlag = rule ? { ...rule.flag, hint: m } : { key: "range", label: m, severity: "warn" };
    if (!out.some((f) => f.key === flag.key)) out.push(flag);
  }
  return out;
}

/* ---- Evidence pointers stored in source_payload.evidence ---- */

const fmtSize = (bytes: number) =>
  bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

function typeLabel(mime: string, name: string): string {
  const m = mime.toLowerCase();
  if (m.includes("pdf")) return "PDF";
  if (m.includes("png")) return "PNG";
  if (m.includes("jpeg") || m.includes("jpg")) return "JPG";
  if (m.includes("csv")) return "CSV";
  if (m.includes("sheet") || m.includes("excel")) return "XLSX";
  return name.split(".").pop()?.toUpperCase() || "FILE";
}

function toEvidence(raw: unknown): EvidenceFile[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((e) => {
    const o = e as Partial<EvidencePointer> | null;
    if (!o || typeof o.path !== "string") return [];
    const name = o.name ?? o.path.split("/").pop() ?? "file";
    return [{ name, size: fmtSize(Number(o.size ?? 0)), type: typeLabel(String(o.type ?? ""), name), path: o.path }];
  });
}

export function toReviewRecord(r: RecordWithProperty, profiles: Map<string, Profile>): ReviewRecord {
  const by = r.submitted_by ? profiles.get(r.submitted_by) : undefined;
  const submittedAt = r.submitted_at ?? r.created_at;
  const due = new Date(new Date(submittedAt).getTime() + SLA_DAYS * 86400000);
  const open = r.status === "submitted" || r.status === "queried";
  const overdueDays = open ? Math.max(0, Math.floor((Date.now() - due.getTime()) / 86400000)) : 0;
  const p = r.source_payload as Record<string, unknown> | null;
  return {
    id: r.id,
    property: r.property?.name ?? "—",
    region: r.property?.region ?? "",
    pillar: (r.pillar === "social" || r.pillar === "governance" ? "carbon" : r.pillar),
    dataType: dataTypeOf(r),
    method: r.input_method === "bulk" ? "bulk" : r.input_method === "ocr" ? "ocr" : r.input_method === "api" ? "api" : r.input_method === "qr" ? "qr" : "manual",
    source: r.pillar === "energy" ? (SOURCE_LABEL[r.energy_source ?? ""] ?? "Energy") : r.pillar === "water" ? `Water — ${String(p?.source ?? "municipal")}` : r.pillar === "waste" ? `Waste — ${String(p?.route ?? "landfill")}` : "Carbon",
    period: periodLabel(r.period_start),
    value: `${Number(r.consumption).toLocaleString("en-US")} ${r.unit}`,
    cost: r.cost_amount != null ? `${r.cost_currency ?? "USD"} ${Number(r.cost_amount).toLocaleString("en-US")}` : undefined,
    meterId: r.meter_id ?? undefined,
    invoiceRef: r.invoice_ref ?? undefined,
    submittedBy: by?.full_name ?? "Maker",
    submittedByRole: (by?.role as Role) ?? "maker",
    submittedAt: stamp(submittedAt),
    status: toStatus(r.status),
    dueAt: due.toISOString(),
    overdueDays,
    flags: Array.isArray(r.anomaly_flags) ? (r.anomaly_flags as ReviewRecord["flags"]) : [],
    evidence: toEvidence(p?.evidence),
    queryRounds: [],
    comments: [],
    audit: [],
    locked: r.status === "approved",
  };
}

const ACTIVITY_LABEL: Record<string, string> = {
  refrigerant: "Refrigerant log",
  vehicle: "Fleet — mobile combustion",
  purchase: "Purchase — goods & services",
  capital: "Purchase — capital goods",
  upstream_transport: "Purchase — inbound freight",
  business_travel: "Business travel",
  commute: "Employee commuting",
};

const CATEGORY_TAG = (c: string | null) => (c ? ` · ${c.replace("cat", "Cat ")}` : "");

/**
 * A Scope 1/3 activity row in the queue's shape. The value column shows what was
 * captured and what it came to, because the tCO2e is the thing a checker is approving —
 * a utility record's consumption speaks for itself, an activity's does not.
 */
export function toReviewRecordFromActivity(a: ActivityWithProperty, profiles: Map<string, Profile>): ReviewRecord {
  const by = a.submitted_by ? profiles.get(a.submitted_by) : undefined;
  const submittedAt = a.submitted_at ?? a.created_at;
  const due = new Date(new Date(submittedAt).getTime() + SLA_DAYS * 86400000);
  const open = a.status === "submitted" || a.status === "queried";
  const overdueDays = open ? Math.max(0, Math.floor((Date.now() - due.getTime()) / 86400000)) : 0;
  const p = a.source_payload as Record<string, unknown> | null;
  const qty = `${Number(a.quantity).toLocaleString("en-US")} ${a.unit}`;
  const tco2e = a.tco2e != null ? `${Number(a.tco2e).toFixed(2)} tCO₂e` : "not calculated";
  return {
    id: a.id,
    property: a.property?.name ?? "—",
    region: a.property?.region ?? "",
    pillar: "carbon",
    dataType: `${ACTIVITY_LABEL[a.activity_type] ?? a.activity_type}${CATEGORY_TAG(a.category)}`,
    method: a.input_method === "bulk" ? "bulk" : a.input_method === "ocr" ? "ocr" : a.input_method === "api" ? "api" : "manual",
    source: a.description ?? ACTIVITY_LABEL[a.activity_type] ?? "Activity",
    period: periodLabel(a.period_start),
    value: `${qty} → ${tco2e}`,
    // A foreign invoice shows what was actually billed, not just the converted figure.
    cost: a.amount_original != null && a.currency_original
      ? `${a.currency_original} ${Number(a.amount_original).toLocaleString("en-US")}`
      : undefined,
    invoiceRef: a.invoice_ref ?? undefined,
    submittedBy: by?.full_name ?? "Maker",
    submittedByRole: (by?.role as Role) ?? "maker",
    submittedAt: stamp(submittedAt),
    status: toStatus(a.status),
    dueAt: due.toISOString(),
    overdueDays,
    flags: Array.isArray(a.anomaly_flags) ? (a.anomaly_flags as ReviewRecord["flags"]) : [],
    evidence: toEvidence(p?.evidence),
    queryRounds: [],
    comments: [],
    audit: [],
    locked: a.status === "approved",
  };
}

function toComments(rows: DbComment[], profiles: Map<string, Profile>): Comment[] {
  return rows.map((c) => {
    const author = c.author ?? profiles.get(c.author_id);
    const role = ((author as { role?: string } | undefined)?.role ?? "checker") as Role;
    return { id: c.id, author: (author as { full_name?: string | null } | undefined)?.full_name ?? title(role), role, at: stamp(c.created_at), message: c.body };
  });
}

function toRounds(comments: Comment[]): QueryRound[] {
  const rounds: QueryRound[] = [];
  comments.forEach((c) => {
    const checker = c.role === "checker" || c.role === "property_sm" || c.role === "super_admin";
    if (checker) rounds.push({ round: rounds.length + 1, raisedBy: c.author, raisedAt: c.at, message: c.message });
    else if (rounds.length && !rounds[rounds.length - 1].response) rounds[rounds.length - 1].response = { by: c.author, at: c.at, message: c.message };
  });
  return rounds;
}

function toAudit(rows: AuditRow[], profiles: Map<string, Profile>): AuditEntry[] {
  const out: AuditEntry[] = [];
  rows.forEach((a) => {
    const actor = a.actor_id ? profiles.get(a.actor_id) : undefined;
    const base = { at: stamp(a.created_at), actor: actor?.full_name ?? "System", actorRole: ((a.actor_role ?? actor?.role ?? "maker") as Role) };
    const next = (a.new_data as Record<string, unknown> | null)?.status as string | undefined;
    const prev = (a.old_data as Record<string, unknown> | null)?.status as string | undefined;
    if (a.action === "insert") out.push({ ...base, action: next === "submitted" ? "submitted" : "draft-saved" });
    else if (next && next !== prev) {
      const map: Record<string, AuditEntry["action"]> = { submitted: prev === "queried" ? "resubmitted" : "submitted", queried: "queried", approved: "approved", rejected: "rejected" };
      out.push({ ...base, action: map[next] ?? "edit", note: a.note ?? undefined });
      if (next === "approved") out.push({ ...base, action: "locked", note: "Auto-locked on approval" });
    } else out.push({ ...base, action: "edit", note: a.note ?? undefined });
  });
  return out;
}

export function useReviewRecords(enabled: boolean) {
  const [records, setRecords] = useState<ReviewRecord[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  /** Which table each queued row came from, so a decision goes to the right place. */
  const [kinds, setKinds] = useState<Map<string, QueueKind>>(new Map());
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const [open, recent, openActivities, recentActivities, people] = await Promise.all([
        listRecords({ status: ["draft", "submitted", "queried", "rejected"], limit: 300, orderBy: "submitted_at" }),
        listRecords({ status: "approved", limit: 120, orderBy: "submitted_at" }),
        listActivitiesForReview({ status: ["draft", "submitted", "queried", "rejected"], limit: 300 }),
        listActivitiesForReview({ status: "approved", limit: 120 }),
        listProfiles(),
      ]);
      const map = new Map(people.map((p) => [p.id, p]));
      setProfiles(map);

      const utility = [...open, ...recent].map((r) => toReviewRecord(r, map));
      const activity = [...openActivities, ...recentActivities].map((a) => toReviewRecordFromActivity(a, map));
      setKinds(new Map([
        ...utility.map((r) => [r.id, "record"] as const),
        ...activity.map((r) => [r.id, "activity"] as const),
      ]));
      // One queue, newest first — a checker works a list, not two.
      setRecords([...utility, ...activity].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => { void refresh(); }, [refresh]);

  /** Comments and the audit trail arrive when a record is opened. */
  const hydrate = useCallback(async (id: string) => {
    if (!enabled) return;
    try {
      const [comments, audit] = await Promise.all([listComments(id), listAudit(id)]);
      setRecords((rs) => rs.map((r) => {
        if (r.id !== id) return r;
        const cs = toComments(comments, profiles);
        return { ...r, comments: cs, queryRounds: toRounds(cs), audit: toAudit(audit, profiles) };
      }));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [enabled, profiles]);

  const decide = useCallback(async (id: string, next: "approved" | "queried" | "rejected", comment?: string) => {
    if (kinds.get(id) === "activity") await transitionActivity(id, next, comment);
    else await transitionRecord(id, next, comment);
    await refresh();
    await hydrate(id);
  }, [kinds, refresh, hydrate]);

  const resubmit = useCallback(async (id: string, comment: string, patch?: { consumption?: number }) => {
    if (kinds.get(id) === "activity") await resubmitActivity(id, comment, { quantity: patch?.consumption });
    else await resubmitRecord(id, comment, patch);
    await refresh();
    await hydrate(id);
  }, [kinds, refresh, hydrate]);

  return useMemo(
    () => ({ records, loading, error, refresh, hydrate, decide, resubmit, kinds }),
    [records, loading, error, refresh, hydrate, decide, resubmit, kinds],
  );
}
