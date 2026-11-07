import { expect, test } from "@playwright/test";
import { PASSWORD, signIn, gotoReady } from "./helpers";

/**
 * Staff publish a real multi-position advert: free-form opportunity details keep their layout, and the listing
 * carries several application emails (To and CC) that the "Email your application" button fills in.
 */
test("staff publish a multi-position advert with full details and several emails", async ({
  page,
}) => {
  const adminEmail = process.env["E2E_ADMIN_EMAIL"];
  const adminPassword = process.env["E2E_ADMIN_PASSWORD"] ?? PASSWORD;
  test.skip(!adminEmail, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run the staff steps.");
  const title = `MULTIPLE POSITIONS – KINGSWORTH GROUP LIMITED ${Date.now()}`;
  const details = [
    "## Available Positions",
    "",
    "1. Instrumentation Engineer – 1 Position",
    "2. R/O Operator – 2 Positions",
    "5. Mechanical Fitter – 4 Positions",
    "",
    "## How to Apply",
    "",
    "Address applications to:",
    "The Human Resource Manager",
    "Kingsworth Group Limited",
  ].join("\n");

  await signIn(page, adminEmail!, adminPassword);
  await gotoReady(page, "/employers/post");

  await page.getByLabel(/opportunity title/i).fill(title);
  const category = page.getByLabel(/^category/i);
  await expect(category.locator("option")).not.toHaveCount(1);
  await category.selectOption({ index: 1 });
  await page.getByLabel(/^organisation/i).fill("Kingsworth Group Limited");
  const closing = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  await page.getByLabel(/closing date/i).fill(closing);

  // Email is the default route: one "To" address, then another "To" and a CC.
  await page.getByLabel("Email address for applications").fill("miyoba@kingsworth.co.zm");
  await page.getByRole("button", { name: /add another email/i }).click();
  await page.getByLabel("Email 2", { exact: true }).fill("hr@kingsworth.co.zm");
  await page.getByRole("button", { name: /add another email/i }).click();
  await page.getByLabel("Email 3 type").selectOption("cc");
  await page.getByLabel("Email 3", { exact: true }).fill("recruitment@kingsworth.co.zm");

  await page
    .getByLabel(/^summary/i)
    .fill("Contract roles in Lusaka MFEZ. Up to ZMW 8,000 per month.");
  await page.getByLabel("Opportunity details").fill(details);
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.getByRole("heading", { name: "Available Positions" })).toBeVisible();

  await page.getByText("Publish immediately").click();
  await page.getByRole("button", { name: /publish now/i }).click();
  await expect(page.getByRole("heading", { name: "Published." })).toBeVisible();

  await page.getByRole("link", { name: /view the listing/i }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.getByRole("heading", { name: "Opportunity details" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How to Apply", exact: true })).toBeVisible();
  // Numbering and line breaks are kept exactly as typed, with no bullets added.
  await expect(
    page.getByText("1. Instrumentation Engineer – 1 Position\n2. R/O Operator – 2 Positions", {
      exact: false,
    }),
  ).toBeVisible();

  const mail = page.getByRole("link", { name: /email your application/i });
  await expect(mail).toHaveAttribute(
    "href",
    /^mailto:miyoba@kingsworth\.co\.zm,hr@kingsworth\.co\.zm\?subject=.*&cc=recruitment%40kingsworth\.co\.zm$/,
  );
  await expect(page.getByText("recruitment@kingsworth.co.zm")).toBeVisible();
});
