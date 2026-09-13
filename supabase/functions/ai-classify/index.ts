// Classify procurement lines against the emission-factor library.
//
// Built for the way the data actually arrives: a spreadsheet of hundreds of lines, not
// one invoice at a time. Three things follow from that.
//
//   Remember.  The same suppliers and descriptions repeat every month, so every decision
//              is cached against the normalised vendor and description. A second upload
//              of the same file costs nothing and — more importantly — cannot come back
//              with different answers. A human correction is cached the same way and is
//              never overwritten by a model run.
//   Batch.     Uncached lines go up in chunks with the whole NAICS taxonomy attached
//              (~12k tokens, amortised across the chunk). Sending the full list rather
//              than a keyword-retrieved subset is what stops "laundry service" being
//              offered only textile-mill codes.
//   Verify.    The model proposes a code; ef_factors decides whether it exists. A
//              hallucinated code becomes an unclassified line, never a wrong number.
//
// Source of truth: supabase/functions/ai-classify/index.ts in the repo.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { CORS, json, normalise, parseJson, resolveProvider, ask } from "./provider.ts";

type InputLine = { id: string; description: string; vendor?: string | null };

type Decision = {
  id: string;
  naics: string | null;
  activity: string | null;
  confidence: number | null;
  rationale: string;
  origin: "cache-human" | "cache-ai" | "model" | "unresolved";
  factor?: { id: string; value: number; unit: string; source: string | null; vintage: string | null };
};

