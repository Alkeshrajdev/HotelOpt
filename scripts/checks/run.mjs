#!/usr/bin/env node
// Run the genuine-performance checks without a test framework.
//
// The engine is pure arithmetic over arrays, so it needs no DOM and no database — the
// React and api imports are stubbed out at bundle time and esbuild (already a Vite
// dependency) does the TypeScript. Run it with `npm run check:genuine`.
import { build } from "esbuild";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "ho-check-"));
writeFileSync(join(tmp, "react.ts"),
  "export const useEffect=(..._a)=>{};export const useMemo=(f)=>f();export const useState=(v)=>[v,()=>{}];");
writeFileSync(join(tmp, "api.ts"),
  "export const listActivity=async()=>[];export const listRecords=async()=>[];export const listWeatherMonthly=async()=>[];");

const out = join(tmp, "bundle.mjs");
await build({
  entryPoints: [join(here, "genuine.test.ts")],
  bundle: true, platform: "node", format: "esm", outfile: out, logLevel: "error",
  alias: { react: join(tmp, "react.ts"), "@/lib/api": join(tmp, "api.ts") },
});
await import(pathToFileURL(out).href);
