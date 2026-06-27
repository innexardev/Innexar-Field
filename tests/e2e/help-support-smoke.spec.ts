import { expect, test } from "@playwright/test";
import { loginViaAPI, signupViaAPI, type TestUser } from "./helpers";

test.describe("help center smoke", () => {
  let user: TestUser;

  test.beforeEach(async ({ request }) => {
    user = await signupViaAPI(request, Date.now() + Math.floor(Math.random() * 10_000));
  });

  test("help hub loads and navigates to support", async ({ page, request }) => {
    await loginViaAPI(page, request, user);

    await page.goto("/help");
    await expect(page.getByRole("heading", { level: 1, name: "Help center" })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("link", { name: /Contact our team or submit a ticket/i }).click();
    await expect(page).toHaveURL(/\/help\/support/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1, name: "Support" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Submit a ticket" })).toBeVisible();
  });

  test("support ticket form submits and appears in ticket list", async ({ page, request }) => {
    test.setTimeout(60_000);
    const stamp = Date.now();
    const subject = `E2E support ${stamp}`;
    const message = `Playwright smoke ticket created at ${stamp}`;

    await loginViaAPI(page, request, user);

    await page.goto("/help/support");
    await expect(page.getByRole("heading", { level: 1, name: "Support" })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByLabel("Subject").fill(subject);
    await page.getByLabel("Message").fill(message);

    const createReady = page.waitForResponse(
      (r) =>
        r.url().includes("/support/tickets") &&
        r.request().method() === "POST" &&
        r.status() === 201,
      { timeout: 30_000 },
    );
    await page.getByRole("button", { name: "Send ticket" }).click();
    await createReady;

    await expect(page.getByText(/Ticket received/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(subject)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(message)).toBeVisible();
  });
});
