import { expect, test } from "@playwright/test";
import { registerViaApi, signIn, uniqueEmail, gotoReady } from "./helpers";

/** Safety nets around user data: unsaved-edit warnings, the offline notice and email unsubscribe links. */
test.describe("safeguards", () => {
  test("leaving a form with unsaved edits asks first", async ({ page, request }) => {
    const email = uniqueEmail("unsaved");
    await registerViaApi(request, "CANDIDATE", "E2E Unsaved", email);
    await signIn(page, email);
    await gotoReady(page, "/candidate/profile");

    const headline = page.getByLabel("Headline");
    await headline.fill("Agronomist, 6 years in Mkushi");
    await page.getByRole("link", { name: "Saved", exact: true }).first().click();

    const dialog = page.getByRole("alertdialog", { name: "Leave without saving?" });
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("button", { name: "Keep editing" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/candidate\/profile$/);
    await expect(headline).toHaveValue("Agronomist, 6 years in Mkushi");

    // Once saved, navigation is free again.
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile saved.")).toBeVisible();
    await page.getByRole("link", { name: "Saved", exact: true }).first().click();
    await expect(page).toHaveURL(/\/candidate\/saved$/);
  });

  test("losing the connection shows a notice that clears on reconnect", async ({
    page,
    context,
  }) => {
    await gotoReady(page, "/opportunities");
    await context.setOffline(true);
    await expect(page.getByText("You're offline")).toBeVisible();
    await context.setOffline(false);
    await expect(page.getByText("Back online")).toBeVisible();
    await expect(page.getByText("Back online")).toBeHidden({ timeout: 8000 });
  });

  test("an invalid unsubscribe link explains what to do instead", async ({ page }) => {
    await gotoReady(page, "/unsubscribe?token=bm90.cmVhbA");
    await expect(page.getByRole("alert")).toContainText("not valid");
    await expect(page.getByRole("link", { name: /account settings/i })).toBeVisible();
  });
});
