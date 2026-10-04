import { chromium } from "@playwright/test";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("console", (message) => console.log("CONSOLE", message.type(), message.text()));
page.on("pageerror", (error) => console.log("PAGEERROR", error.message));
page.on("requestfailed", (request) =>
  console.log("FAILED", request.url(), request.failure()?.errorText),
);
page.on("response", (response) => {
  if (response.url().includes("information-hub")) {
    console.log("RESPONSE", response.status(), response.url());
  }
});
await page.goto("http://localhost:8082/information-hub", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
console.log("HYDRATED", await page.locator("html").getAttribute("data-hydrated"));
console.log("SKELETONS", await page.locator(".skeleton").count());
console.log((await page.locator("body").innerText()).slice(0, 4000));
await page.screenshot({ path: "test-results/information-hub.png", fullPage: true });

await page
  .getByRole("link", { name: /A strong application, before you press send/ })
  .first()
  .click();
await page.waitForLoadState("networkidle");
await page.getByText("Start with the instructions.", { exact: false }).waitFor();
console.log("DETAIL", page.url(), await page.getByRole("heading", { level: 1 }).innerText());

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto("http://localhost:8082/information-hub", { waitUntil: "networkidle" });
await mobile.getByRole("heading", { name: /Practical knowledge/ }).waitFor();
console.log("MOBILE_HORIZONTAL_OVERFLOW", await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth));
await mobile.screenshot({ path: "test-results/information-hub-mobile.png", fullPage: true });
await browser.close();
