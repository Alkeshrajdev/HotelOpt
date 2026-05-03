// Thin data-access layer over Supabase. Every function returns typed rows
// or throws. Call from React Query / SWR / useEffect — your choice.

import { supabase } from "./supabase";
import type { Inserts, Tables } from "./database.types";

export type Property = Tables<"properties">;
export type ConsumptionRecord = Tables<"consumption_records">;
export type EmissionFactor = Tables<"ef_library">;

/* ---------------- Properties ---------------- */

export async function listProperties(): Promise<Property[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

/* ---------------- EF Library ---------------- */

export async function listEnergyEFs(): Promise<EmissionFactor[]> {
  const { data, error } = await supabase
    .from("ef_library")
    .select("*")
    .eq("is_active", true)
    .order("source_type");
  if (error) throw error;
  return data ?? [];
}

/* ---------------- Consumption records ---------------- */

export type RecordWithProperty = ConsumptionRecord & {
  property: Pick<Property, "id" | "name" | "region"> | null;
};

export async function listRecords(opts?: {
  status?: ConsumptionRecord["status"];
  propertyId?: string;
}): Promise<RecordWithProperty[]> {
  let q = supabase
    .from("consumption_records")
    .select("*, property:properties(id,name,region)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (opts?.status) q = q.eq("status", opts.status);
  if (opts?.propertyId) q = q.eq("property_id", opts.propertyId);
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
  meter_id?: string | null;
  invoice_ref?: string | null;
  notes?: string | null;
  submit?: boolean;
}): Promise<ConsumptionRecord> {
  const { data: userResp } = await supabase.auth.getUser();
  const uid = userResp.user?.id;
  if (!uid) throw new Error("Not signed in");

  // client_id is filled by trigger from property_id
  const insert: Inserts<"consumption_records"> = {
    property_id: payload.property_id,
    client_id: "00000000-0000-0000-0000-000000000000", // placeholder; trigger overwrites
    pillar: payload.pillar,
    energy_source: payload.energy_source ?? null,
    period_start: payload.period_start,
    period_end: payload.period_end,
    consumption: payload.consumption,
    unit: payload.unit,
    cost_amount: payload.cost_amount ?? null,
    meter_id: payload.meter_id ?? null,
    invoice_ref: payload.invoice_ref ?? null,
    notes: payload.notes ?? null,
    status: payload.submit ? "submitted" : "draft",
    submitted_by: uid,
    submitted_at: payload.submit ? new Date().toISOString() : null,
    input_method: "manual",
  };

  const { data, error } = await supabase
    .from("consumption_records")
    .insert(insert)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function transitionRecord(
  id: string,
  next: ConsumptionRecord["status"],
  comment?: string
): Promise<ConsumptionRecord> {
  const { data: userResp } = await supabase.auth.getUser();
  const uid = userResp.user?.id;
  if (!uid) throw new Error("Not signed in");

  const patch = {
    status: next,
    reviewed_by: uid,
    reviewed_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("consumption_records")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  if (comment) {
    const { error: cErr } = await supabase.from("record_comments").insert({
      record_id: id,
      author_id: uid,
      body: comment,
    });
    if (cErr) throw cErr;
  }
  return data;
}

/* ---------------- Comments ---------------- */

export type Comment = Tables<"record_comments"> & {
  author: { id: string; full_name: string | null; role: string } | null;
};

export async function listComments(recordId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("record_comments")
    .select("*, author:user_profiles(id,full_name,role)")
    .eq("record_id", recordId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as unknown as Comment[];
}
