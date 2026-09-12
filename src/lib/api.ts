// Data-access layer over Supabase. Every function returns typed rows or throws.
// Only called when the session is live (see lib/data/mode.ts).

import { supabase } from "./supabase";
import type { Inserts, Tables } from "./database.types";

export type Property = Tables<"properties">;
export type ConsumptionRecord = Tables<"consumption_records">;
export type ActivityRecord = Tables<"activity_records">;
export type EmissionFactor = Tables<"ef_library">;
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

/* ---------------- EF Library ---------------- */

export async function listEnergyEFs(): Promise<EmissionFactor[]> {
  const { data, error } = await supabase!.from("ef_library").select("*").eq("is_active", true).order("source_type");
  if (error) throw error;
  return data ?? [];
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
    status: payload.submit ? "submitted" : "draft",
    submitted_by: me,
    submitted_at: payload.submit ? new Date().toISOString() : null,
    input_method: payload.input_method ?? "manual",
  };
  const { data, error } = await supabase!.from("consumption_records").insert(insert).select().single();
  if (error) throw error;
  return data;
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

/* ---------------- Comments & audit ---------------- */

export type Comment = Tables<"record_comments"> & {
  author: { id: string; full_name: string | null; role: string } | null;
};

export async function listComments(recordId: string): Promise<Comment[]> {
  const { data, error } = await supabase!
    .from("record_comments")
    .select("*, author:user_profiles(id,full_name,role)")
    .eq("record_id", recordId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as unknown as Comment[];
}

export async function addComment(recordId: string, body: string): Promise<void> {
  const me = await uid();
  const { error } = await supabase!.from("record_comments").insert({ record_id: recordId, author_id: me, body });
  if (error) throw error;
}

export async function listAudit(recordId: string): Promise<AuditRow[]> {
  const { data, error } = await supabase!.from("audit_log").select("*").eq("record_id", recordId).order("created_at");
  if (error) throw error;
  return data ?? [];
}
