import { expect, test } from "@playwright/test";
import { gotoReady } from "./helpers";

test.describe("public site", () => {
  test("home page presents the value proposition and search", async ({ page }) => {
    await gotoReady(page, "/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/every opportunity/i);
    await expect(page.getByRole("link", { name: /skip to content/i })).toBeAttached();
    await page.getByPlaceholder(/role, employer or keyword/i).fill("analyst");
    await page.getByRole("button", { name: /^search$/i }).click();
    await expect(page.locator("#listings")).toBeInViewport();
  });

  test("opportunity board filters and sorts", async ({ page }) => {
    await gotoReady(page, "/opportunities");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "Top listings" }).click();
    await expect(page.getByRole("button", { name: "Top listings" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.getByLabel(/date posted/i).selectOption("7");
    await expect(page.getByText(/results/i).first()).toBeVisible();
  });

  test("developer services page offers WhatsApp, call and email", async ({ page }) => {
    await gotoReady(page, "/developer-services");
    await expect(page.getByText("Chrishent Matakala Mutondo").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /chat on whatsapp/i })).toHaveAttribute(
      "href",
      /wa\.me\/260976911338/,
    );
    await expect(page.locator('a[href="tel:+260976911338"]')).toBeVisible();
    await expect(
      page.locator('a[href="mailto:chrishentmatakala@yahoo.com"]').first(),
    ).toBeVisible();
    await expect(page.locator('a[href="https://github.com/chrimztech"]').first()).toBeVisible();
  });

  test("sitemap lists public pages", async ({ request, baseURL }) => {
    const response = await request.get(`${baseURL}/sitemap.xml`);
    expect(response.headers()["content-type"]).toContain("application/xml");
    expect(await response.text()).toContain("/opportunities</loc>");
  });

  test("unknown pages show a helpful 404", async ({ page }) => {
    await gotoReady(page, "/this-page-does-not-exist");
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByRole("link", { name: /browse opportunities/i })).toBeVisible();
  });
});
