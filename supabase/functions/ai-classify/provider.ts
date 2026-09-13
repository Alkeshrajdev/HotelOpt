// The AI provider layer, shared by every AI task in the product.
//
// Nothing above this file knows which vendor answers. A row in ai_providers names the
// provider, the model and an optional base URL; the adapters here shape the request for
// that provider's wire format and normalise the reply back to plain text. Adding a
// provider is one function and one line in `adapterFor`.
//
// Keys never appear in a readable column: ai_providers holds a Vault secret id, and the
// vault is reached through a definer function granted to the service role alone.
//
// `parts` carries text and, for a bill or receipt, inline images — so the same layer
// serves purchase classification and OCR extraction.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type ProviderName = "gemini" | "openai" | "anthropic" | "openai_compatible";

export type ProviderRow = {
  id: string;
  provider: ProviderName;
  model: string;
  base_url: string | null;
  vault_secret_id: string | null;
  label: string | null;
};

/** A prompt part: text, or an image for the vision tasks. */
export type Part =
  | { kind: "text"; text: string }
  | { kind: "image"; mimeType: string; base64: string };

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

/**
 * Which provider answers for this caller: their client's own row, then the deployment
 * default, then the function's environment. Returns the row and the key, or a reason.
 */
export async function resolveProvider(
  asService: SupabaseClient,
  clientId: string | null | undefined,
): Promise<{ cfg: ProviderRow; apiKey: string } | { error: string; status: number }> {
  const { data: rows, error } = await asService
    .from("ai_providers")
    .select("id,provider,model,base_url,vault_secret_id,label,client_id")
    .eq("is_active", true);
  if (error) return { error: `Provider lookup failed: ${error.message}`, status: 500 };

  const forClient = (rows ?? []).find((r) => r.client_id === clientId);
  const deployment = (rows ?? []).find((r) => r.client_id === null);
  const row = (forClient ?? deployment) as ProviderRow | undefined;

  const envProvider = Deno.env.get("AI_PROVIDER") as ProviderName | undefined;
  const cfg: ProviderRow | null = row ?? (envProvider
    ? {
      id: "env",
      provider: envProvider,
      model: Deno.env.get("AI_MODEL") ?? "",
      base_url: Deno.env.get("AI_BASE_URL") ?? null,
      vault_secret_id: null,
      label: "Environment",
    }
    : null);
  if (!cfg) {
    return { error: "No AI provider is configured. Set one under Admin → AI provider.", status: 503 };
  }

  let apiKey = "";
  if (cfg.id !== "env" && cfg.vault_secret_id) {
    const { data: secret, error: vaultError } = await asService
      .rpc("get_ai_provider_key", { p_provider_id: cfg.id });
    if (vaultError) return { error: `Could not read the stored key: ${vaultError.message}`, status: 500 };
    apiKey = (secret as string | null) ?? "";
  }
  if (!apiKey) apiKey = Deno.env.get("AI_API_KEY") ?? "";
  if (!apiKey) {
    return { error: `No API key is set for ${cfg.provider}. Add one under Admin → AI provider.`, status: 503 };
  }
  return { cfg, apiKey };
}

/* ---------------- adapters ---------------- */

async function callGemini(cfg: ProviderRow, key: string, parts: Part[], maxTokens: number): Promise<string> {
  const base = cfg.base_url?.replace(/\/$/, "") ?? "https://generativelanguage.googleapis.com";
  const res = await fetch(`${base}/v1beta/models/${cfg.model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: parts.map((p) =>
          p.kind === "text"
            ? { text: p.text }
            : { inline_data: { mime_type: p.mimeType, data: p.base64 } }
        ),
      }],
      generationConfig: {
        temperature: 0,
        // A reasoning model spends this budget thinking before it answers; too small a
        // number truncates the answer rather than the reasoning.
        maxOutputTokens: maxTokens,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: "low" },
      },
    }),
  });
  if (!res.ok) throw Object.assign(new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`), { status: res.status });
  const body = await res.json();
  const out = body?.candidates?.[0]?.content?.parts ?? [];
  // Thought parts are the model's reasoning, not its answer.
  return out.filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text ?? "").join("");
}

async function callOpenAiCompatible(cfg: ProviderRow, key: string, parts: Part[], maxTokens: number): Promise<string> {
  const base = cfg.base_url?.replace(/\/$/, "") ?? "https://api.openai.com/v1";
  const content = parts.map((p) =>
    p.kind === "text"
      ? { type: "text", text: p.text }
      : { type: "image_url", image_url: { url: `data:${p.mimeType};base64,${p.base64}` } }
  );
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content }],
    }),
  });
  if (!res.ok) throw Object.assign(new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`), { status: res.status });
  const body = await res.json();
  return body?.choices?.[0]?.message?.content ?? "";
}

async function callAnthropic(cfg: ProviderRow, key: string, parts: Part[], maxTokens: number): Promise<string> {
  const base = cfg.base_url?.replace(/\/$/, "") ?? "https://api.anthropic.com";
  const content = parts.map((p) =>
    p.kind === "text"
      ? { type: "text", text: p.text }
      : { type: "image", source: { type: "base64", media_type: p.mimeType, data: p.base64 } }
  );
  const res = await fetch(`${base}/v1/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: cfg.model, max_tokens: maxTokens, temperature: 0, messages: [{ role: "user", content }] }),
  });
  if (!res.ok) throw Object.assign(new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`), { status: res.status });
  const body = await res.json();
  return (body?.content ?? [])
    .filter((c: { type?: string }) => c.type !== "thinking")
    .map((c: { text?: string }) => c.text ?? "").join("");
}

function adapterFor(p: ProviderName) {
  if (p === "gemini") return callGemini;
  if (p === "anthropic") return callAnthropic;
  return callOpenAiCompatible; // openai, and anything speaking its wire format
}

/**
 * One model call, retrying the two failures that are worth retrying: rate limiting and
 * a busy model. Anything else is the caller's problem to report, not to paper over.
 */
export async function ask(
  cfg: ProviderRow,
  apiKey: string,
  parts: Part[],
  opts: { maxTokens?: number; attempts?: number } = {},
): Promise<string> {
  const maxTokens = opts.maxTokens ?? 2048;
  const attempts = opts.attempts ?? 3;
  let lastError: Error | null = null;
  for (let i = 0; i < attempts; i++) {
    try {
      return await adapterFor(cfg.provider)(cfg, apiKey, parts, maxTokens);
    } catch (e) {
      lastError = e as Error;
      const status = (e as { status?: number }).status;
      if (status !== 429 && status !== 503 && status !== 500) break;
      await new Promise((r) => setTimeout(r, 800 * Math.pow(2, i)));
    }
  }
  throw lastError ?? new Error("The model call failed");
}

/** Extract the first JSON value from a reply, tolerating fences and stray prose. */
export function parseJson<T>(text: string): T | null {
  const cleaned = text.replace(/```(?:json)?/gi, " ");
  for (const [open, close] of [["[", "]"], ["{", "}"]] as const) {
    const start = cleaned.indexOf(open);
    const end = cleaned.lastIndexOf(close);
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        // try the other bracket shape
      }
    }
  }
  return null;
}

/** The one normalisation the cache is keyed on; matches normalise_purchase_text in SQL. */
export const normalise = (s: string | null | undefined) =>
  (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
