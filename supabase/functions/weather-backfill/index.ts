// Fetch degree days for each property and store them by month.
//
// Degree days are the one genuine-performance driver an operator cannot supply, so the
// product fetches them instead of asking. Open-Meteo's archive API needs no key and
// reaches back decades, which is what makes a real baseline year possible.
//
// Method: hourly integration, HDD = Σ max(0, base − T) / 24 over the month's hours, and
// the mirror for CDD. This is the definition; the commoner "daily mean" shortcut
// understates both whenever a day's swing crosses the base temperature, which in a
// shoulder month is most days. `days_covered` records how much of the month actually
// arrived, so a partial month can be excluded rather than silently read as a mild one.
//
// Source of truth: supabase/functions/weather-backfill/index.ts in the repo.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

const monthKey = (iso: string) => `${iso.slice(0, 7)}-01`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const asCaller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const asService = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: userData } = await asCaller.auth.getUser();
  if (!userData?.user) return json({ error: "Not signed in" }, 401);

  const { data: profile } = await asCaller
    .from("user_profiles").select("client_id,role").eq("id", userData.user.id).maybeSingle();
  if (!profile?.client_id) return json({ error: "No client on the signed-in profile" }, 403);

  let body: { from?: string; to?: string; baseTempC?: number; propertyIds?: string[] } = {};
  try {
    body = await req.json();
  } catch { /* an empty body means "everything in range", which is the common case */ }

  const from = body.from ?? "2024-01-01";
  const to = body.to ?? new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10); // archive lags a few days
  const base = Number(body.baseTempC ?? 18);
  if (!Number.isFinite(base)) return json({ error: "baseTempC must be a number" }, 400);

  let q = asService.from("properties")
    .select("id,name,latitude,longitude").eq("client_id", profile.client_id);
  if (body.propertyIds?.length) q = q.in("id", body.propertyIds);
  const { data: properties, error: propError } = await q;
  if (propError) return json({ error: propError.message }, 500);

  const done: { property: string; months: number }[] = [];
  const skipped: { property: string; why: string }[] = [];

  for (const p of properties ?? []) {
    if (p.latitude == null || p.longitude == null) {
      skipped.push({ property: p.name, why: "no coordinates on the property" });
      continue;
    }
    const api = "https://archive-api.open-meteo.com/v1/archive" +
      `?latitude=${p.latitude}&longitude=${p.longitude}` +
      `&start_date=${from}&end_date=${to}&hourly=temperature_2m&timezone=UTC`;
    const res = await fetch(api);
    if (!res.ok) {
      skipped.push({ property: p.name, why: `Open-Meteo ${res.status}: ${(await res.text()).slice(0, 160)}` });
      continue;
    }
    const w = await res.json();
    const times: string[] = w?.hourly?.time ?? [];
    const temps: (number | null)[] = w?.hourly?.temperature_2m ?? [];
    if (!times.length) {
      skipped.push({ property: p.name, why: "the archive returned no hours for that range" });
      continue;
    }

    // Accumulate degree-hours, then divide by 24 once at the end.
    const acc = new Map<string, { hdd: number; cdd: number; sum: number; hours: number; days: Set<string> }>();
    times.forEach((t, i) => {
      const temp = temps[i];
      if (temp == null) return;
      const m = monthKey(t);
      let a = acc.get(m);
      if (!a) { a = { hdd: 0, cdd: 0, sum: 0, hours: 0, days: new Set() }; acc.set(m, a); }
      a.hdd += Math.max(0, base - temp);
      a.cdd += Math.max(0, temp - base);
      a.sum += temp;
      a.hours += 1;
      a.days.add(t.slice(0, 10));
    });

    const rows = [...acc.entries()].map(([month, a]) => ({
      property_id: p.id,
      month,
      base_temp_c: base,
      hdd: Number((a.hdd / 24).toFixed(2)),
      cdd: Number((a.cdd / 24).toFixed(2)),
      mean_temp_c: Number((a.sum / a.hours).toFixed(2)),
      days_covered: a.days.size,
      source: "open-meteo-archive",
      retrieved_at: new Date().toISOString(),
    }));

    const { error: upError } = await asService.from("weather_monthly")
      .upsert(rows, { onConflict: "property_id,month,base_temp_c" });
    if (upError) { skipped.push({ property: p.name, why: upError.message }); continue; }
    done.push({ property: p.name, months: rows.length });
  }

  return json({ from, to, baseTempC: base, done, skipped });
});
