// Capture full-page screenshots of every Hotel Optimizer screen.
// Requires the dev server running on http://localhost:5173.
//
// Usage:
//   npm run dev          # in one terminal
//   node scripts/capture.mjs

import puppeteer from "puppeteer";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = resolve(ROOT, "review", "screenshots");
const BASE = process.env.BASE || "http://localhost:5173";

const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 2 };

const PILLAR_VIEWS = {
  energy:     ["overview", "genuine-performance", "internal-comparison", "external-comparison", "data-quality"],
  water:      ["overview", "genuine-performance", "internal-comparison", "external-comparison", "data-quality"],
  waste:      ["overview", "genuine-performance", "internal-comparison", "external-comparison", "data-quality"],
  carbon:     ["overview", "genuine-performance", "internal-comparison", "external-comparison", "carbon-inventory", "data-quality"],
  social:     ["overview", "internal-comparison", "data-quality", "evidence"],
  governance: ["overview", "internal-comparison", "data-quality", "evidence"],
};
const PILLAR_LABEL = {
  energy: "Energy", water: "Water", waste: "Waste",
  carbon: "Carbon", social: "Social", governance: "Governance",
};
const VIEW_LABEL = {
  "overview": "Overview",
  "genuine-performance": "Genuine Performance",
  "internal-comparison": "Internal Comparison",
  "external-comparison": "External Comparison",
  "carbon-inventory": "Carbon Inventory",
  "data-quality": "Data Quality",
  "evidence": "Evidence",
};

/** Build the page list. Performance gets one screenshot per (pillar × view). */
function buildPages() {
  const pages = [];
  let n = 1;
  const add = (id, path, label, opts = {}) =>
    pages.push({
      id: String(n++).padStart(2, "0") + "-" + id,
      path, label, ...opts,
    });

  add("login", "/login", "Login", { needsAuth: false });

  // Dashboard — one per pillar
  add("dashboard-energy",     "/", "Dashboard · Energy");
  add("dashboard-water",      "/", "Dashboard · Water",      { act: clickPillarTab("Water") });
  add("dashboard-waste",      "/", "Dashboard · Waste",      { act: clickPillarTab("Waste") });
  add("dashboard-carbon",     "/", "Dashboard · Carbon",     { act: clickPillarTab("Carbon") });
  add("dashboard-social",     "/", "Dashboard · Social",     { act: clickPillarTab("Social") });
  add("dashboard-governance", "/", "Dashboard · Governance", { act: clickPillarTab("Governance") });

  // Drilldown examples
  add("drill-energy-score", "/", "Drilldown · Energy Score", {
    act: async (p) => {
      await waitForCards(p);
      await clickTileText(p, "Energy Score");
      await p.waitForSelector("[role=dialog]", { timeout: 5000 });
      await sleep(400);
    },
    isModal: true,
  });
  add("drill-attestations", "/", "Drilldown · Annual attestations", {
    act: async (p) => {
      await clickPillarTab("Governance")(p);
      await p.waitForFunction(
        () => [...document.querySelectorAll("button.card")]
                .some((b) => /attestations/i.test(b.textContent || "")),
        { timeout: 8000 }
      );
      await clickTileText(p, "Attestations");
      await p.waitForSelector("[role=dialog]", { timeout: 5000 });
      await sleep(400);
    },
    isModal: true,
  });

  // Performance — pillar × view matrix
  for (const [pillar, views] of Object.entries(PILLAR_VIEWS)) {
    for (const view of views) {
      add(
        `perf-${pillar}-${view}`,
        `/performance/${pillar}/${view}`,
        `Performance · ${PILLAR_LABEL[pillar]} · ${VIEW_LABEL[view]}`,
        { group: "performance", pillar, view }
      );
    }
  }

  // Drilldown inside Carbon Inventory
  add("perf-carbon-scope-1", "/performance/carbon/carbon-inventory", "Drilldown · Scope 1", {
    act: async (p) => {
      await waitForCards(p);
      await clickTileText(p, "Scope 1");
      await p.waitForSelector("[role=dialog]", { timeout: 5000 });
      await sleep(400);
    },
    isModal: true,
  });

  // Workspace
  add("data-capture",        "/data-capture",     "Data Capture · Manual");
  add("data-capture-ocr",    "/data-capture",     "Data Capture · OCR",        { act: clickByText("OCR — bills") });
  add("data-capture-bulk",   "/data-capture",     "Data Capture · Bulk CSV",   { act: clickByText("Bulk CSV") });
  add("data-capture-qr",     "/data-capture",     "Data Capture · QR",         { act: clickByText("QR scan") });
  add("data-capture-api",    "/data-capture",     "Data Capture · API",        { act: clickByText("API integrations") });
  add("review-approval",     "/review-approval",  "Review & Approval");
  add("properties",          "/properties",       "Properties");

  // Reporting
  add("reports",        "/reports",        "Reports & Disclosure");
  add("certifications", "/certifications", "Certifications");

  // Engagement
  add("actions",          "/actions",          "Actions & Measures");
  add("supplier-portal",  "/supplier-portal",  "Supplier Portal");
  add("ai-assistant",     "/ai-assistant",     "AI Assistant");
  add("guest-engagement", "/guest-engagement", "Guest Engagement");

  // Admin
  add("billing", "/billing", "Billing");
  add("admin",   "/admin",   "Admin");

  return pages;
}

