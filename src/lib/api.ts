// Data-access layer over Supabase. Every function returns typed rows or throws.
// Only called when the session is live (see lib/data/mode.ts).

import { supabase } from "./supabase";
import type { Inserts, Tables, Updates } from "./database.types";

export type Property = Tables<"properties">;
export type ConsumptionRecord = Tables<"consumption_records">;
export type ActivityRecord = Tables<"activity_records">;
export type EfFactor = Tables<"ef_factors">;
/** A factor with its dataset's precedence — what breaks a tie between two sources. */
export type EfFactorWithDataset = EfFactor & { dataset: { precedence: number; publisher: string } | null };
export type EfDataset = Tables<"ef_datasets">;
export type EfUnitConversion = Tables<"ef_unit_conversions">;
export type EfFxRate = Tables<"ef_fx_rates">;
export type EfPriceIndex = Tables<"ef_price_index">;
export type EmissionActivity = Tables<"emission_activities">;
export type Profile = Tables<"user_profiles">;
export type AuditRow = Tables<"audit_log">;
export type RecordStatus = ConsumptionRecord["status"];

const PLACEHOLDER_CLIENT = "00000000-0000-0000-0000-000000000000"; // trigger derives the real one from the property

async function uid(): Promise<string> {
  const { data } = await supabase!.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Not signed in");
  return id;
}

/* ---------------- Properties & people ---------------- */

export async function listProperties(): Promise<Property[]> {
  const { data, error } = await supabase!.from("properties").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase!.from("user_profiles").select("*");
  if (error) throw error;
  return data ?? [];
}

/* ---------------- Emission factor library ---------------- */

/**
 * A narrow slice of the factor library. The library holds thousands of rows across four
 * published datasets, so a page asks only for the domains and geographies it needs —
 * loading all of it into the browser would be several megabytes for no benefit.
 */
