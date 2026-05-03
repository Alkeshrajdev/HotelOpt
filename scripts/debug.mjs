import puppeteer from "puppeteer";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:5173";

async function login(page) {
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.waitForSelector("input[type=email]");
  await page.type("input[type=email]", "admin@demo.test");
  await page.type("input[type=password]", "demo123!");
  await page.click("button[type=submit]");
  await page.waitForFunction(() => location.pathname !== "/login", { timeout: 15000 });
  await sleep(1500);
}

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await login(page);
await page.goto(BASE + "/", { waitUntil: "networkidle0" });
await sleep(1500);
const info = await page.evaluate(() => {
  const cards = [...document.querySelectorAll("button")];
  return {
    totalButtons: cards.length,
    matching: cards
      .filter((b) => b.className && b.className.includes("card"))
      .map((b) => ({
        cls: b.className.split(" ").slice(0, 4).join(" "),
        text: (b.textContent || "").trim().slice(0, 80),
      }))
      .slice(0, 10),
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