function clickPillarTab(label) {
  return async (p) => {
    await p.evaluate((t) => {
      // Tab might be a NavLink (anchor) or a plain button — try both.
      const candidates = [
        ...document.querySelectorAll("a, button"),
      ].filter((el) => el.textContent && el.textContent.trim() === t);
      candidates[0]?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );
    }, label);
    await sleep(400);
  };
}

function clickByText(text) {
  return async (p) => {
    await p.evaluate((t) => {
      const el = [...document.querySelectorAll("button, a")].find((b) =>
        (b.textContent || "").includes(t)
      );
      if (el) el.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );
    }, text);
    await sleep(250);
  };
}

async function waitForCards(page) {
  await page.waitForFunction(
    () => document.querySelectorAll("button.card").length > 0,
    { timeout: 10000 }
  );
}

async function clickTileText(page, contains) {
  const ok = await page.evaluate((t) => {
    const tile = [...document.querySelectorAll("button.card")].find((b) =>
      (b.textContent || "").toLowerCase().includes(t.toLowerCase())
    );
    if (!tile) return false;
    tile.scrollIntoView({ block: "center" });
    tile.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true })
    );
    return true;
  }, contains);
  if (!ok) throw new Error(`tile not found: ${contains}`);
  await sleep(500);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(page) {
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.waitForSelector("input[type=email]");
  await page.type("input[type=email]", "admin@demo.test");
  await page.type("input[type=password]", "demo123!");
  await page.click("button[type=submit]");
  await page.waitForFunction(
    () => location.pathname !== "/login",
    { timeout: 15000 }
  );
  await sleep(1000);
}

async function captureFullPage(page, outFile, isModal) {
  if (isModal) {
    // Modals overlay the viewport — keep the standard height.
    await page.setViewport(VIEWPORT);
    await sleep(250);
    await page.screenshot({ path: outFile, type: "png" });
    return;
  }
  const main = await page.$("main");
  let height = 900;
  if (main) {
    height = await page.evaluate((el) => el.scrollHeight, main);
  }
  await page.setViewport({ ...VIEWPORT, height: Math.max(height + 40, 900) });
  await sleep(250);
  await page.screenshot({ path: outFile, type: "png" });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: VIEWPORT,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  console.log(">> Logging in…");
  await login(page);

  const PAGES = buildPages();
  const captured = [];

  for (const spec of PAGES) {
    try {
      const url = BASE + spec.path;
      console.log(`   ${spec.id} ${url}${spec.act ? " + act" : ""}`);
      if (spec.needsAuth === false) {
        await page.evaluate(() => localStorage.clear());
      }
      await page.goto(url, { waitUntil: "networkidle0" });
      await page.setViewport(VIEWPORT);
      await sleep(700);
      if (spec.act) await spec.act(page);
      await sleep(300);
      const file = `${OUT}/${spec.id}.png`;
      await captureFullPage(page, file, spec.isModal);
      captured.push({ ...spec, file: `screenshots/${spec.id}.png` });

      if (spec.needsAuth === false) {
        await login(page);
      }
    } catch (e) {
      console.error(`!! ${spec.id} failed:`, e.message);
    }
  }

  await browser.close();

  // Build INDEX.html
  const html = renderIndex(captured);
  await writeFile(resolve(ROOT, "review", "INDEX.html"), html);
  console.log(`\n>> ${captured.length} screenshots saved to ${OUT}`);
  console.log(`>> Open: ${resolve(ROOT, "review", "INDEX.html")}`);
}

