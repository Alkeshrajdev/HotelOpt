/**
 * Load the built factor library into Supabase.
 *
 *   node scripts/ef-import/load.mjs '<super-admin password>'
 *
 * Reads scripts/ef-import/out/ef-library.json (see build_ef_sql.py) and upserts it as
 * admin@demo.test, so the write goes through the same row-level security the app runs
 * on rather than around it — a super admin is the only role allowed to write factors.
 *
 * Idempotent: dataset ids are deterministic and every table has a natural unique key,
 * so re-running after rebuilding updates in place instead of duplicating.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");

const env = Object.fromEntries(
  readFileSync(resolve(root, ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const EMAIL = process.env.EF_ADMIN_EMAIL ?? "admin@demo.test";
const PASSWORD = process.argv[2] ?? process.env.EF_ADMIN_PASSWORD;
if (!PASSWORD) {
  console.error("Pass the super-admin password as the first argument (or set EF_ADMIN_PASSWORD).");
  process.exit(1);
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { error: authError } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
if (authError) {
  console.error(`Sign-in failed for ${EMAIL}: ${authError.message}`);
  process.exit(1);
}

const data = JSON.parse(readFileSync(resolve(here, "out/ef-library.json"), "utf8"));

/** Upsert in batches; one failure stops the run rather than leaving a half-loaded library. */
async function load(table, rows, onConflict, batch = 500) {
  let done = 0;
  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict, defaultToNull: true });
    if (error) {
      console.error(`\n${table}: failed at rows ${i}–${i + chunk.length}: ${error.message}`);
      if (error.details) console.error(`  ${error.details}`);
      console.error(`  first row of the failing batch: ${JSON.stringify(chunk[0]).slice(0, 400)}`);
      process.exit(1);
    }
    done += chunk.length;
    process.stdout.write(`\r  ${table}: ${done}/${rows.length}   `);
  }
  process.stdout.write(`\r  ${table}: ${done} rows\n`);
}

console.log(`Loading the factor library as ${EMAIL} …`);
await load("ef_datasets", data.datasets, "client_id,publisher,name,version");
await load(
  "ef_factors",
  data.factors,
  "dataset_id,domain,activity_key,boundary,geo_code,unit_denominator,factor_year,variant",
);
await load("ef_unit_conversions", data.conversions, "from_unit,to_unit,fuel,basis,year");
await load("ef_haul_definitions", data.hauls, "dataset_id,territory");

const { count } = await supabase.from("ef_factors").select("*", { count: "exact", head: true });
console.log(`\nef_factors now holds ${count} rows.`);
