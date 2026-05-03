// Re-capture the 3 drilldown screenshots that failed in capture.mjs.
import puppeteer from "puppeteer";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = resolve(ROOT, "review", "screenshots");
const BASE = "http://localhost:5173";
const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 2 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(page) {
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.waitForSelector("input[type=email]");
  await page.type("input[type=email]", "admin@demo.test");
  await page.type("input[type=password]", "demo123!");
  await page.click("button[type=submit]");
  await page.waitForFunction(() => location.pathname !== "/login", { timeout: 15000 });
  await sleep(1000);
}

async function clickTileByText(page, text) {
  // Wait until at least one tile is rendered (auth + dashboard finish)
  await page.waitForFunction(
    () => document.querySelectorAll("button.card").length > 0,
    { timeout: 10000 }
  );
  const ok = await page.evaluate((t) => {
    const tiles = [...document.querySelectorAll("button.card")];
    const tile = tiles.find((b) =>
      (b.textContent || "").toLowerCase().includes(t.toLowerCase())
    );
    if (!tile) return false;
    tile.scrollIntoView({ block: "center" });
    tile.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true })
    );
    return true;
  }, text);
  if (!ok) throw new Error(`tile not found: ${text}`);
  await sleep(600);
}

async function clickPillarTab(page, label) {
  await page.evaluate((t) => {
    const btn = [...document.querySelectorAll("button")].find(
      (b) => b.textContent && b.textContent.trim() === t
    );
    if (btn) btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  }, label);
  await sleep(500);
}

async function captureFullPage(page, file) {
  const main = await page.$("main");
  let height = 900;
  if (main) {
    height = await page.evaluate((el) => el.scrollHeight, main);
  }
  await page.setViewport({ ...VIEWPORT, height: Math.max(height + 40, 900) });
  await sleep(300);
  await page.screenshot({ path: file, type: "png" });
}

async function captureModal(page, file) {
  // For modal screenshots, use the standard viewport — the modal is centered on top
  await page.setViewport(VIEWPORT);
  await sleep(300);
  await page.screenshot({ path: file, type: "png" });
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

  await login(page);

  /* 08 — Energy Score drilldown (Dashboard, Energy pillar) */
  console.log(">> 08 Energy Score drilldown");
  await page.goto(BASE + "/", { waitUntil: "networkidle0" });
  await sleep(800);
  await clickTileByText(page, "Energy Score");
  await page.waitForSelector("[role=dialog]", { timeout: 5000 });
  await sleep(400);
  await captureModal(page, `${OUT}/08-drill-energy-score.png`);

  /* 09 — Scope 1 drilldown (Carbon Inventory) */
  console.log(">> 09 Scope 1 drilldown");
  await page.goto(BASE + "/carbon-inventory", { waitUntil: "networkidle0" });
  await sleep(800);
  await clickTileByText(page, "Scope 1");
  await page.waitForSelector("[role=dialog]", { timeout: 5000 });
  await sleep(400);
  await captureModal(page, `${OUT}/09-drill-scope-1.png`);

  /* 10 — Attestations drilldown (Dashboard, Governance pillar) */
  console.log(">> 10 Attestations drilldown");
  // Force a full reload to clear any open modals from step 09
  await page.reload({ waitUntil: "networkidle0" });
  await page.goto(BASE + "/", { waitUntil: "networkidle0" });
  await page.waitForFunction(
    () => document.querySelectorAll("button.card").length > 0,
    { timeout: 10000 }
  );
  await sleep(500);
  await clickPillarTab(page, "Governance");
  // Wait until Governance KPIs are rendered
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll("button.card")].some((b) =>
        (b.textContent || "").toLowerCase().includes("attestations")
      ),
    { timeout: 10000 }
  );
  await clickTileByText(page, "Attestations");
  await page.waitForSelector("[role=dialog]", { timeout: 5000 });
  await sleep(400);
  await captureModal(page, `${OUT}/10-drill-attestations.png`);

  await browser.close();
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