function renderIndex(items) {
  const sections = [
    { id: "auth",          h: "Auth",                            match: (it) => /^\d+-login$/.test(it.id) },
    { id: "dashboards",    h: "Executive Dashboard — six pillars", match: (it) => it.id.includes("dashboard-") },
    { id: "drilldowns",    h: "Drilldown modals",                match: (it) => it.id.includes("drill-") || it.id.includes("scope-1") },
    { id: "performance",   h: "Performance — pillar × view matrix", match: (it) => it.group === "performance" },
    { id: "workspace",     h: "Workspace",                       match: (it) => /data-capture|review-approval|properties/.test(it.id) },
    { id: "reporting",     h: "Reporting",                       match: (it) => /reports|certifications/.test(it.id) },
    { id: "engagement",    h: "Engagement",                      match: (it) => /actions|supplier-portal|ai-assistant|guest-engagement/.test(it.id) },
    { id: "admin",         h: "Admin",                           match: (it) => /billing|admin$/.test(it.id) },
  ];

  // Each item lands in the FIRST matching section.
  const buckets = sections.map((s) => ({ ...s, items: [] }));
  outer: for (const it of items) {
    for (const b of buckets) {
      if (b.match(it)) {
        b.items.push(it);
        continue outer;
      }
    }
  }

  const tocLinks = buckets
    .filter((b) => b.items.length)
    .map((b) => `<a href="#${b.id}">${b.h.replace(/—.*/, "")}</a>`)
    .join("\n");

  const html = buckets
    .filter((b) => b.items.length)
    .map((b) => {
      const cards = b.items
        .map(
          (it) => `
        <a class="card" href="${it.file}" target="_blank">
          <div class="thumb">
            <span class="badge">${it.id.split("-")[0]}</span>
            ${it.isModal ? '<span class="drill">Modal</span>' : ""}
            <img src="${it.file}" loading="lazy"/>
          </div>
          <div class="meta-pad">
            <div class="label">${escapeHtml(it.label)}</div>
            <div class="path">${escapeHtml(it.path)}${it.act ? " · with action" : ""}</div>
          </div>
        </a>`
        )
        .join("\n");
      return `
      <section id="${b.id}">
        <h2>${b.h}</h2>
        <div class="grid">${cards}</div>
      </section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Hotel Optimizer — Page Review</title>
<style>
  :root {
    --brand-700: #0F6A3C;
    --brand-50:  #ECF8F1;
    --ink-900:   #0F172A;
    --ink-700:   #334155;
    --ink-500:   #64748B;
    --ink-200:   #E2E8F0;
    --ink-100:   #F1F5F9;
    --ink-50:    #F7F9FC;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { background: var(--ink-50); color: var(--ink-900); font-family: Inter, system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
  header { background: linear-gradient(135deg, #0F6A3C 0%, #0A4528 100%); color: white; padding: 36px 40px 28px; }
  header .wrap { max-width: 1480px; margin: 0 auto; }
  header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.01em; }
  header p  { margin: 6px 0 0; font-size: 13px; opacity: 0.85; max-width: 720px; }
  header .meta { margin-top: 18px; display: flex; gap: 18px; flex-wrap: wrap; font-size: 12px; }
  header .meta span { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,.12); padding: 4px 10px; border-radius: 999px; }
  main { max-width: 1480px; margin: 0 auto; padding: 28px 32px 60px; }
  nav.toc { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 24px; padding: 14px 16px; background: white; border: 1px solid var(--ink-200); border-radius: 14px; position: sticky; top: 8px; z-index: 10; }
  nav.toc a { font-size: 12px; font-weight: 600; color: var(--ink-700); text-decoration: none; padding: 4px 10px; border-radius: 8px; background: var(--ink-100); }
  nav.toc a:hover { background: var(--brand-50); color: var(--brand-700); }
  section { margin-top: 32px; scroll-margin-top: 80px; }
  section > h2 { margin: 0 0 14px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-500); }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 16px; }
  .card { background: white; border: 1px solid var(--ink-200); border-radius: 14px; overflow: hidden; text-decoration: none; color: inherit; box-shadow: 0 1px 2px rgba(15,23,42,0.04); transition: box-shadow .18s, transform .18s, border-color .18s; display: flex; flex-direction: column; }
  .card:hover { box-shadow: 0 12px 32px rgba(15,23,42,0.10); transform: translateY(-2px); border-color: var(--brand-700); }
  .thumb { aspect-ratio: 16/10; background: var(--ink-50); overflow: hidden; border-bottom: 1px solid var(--ink-200); position: relative; }
  .thumb img { width: 100%; height: 100%; object-fit: cover; object-position: top; display: block; }
  .thumb .badge { position: absolute; top: 10px; left: 10px; background: rgba(15,23,42,0.78); color: white; padding: 3px 8px; font-size: 11px; font-weight: 600; border-radius: 6px; backdrop-filter: blur(4px); font-family: ui-monospace, SFMono-Regular, monospace; }
  .thumb .drill { position: absolute; top: 10px; right: 10px; background: var(--brand-700); color: white; padding: 3px 8px; font-size: 10px; font-weight: 700; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.04em; }
  .meta-pad { padding: 12px 16px; }
  .label { font-size: 14px; font-weight: 700; }
  .path  { font-size: 11px; color: var(--ink-500); margin-top: 4px; font-family: ui-monospace, SFMono-Regular, monospace; word-break: break-all; }
  footer { margin-top: 48px; padding-top: 18px; border-top: 1px solid var(--ink-200); color: var(--ink-500); font-size: 12px; text-align: center; }
</style>
</head>
<body>
  <header>
    <div class="wrap">
      <h1>Hotel Optimizer — Page Review</h1>
      <p>${items.length} full-page screenshots from the running app, including the new pillar-first <code>/performance/:pillar/:view</code> matrix. Click a thumbnail to open the original PNG.</p>
      <div class="meta">
        <span>● ${items.length} screens</span>
        <span>● 6 pillars</span>
        <span>● Captured at 1440 × full-height @ 2× DPR</span>
      </div>
    </div>
  </header>
  <main>
    <nav class="toc">${tocLinks}</nav>
    ${html}
    <footer>
      Captured from <code>http://localhost:5173</code>. Click any thumbnail to open the full-resolution PNG.
    </footer>
  </main>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
