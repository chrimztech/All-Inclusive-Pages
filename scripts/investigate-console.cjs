const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const consoleMsgs = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on("console", (msg) => {
    consoleMsgs.push(`[${msg.type()}] ${msg.text().slice(0, 500)}`);
  });
  page.on("pageerror", (err) => pageErrors.push(String(err).slice(0, 800)));
  page.on("requestfailed", (req) =>
    failedRequests.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText}`),
  );
  page.on("response", (res) => {
    if (res.status() >= 500) failedRequests.push(`HTTP ${res.status()} ${res.url()}`);
  });

  await page.goto("http://localhost:5391/opportunities", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(15000);

  console.log("=== PAGE ERRORS ===");
  pageErrors.forEach((e) => console.log(e));
  console.log("=== CONSOLE (errors/warnings) ===");
  consoleMsgs
    .filter((m) => m.startsWith("[error]") || m.startsWith("[warning]"))
    .forEach((m) => console.log(m));
  console.log("=== FAILED REQUESTS ===");
  failedRequests.slice(0, 20).forEach((m) => console.log(m));
  console.log("=== HYDRATED? ===", await page.evaluate(() => document.documentElement.dataset.hydrated));

  await browser.close();
})();