export async function listFactorSet(opts: {
  domains: string[];
  /** Geography codes to include, e.g. ["AE-DEWA", "AE", "GLOBAL"]. */
  geoCodes: string[];
  boundaries?: string[];
  /** Narrow further when the caller knows exactly which activities it will resolve. */
  activityKeys?: string[];
  fromYear?: number;
  limit?: number;
}): Promise<EfFactorWithDataset[]> {
  let q = supabase!
    .from("ef_factors")
    .select("*, dataset:ef_datasets(precedence,publisher)")
    .in("domain", opts.domains)
    .in("geo_code", opts.geoCodes)
    .order("factor_year", { ascending: false })
    .limit(opts.limit ?? 4000);
  if (opts.boundaries) q = q.in("boundary", opts.boundaries);
  if (opts.activityKeys) q = q.in("activity_key", opts.activityKeys);
  if (opts.fromYear) q = q.or(`factor_year.is.null,factor_year.gte.${opts.fromYear}`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as EfFactorWithDataset[];
}

/** The exact rows a set of stored records was calculated with — the report's provenance. */
export async function listFactorsByIds(ids: string[]): Promise<EfFactor[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return [];
  const { data, error } = await supabase!.from("ef_factors").select("*").in("id", unique);
  if (error) throw error;
  return data ?? [];
}

/** One activity's candidates, for resolving a single capture at submit time. */
export async function listFactorCandidates(opts: {
  domain: string;
  activityKey: string;
  boundary: string;
  geoCodes: string[];
}): Promise<EfFactorWithDataset[]> {
  const { data, error } = await supabase!
    .from("ef_factors")
    .select("*, dataset:ef_datasets(precedence,publisher)")
    .eq("domain", opts.domain)
    .eq("activity_key", opts.activityKey)
    .eq("boundary", opts.boundary)
    .in("geo_code", opts.geoCodes);
  if (error) throw error;
  return (data ?? []) as unknown as EfFactorWithDataset[];
}

/** Search the library by name or NAICS code — the purchase form and the admin view. */
export async function searchFactors(opts: {
  domain?: string;
  term?: string;
  limit?: number;
}): Promise<EfFactor[]> {
  let q = supabase!.from("ef_factors").select("*").order("activity").limit(opts.limit ?? 50);
  if (opts.domain) q = q.eq("domain", opts.domain);
  if (opts.term) {
    const t = opts.term.replace(/[%,()]/g, " ").trim();
    if (t) q = q.or(`activity.ilike.%${t}%,subtype.ilike.%${t}%,naics_code.ilike.${t}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/**
 * Annual-average FX rates and price indices for spend-based Scope 3. Both tables start
 * empty — a wrong rate is exactly the kind of plausible number this product will not
 * invent — so the capture form falls back to asking the user when nothing is on file.
 */
export async function listMoneyBasis(year: number): Promise<{ fx: EfFxRate[]; index: EfPriceIndex[] }> {
  const [fx, index] = await Promise.all([
    supabase!.from("ef_fx_rates").select("*").eq("year", year),
    supabase!.from("ef_price_index").select("*"),
  ]);
  if (fx.error) throw fx.error;
  if (index.error) throw index.error;
  return { fx: fx.data ?? [], index: index.data ?? [] };
}

/** DEFRA's per-fuel calorific values and densities, plus the plain unit conversions. */
export async function listUnitConversions(): Promise<EfUnitConversion[]> {
  const { data, error } = await supabase!.from("ef_unit_conversions").select("*").limit(1000);
  if (error) throw error;
  return data ?? [];
}

export async function listFactorDatasets(): Promise<EfDataset[]> {
  const { data, error } = await supabase!.from("ef_datasets").select("*").order("precedence");
  if (error) throw error;
  return data ?? [];
}

/**
 * The admin library browser. Every filter is applied server-side and the result is
 * paged — the library is thousands of rows and the page must not pull all of them.
 */
export async function queryFactors(opts: {
  datasetId?: string;
  domain?: string;
  boundary?: string;
  geoCode?: string;
  scope?: number;
  provisionalOnly?: boolean;
  term?: string;
  from?: number;
  pageSize?: number;
}): Promise<{ rows: EfFactor[]; total: number }> {
  const size = opts.pageSize ?? 100;
  const from = opts.from ?? 0;
  let q = supabase!.from("ef_factors").select("*", { count: "exact" });
  if (opts.datasetId) q = q.eq("dataset_id", opts.datasetId);
  if (opts.domain) q = q.eq("domain", opts.domain);
  if (opts.boundary) q = q.eq("boundary", opts.boundary);
  if (opts.geoCode) q = q.eq("geo_code", opts.geoCode);
  if (opts.scope) q = q.eq("scope", opts.scope);
  if (opts.provisionalOnly) q = q.or("status.neq.production,reliability.in.(B-,C,Hold)");
  if (opts.term) {
    const t = opts.term.replace(/[%,()]/g, " ").trim();
    if (t) q = q.or(`activity.ilike.%${t}%,subtype.ilike.%${t}%,activity_key.ilike.%${t}%,geo_label.ilike.%${t}%,naics_code.ilike.${t}%`);
  }
  const { data, error, count } = await q
    .order("domain")
    .order("activity")
    .order("geo_code")
    .order("factor_year", { ascending: false })
    .range(from, from + size - 1);
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

export type EfFacet = { kind: string; value: string; factors: number };

/**
 * Distinct domains, boundaries and geographies, from the ef_facets view. Selecting
 * these from ef_factors directly would only see the first page PostgREST returns, so
 * most values never reached the dropdowns.
 */
export async function factorFacets(): Promise<{ domains: EfFacet[]; boundaries: EfFacet[]; geoCodes: EfFacet[] }> {
  const { data, error } = await supabase!.from("ef_facets").select("*").order("value");
  if (error) throw error;
  const rows = (data ?? []) as EfFacet[];
  const of = (kind: string) => rows.filter((r) => r.kind === kind);
  return { domains: of("domain"), boundaries: of("boundary"), geoCodes: of("geo") };
}

/* ---------------- Consumption records ---------------- */

export type RecordWithProperty = ConsumptionRecord & {
  property: Pick<Property, "id" | "name" | "region" | "short_name"> | null;
};

export async function listRecords(opts?: {
  status?: RecordStatus | RecordStatus[];
  propertyId?: string;
  pillar?: ConsumptionRecord["pillar"];
  from?: string; // period_start >= (YYYY-MM-DD)
  to?: string;   // period_start <= (YYYY-MM-DD)
  limit?: number;
  orderBy?: "created_at" | "submitted_at" | "period_start";
}): Promise<RecordWithProperty[]> {
  let q = supabase!
    .from("consumption_records")
    .select("*, property:properties(id,name,region,short_name)")
    .order(opts?.orderBy ?? "created_at", { ascending: false })
    .limit(opts?.limit ?? 500);
  if (opts?.status) q = Array.isArray(opts.status) ? q.in("status", opts.status) : q.eq("status", opts.status);
  if (opts?.propertyId) q = q.eq("property_id", opts.propertyId);
  if (opts?.pillar) q = q.eq("pillar", opts.pillar);
  if (opts?.from) q = q.gte("period_start", opts.from);
  if (opts?.to) q = q.lte("period_start", opts.to);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as RecordWithProperty[];
}

export async function createRecord(payload: {
  property_id: string;
  pillar: ConsumptionRecord["pillar"];
  energy_source?: ConsumptionRecord["energy_source"];
  period_start: string;
  period_end: string;
  consumption: number;
  unit: string;
  cost_amount?: number | null;
  cost_currency?: string | null;
  meter_id?: string | null;
  invoice_ref?: string | null;
  notes?: string | null;
  source_payload?: Record<string, unknown> | null;
  /** Flags raised at capture time; the queue renders them and its filters count them. */
  anomaly_flags?: Record<string, unknown>[];
  input_method?: string;
  submit?: boolean;
}): Promise<ConsumptionRecord> {
  const me = await uid();
  const insert: Inserts<"consumption_records"> = {
    property_id: payload.property_id,
    client_id: PLACEHOLDER_CLIENT,
    pillar: payload.pillar,
    energy_source: payload.energy_source ?? null,
    period_start: payload.period_start,
    period_end: payload.period_end,
    consumption: payload.consumption,
    unit: payload.unit,
    cost_amount: payload.cost_amount ?? null,
    cost_currency: payload.cost_currency ?? "USD",
    meter_id: payload.meter_id ?? null,
    invoice_ref: payload.invoice_ref ?? null,
    notes: payload.notes ?? null,
    source_payload: (payload.source_payload ?? null) as Inserts<"consumption_records">["source_payload"],
    anomaly_flags: (payload.anomaly_flags ?? []) as Inserts<"consumption_records">["anomaly_flags"],
    status: payload.submit ? "submitted" : "draft",
    submitted_by: me,
    submitted_at: payload.submit ? new Date().toISOString() : null,
    input_method: payload.input_method ?? "manual",
  };
  const { data, error } = await supabase!.from("consumption_records").insert(insert).select().single();
  if (error) throw error;
  return data;
}

/* ---------------- Evidence files (private storage bucket) ---------------- */

export type EvidencePointer = { path: string; name: string; size: number; type: string };
const EVIDENCE_BUCKET = "evidence";

/**
 * Upload a bill, invoice or meter photo under the property's folder. The bucket's
 * policies reuse property access, so whoever can see the property can open the file.
 */
export async function uploadEvidence(propertyId: string, file: File): Promise<EvidencePointer> {
  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-120);
  const path = `${propertyId}/${crypto.randomUUID()}/${safeName}`;
  const { error } = await supabase!.storage
    .from(EVIDENCE_BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw error;
  return { path, name: file.name, size: file.size, type: file.type };
}

/** Short-lived signed URL for a stored evidence file; pass a file name to force a download. */
export async function evidenceUrl(path: string, expiresInSeconds = 600, download?: string): Promise<string> {
  const { data, error } = await supabase!.storage
    .from(EVIDENCE_BUCKET)
    .createSignedUrl(path, expiresInSeconds, download ? { download } : undefined);
  if (error) throw error;
  return data.signedUrl;
}

/** Checker decision. Approve / query / reject, with the comment the queue requires. */
export async function transitionRecord(id: string, next: RecordStatus, comment?: string): Promise<ConsumptionRecord> {
  const me = await uid();
  const { data, error } = await supabase!
    .from("consumption_records")
    .update({ status: next, reviewed_by: me, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  if (comment) await addComment(id, comment);
  return data;
}

/** Which queue a row came from. Both kinds flow through the same review screen. */
export type QueueKind = "record" | "activity";

/** Checker decision on a Scope 1/3 activity row. */
export async function transitionActivity(id: string, next: RecordStatus, comment?: string): Promise<EmissionActivity> {
  const me = await uid();
  const { data, error } = await supabase!
    .from("emission_activities")
    .update({ status: next, reviewed_by: me, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  if (comment) await addComment(id, comment, "activity");
  return data;
}

/** Maker answers a query on an activity row. Correcting the quantity restates its tCO2e. */
export async function resubmitActivity(
  id: string,
  comment: string,
  patch?: { quantity?: number; notes?: string | null },
): Promise<EmissionActivity> {
  const update: Updates<"emission_activities"> = { status: "submitted", submitted_at: new Date().toISOString() };
  if (patch?.notes !== undefined) update.notes = patch.notes;
  if (patch?.quantity !== undefined) {
    // The factor stays as captured, so a corrected quantity has to carry its result with it.
    const { data: current, error: readError } = await supabase!
      .from("emission_activities").select("ef_value").eq("id", id).single();
    if (readError) throw readError;
    update.quantity = patch.quantity;
    if (current?.ef_value != null) {
      update.tco2e = Math.round(patch.quantity * Number(current.ef_value) / 1000 * 10000) / 10000;
    }
  }
  const { data, error } = await supabase!
    .from("emission_activities").update(update).eq("id", id).select().single();
  if (error) throw error;
  if (comment) await addComment(id, comment, "activity");
  return data;
}

/** Maker answers a query: optional corrected value, then back to the queue. */
export async function resubmitRecord(id: string, comment: string, patch?: { consumption?: number; notes?: string | null }): Promise<ConsumptionRecord> {
  const { data, error } = await supabase!
    .from("consumption_records")
    .update({ ...(patch ?? {}), status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  if (comment) await addComment(id, comment);
  return data;
}

/* ---------------- Activity (denominators) ---------------- */

export async function listActivity(opts?: { propertyId?: string; from?: string; to?: string; status?: RecordStatus | RecordStatus[] }): Promise<ActivityRecord[]> {
  let q = supabase!.from("activity_records").select("*").order("period_start", { ascending: false }).limit(500);
  if (opts?.propertyId) q = q.eq("property_id", opts.propertyId);
  if (opts?.from) q = q.gte("period_start", opts.from);
  if (opts?.to) q = q.lte("period_start", opts.to);
  if (opts?.status) q = Array.isArray(opts.status) ? q.in("status", opts.status) : q.eq("status", opts.status);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function upsertActivity(payload: {
  property_id: string; period_start: string; period_end: string;
  occupied_room_nights: number; available_room_nights?: number | null; guest_nights?: number | null; fb_covers?: number | null; laundry_kg?: number | null;
  notes?: string | null; submit?: boolean;
}): Promise<ActivityRecord> {
  const me = await uid();
  const row: Inserts<"activity_records"> = {
    property_id: payload.property_id,
    client_id: PLACEHOLDER_CLIENT,
    period_start: payload.period_start,
    period_end: payload.period_end,
    occupied_room_nights: payload.occupied_room_nights,
    available_room_nights: payload.available_room_nights ?? null,
    guest_nights: payload.guest_nights ?? null,
    fb_covers: payload.fb_covers ?? null,
    laundry_kg: payload.laundry_kg ?? null,
    notes: payload.notes ?? null,
    status: payload.submit ? "submitted" : "draft",
    submitted_by: me,
    submitted_at: payload.submit ? new Date().toISOString() : null,
  };
  const { data, error } = await supabase!.from("activity_records").upsert(row, { onConflict: "property_id,period_start" }).select().single();
  if (error) throw error;
  return data;
}

/* ---------------- Emission activities (Scope 1 fugitive + Scope 3) ---------------- */

export type ActivityType = "refrigerant" | "vehicle" | "purchase" | "capital" | "upstream_transport" | "business_travel" | "commute";

export type ActivityWithProperty = EmissionActivity & {
  property: Pick<Property, "id" | "name" | "region" | "short_name"> | null;
};

/** The queue's view: activity rows with the property they belong to. */
export async function listActivitiesForReview(opts?: {
  status?: RecordStatus | RecordStatus[];
  limit?: number;
}): Promise<ActivityWithProperty[]> {
  let q = supabase!
    .from("emission_activities")
    .select("*, property:properties(id,name,region,short_name)")
    .order("submitted_at", { ascending: false })
    .limit(opts?.limit ?? 300);
  if (opts?.status) q = Array.isArray(opts.status) ? q.in("status", opts.status) : q.eq("status", opts.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as ActivityWithProperty[];
}

export async function listEmissionActivities(opts?: {
  propertyId?: string;
  from?: string;
  to?: string;
  status?: RecordStatus | RecordStatus[];
  scope?: 1 | 3;
  limit?: number;
}): Promise<EmissionActivity[]> {
  let q = supabase!
    .from("emission_activities")
    .select("*")
    .order("period_start", { ascending: false })
    .limit(opts?.limit ?? 3000);
  if (opts?.propertyId) q = q.eq("property_id", opts.propertyId);
  if (opts?.from) q = q.gte("period_start", opts.from);
  if (opts?.to) q = q.lte("period_start", opts.to);
  if (opts?.scope) q = q.eq("scope", opts.scope);
  if (opts?.status) q = Array.isArray(opts.status) ? q.in("status", opts.status) : q.eq("status", opts.status);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/**
 * One captured activity. The caller has already resolved the factor (see
 * `lib/data/factors.ts`), so the row stores the factor and the tCO2e it produced
 * alongside the quantity — a restatement can then show exactly what was applied.
 */
export async function createEmissionActivity(payload: {
  property_id: string;
  scope: 1 | 3;
  category?: string | null;
  activity_type: ActivityType;
  factor_key?: string | null;
  description?: string | null;
  vendor?: string | null;
  period_start: string;
  period_end: string;
  quantity: number;
  unit: string;
  tier?: number | null;
  ef_id?: string | null;
  ef_value?: number | null;
  ef_unit?: string | null;
  tco2e?: number | null;
  invoice_ref?: string | null;
  notes?: string | null;
  /** Spend rows carry the money trail: what was invoiced, in what, at which rate and price year. */
  amount_original?: number | null;
  currency_original?: string | null;
  fx_rate?: number | null;
  fx_source?: string | null;
  price_year?: number | null;
  deflator?: number | null;
  deflator_source?: string | null;
  source_payload?: Record<string, unknown> | null;
  anomaly_flags?: Record<string, unknown>[];
  input_method?: string;
  submit?: boolean;
}): Promise<EmissionActivity> {
  const me = await uid();
  const insert: Inserts<"emission_activities"> = {
    property_id: payload.property_id,
    client_id: PLACEHOLDER_CLIENT,
    scope: payload.scope,
    category: payload.category ?? null,
    activity_type: payload.activity_type,
    factor_key: payload.factor_key ?? null,
    description: payload.description ?? null,
    vendor: payload.vendor ?? null,
    period_start: payload.period_start,
    period_end: payload.period_end,
    quantity: payload.quantity,
    unit: payload.unit,
    tier: payload.tier ?? null,
    ef_id: payload.ef_id ?? null,
    ef_value: payload.ef_value ?? null,
    ef_unit: payload.ef_unit ?? null,
    tco2e: payload.tco2e ?? null,
    invoice_ref: payload.invoice_ref ?? null,
    notes: payload.notes ?? null,
    amount_original: payload.amount_original ?? null,
    currency_original: payload.currency_original ?? null,
    fx_rate: payload.fx_rate ?? null,
    fx_source: payload.fx_source ?? null,
    price_year: payload.price_year ?? null,
    deflator: payload.deflator ?? null,
    deflator_source: payload.deflator_source ?? null,
    source_payload: (payload.source_payload ?? null) as Inserts<"emission_activities">["source_payload"],
    anomaly_flags: (payload.anomaly_flags ?? []) as Inserts<"emission_activities">["anomaly_flags"],
    status: payload.submit ? "submitted" : "draft",
    input_method: payload.input_method ?? "manual",
    submitted_by: me,
    submitted_at: payload.submit ? new Date().toISOString() : null,
  };
  const { data, error } = await supabase!.from("emission_activities").insert(insert).select().single();
  if (error) throw error;
  return data;
}

/* ---------------- Comments & audit ---------------- */

export type Comment = Tables<"record_comments"> & {
  author: { id: string; full_name: string | null; role: string } | null;
};

/** Ids are unique across both tables, so one query covers a record or an activity. */
export async function listComments(id: string): Promise<Comment[]> {
  const { data, error } = await supabase!
    .from("record_comments")
    .select("*, author:user_profiles(id,full_name,role)")
    .or(`record_id.eq.${id},activity_id.eq.${id}`)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as unknown as Comment[];
}

export async function addComment(id: string, body: string, kind: QueueKind = "record"): Promise<void> {
  const me = await uid();
  const target = kind === "activity" ? { activity_id: id } : { record_id: id };
  const { error } = await supabase!.from("record_comments").insert({ ...target, author_id: me, body });
  if (error) throw error;
}

export async function listAudit(recordId: string): Promise<AuditRow[]> {
  const { data, error } = await supabase!.from("audit_log").select("*").eq("record_id", recordId).order("created_at");
  if (error) throw error;
  return data ?? [];
}