/** How many lines go to the model at once. Small enough to stay well inside the reply budget. */
const CHUNK = 25;
/** How many descriptions per cache lookup, so the query string stays a sane length. */
const CACHE_LOOKUP = 80;

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

  let body: { lines?: InputLine[]; description?: string; vendor?: string; useCache?: boolean };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body must be JSON" }, 400);
  }

  // A single line is just a batch of one, so the caller can use either shape.
  const lines: InputLine[] = body.lines?.length
    ? body.lines
    : body.description
    ? [{ id: "1", description: body.description, vendor: body.vendor ?? null }]
    : [];
  const usable = lines.filter((l) => (l.description ?? "").trim().length >= 3);
  if (!usable.length) return json({ error: "Send at least one line with a description" }, 400);
  if (usable.length > 500) return json({ error: "Send at most 500 lines per call" }, 400);

  // Filter by the signed-in user: a super_admin's RLS returns every profile, so an
  // unfiltered .single() would fail rather than find their own client.
  const { data: profile } = await asCaller
    .from("user_profiles").select("client_id").eq("id", userData.user.id).maybeSingle();
  const clientId = profile?.client_id ?? null;
  if (!clientId) return json({ error: "No client on the signed-in profile" }, 403);

  const useCache = body.useCache !== false;
  const started = Date.now();
  const decisions = new Map<string, Decision>();

  /** Unique work, so a thousand-row file with forty distinct suppliers costs forty lookups. */
  const keyOf = (l: InputLine) => `${normalise(l.vendor)}|${normalise(l.description)}`;
  const uniques = new Map<string, InputLine>();
  usable.forEach((l) => { if (!uniques.has(keyOf(l))) uniques.set(keyOf(l), l); });

  // ---- what we already know ----
  const cacheHits = new Map<string, { naics: string; confidence: number | null; rationale: string; source: string }>();
  if (useCache) {
    const wanted = [...uniques.values()].map((l) => normalise(l.description));
    // PostgREST puts .in() values in the query string, so a 500-line upload would build a
    // URL no gateway will accept. Ask in windows.
    for (let i = 0; i < wanted.length; i += CACHE_LOOKUP) {
      const { data: cached } = await asService
        .from("purchase_classifications")
        .select("vendor_norm,description_norm,naics_code,confidence,rationale,source")
        .eq("client_id", clientId)
        .in("description_norm", wanted.slice(i, i + CACHE_LOOKUP));
      (cached ?? []).forEach((c) => {
        cacheHits.set(`${c.vendor_norm}|${c.description_norm}`, {
          naics: c.naics_code,
          confidence: c.confidence,
          rationale: c.rationale ?? "",
          source: c.source,
        });
      });
    }
  }

  const unknown = [...uniques.entries()].filter(([k]) => !cacheHits.has(k));

  // ---- ask about the rest ----
  let provider = "", model = "", modelCalls = 0;
  const fresh = new Map<string, { naics: string; confidence: number | null; rationale: string }>();

  if (unknown.length) {
    const resolved = await resolveProvider(asService, clientId);
    if ("error" in resolved) return json({ error: resolved.error }, resolved.status);
    provider = resolved.cfg.provider;
    model = resolved.cfg.model;

    const { data: taxonomy } = await asService
      .from("ef_factors").select("naics_code,activity")
      .eq("domain", "spend").not("naics_code", "is", null).limit(1200);
    const codes = [...new Map((taxonomy ?? []).map((t) => [t.naics_code as string, t.activity as string])).entries()];
    if (!codes.length) return json({ error: "The factor library has no spend factors loaded" }, 503);
    const codeSet = new Set(codes.map(([c]) => c));
    const taxonomyText = codes.map(([c, t]) => `${c}\t${t}`).join("\n");

    for (let i = 0; i < unknown.length; i += CHUNK) {
      const chunk = unknown.slice(i, i + CHUNK);
      const listed = chunk
        .map(([, l], n) => `${n + 1}\tvendor: ${l.vendor?.trim() || "(none)"}\tline: ${l.description.trim()}`)
        .join("\n");
      const prompt = [
        "You classify hotel procurement lines to 2017 NAICS 6-digit codes, for spend-based",
        "Scope 3 greenhouse gas accounting.",
        "",
        "Rules:",
        "- Choose the code for what was BOUGHT, not for the supplier's own industry.",
        "- Use only codes from the taxonomy below.",
        "- If no code genuinely fits, return naics null with a low confidence. Do not force a match.",
        "- confidence is your own 0-1 estimate that the code is right for that line.",
        "",
        "Reply with a JSON array only, one object per numbered line, no prose, no code fence:",
        '[{"ref":1,"naics":"######","confidence":0.0,"rationale":"one short sentence"}]',
        "",
        "TAXONOMY (code<tab>title):",
        taxonomyText,
        "",
        "LINES:",
        listed,
      ].join("\n");

      modelCalls += 1;
      let raw: string;
      try {
        raw = await ask(resolved.cfg, resolved.apiKey, [{ kind: "text", text: prompt }], {
          maxTokens: 400 + chunk.length * 120,
        });
      } catch (e) {
        // Report what did land rather than losing the whole upload to one bad chunk.
        return json({
          error: (e as Error).message, provider, model,
          partial: [...decisions.values()], classified: decisions.size, of: usable.length,
        }, 502);
      }

      const parsed = parseJson<{ ref: number; naics: string | null; confidence: number; rationale?: string }[]>(raw);
      (Array.isArray(parsed) ? parsed : []).forEach((p) => {
        const entry = chunk[Number(p.ref) - 1];
        if (!entry) return;
        const naics = String(p.naics ?? "").replace(/\D/g, "");
        if (naics.length !== 6 || !codeSet.has(naics)) return; // the library decides, not the model
        const c = Number(p.confidence);
        fresh.set(entry[0], {
          naics,
          confidence: Number.isFinite(c) ? Math.min(1, Math.max(0, c)) : null,
          rationale: String(p.rationale ?? "").slice(0, 400),
        });
      });
    }

    // ---- remember, without ever overwriting a human ruling ----
    if (fresh.size) {
      const rows = [...fresh.entries()].map(([k, v]) => {
        const line = uniques.get(k)!;
        return {
          client_id: clientId,
          vendor_norm: normalise(line.vendor),
          description_norm: normalise(line.description),
          vendor_raw: line.vendor ?? null,
          description_raw: line.description,
          naics_code: v.naics,
          confidence: v.confidence,
          rationale: v.rationale,
          source: "ai",
          provider,
          model,
        };
      });
      await asService.from("purchase_classifications")
        .upsert(rows, { onConflict: "client_id,vendor_norm,description_norm", ignoreDuplicates: true });
    }
  }

  // ---- attach the real factor to every decided code ----
  const allCodes = [...new Set([...[...cacheHits.values()].map((c) => c.naics), ...[...fresh.values()].map((f) => f.naics)])];
  const { data: factorRows } = allCodes.length
    ? await asService.from("ef_factors")
        .select("id,naics_code,activity,value,unit_numerator,unit_denominator,source_name,factor_year_label")
        .eq("domain", "spend").in("naics_code", allCodes)
    : { data: [] as Record<string, unknown>[] };
  const factorByCode = new Map((factorRows ?? []).map((f) => [f.naics_code as string, f]));

  usable.forEach((l) => {
    const k = keyOf(l);
    const hit = cacheHits.get(k);
    const now = fresh.get(k);
    const chosen = hit ?? now;
    if (!chosen) {
      decisions.set(l.id, {
        id: l.id, naics: null, activity: null, confidence: null, origin: "unresolved",
        rationale: "No code in the library fits this line well enough to assign. Classify it by hand.",
      });
      return;
    }
    const f = factorByCode.get(chosen.naics) as Record<string, unknown> | undefined;
    decisions.set(l.id, {
      id: l.id,
      naics: chosen.naics,
      activity: (f?.activity as string) ?? null,
      confidence: chosen.confidence,
      rationale: chosen.rationale,
      origin: hit ? (hit.source === "human" ? "cache-human" : "cache-ai") : "model",
      factor: f
        ? {
          id: f.id as string,
          value: Number(f.value),
          unit: `${f.unit_numerator}/${f.unit_denominator}`,
          source: (f.source_name as string) ?? null,
          vintage: (f.factor_year_label as string) ?? null,
        }
        : undefined,
    });
  });

  const out = usable.map((l) => decisions.get(l.id)!);
  return json({
    results: out,
    summary: {
      lines: usable.length,
      distinct: uniques.size,
      fromCache: out.filter((d) => d.origin.startsWith("cache")).length,
      fromModel: out.filter((d) => d.origin === "model").length,
      unresolved: out.filter((d) => d.origin === "unresolved").length,
      lowConfidence: out.filter((d) => d.confidence !== null && d.confidence < 0.8).length,
      modelCalls,
      provider,
      model,
      elapsedMs: Date.now() - started,
    },
  });
});
