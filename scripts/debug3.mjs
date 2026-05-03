import puppeteer from "puppeteer";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto("http://localhost:5173/login", { waitUntil: "networkidle0" });
await page.type("input[type=email]", "admin@demo.test");
await page.type("input[type=password]", "demo123!");
await page.click("button[type=submit]");
await page.waitForFunction(() => location.pathname !== "/login");
await sleep(1500);
await page.goto("http://localhost:5173/", { waitUntil: "networkidle0" });
await sleep(1500);

const before = await page.evaluate(() => {
  return {
    cards: [...document.querySelectorAll("button.card")].slice(0, 6).map((b) => (b.textContent || "").trim().slice(0, 60)),
    govButtons: [...document.querySelectorAll("button")]
      .filter((b) => (b.textContent || "").trim() === "Governance")
      .length,
  };
});
console.log("BEFORE", before);

await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => (b.textContent || "").trim() === "Governance"
  );
  if (btn) {
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  }
});
await sleep(1500);

const after = await page.evaluate(() => {
  return {
    cards: [...document.querySelectorAll("button.card")].slice(0, 6).map((b) => (b.textContent || "").trim().slice(0, 60)),
  };
});
console.log("AFTER", after);

await browser.close();
