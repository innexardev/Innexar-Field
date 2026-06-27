import { expect, test } from "@playwright/test";
import { apiBase, loginToken, seedStaffTokenOnly, signupViaAPI } from "./helpers";

test.describe("billing onboarding redirect", () => {
  test("unpaid tenant is redirected from dashboard to onboarding billing", async ({
    page,
    request,
  }) => {
    test.setTimeout(60_000);

    const user = await signupViaAPI(request);
    const token = await loginToken(request, user);

    const statusRes = await request.get(`${apiBase}/api/v1/billing/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(statusRes.ok(), await statusRes.text()).toBeTruthy();
    const status = (await statusRes.json()) as { requires_payment: boolean };
    expect(status.requires_payment).toBe(true);

    await seedStaffTokenOnly(page, token);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/onboarding\/billing/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /Subscribe to continue/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("mock checkout from onboarding billing activates subscription", async ({ page, request }) => {
    test.setTimeout(process.env.CI ? 90_000 : 60_000);

    const user = await signupViaAPI(request, Date.now());
    const token = await loginToken(request, user);
    await seedStaffTokenOnly(page, token);

    await page.goto("/onboarding/billing", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Subscribe to continue/i })).toBeVisible({
      timeout: 15_000,
    });

    const checkoutReady = page.waitForResponse(
      (r) => r.url().includes("/billing/checkout") && r.request().method() === "POST",
      { timeout: 30_000 },
    );
    await page.getByRole("button", { name: "Subscribe and continue" }).click();
    const checkoutRes = await checkoutReady;
    expect(checkoutRes.status()).toBe(200);

    await expect(page).toHaveURL(/\/billing\/success/, { timeout: 30_000 });
    await expect(page.getByText(/Payment successful/i)).toBeVisible({ timeout: 45_000 });

    const deadline = Date.now() + 45_000;
    let active = false;
    while (Date.now() < deadline) {
      const statusRes = await request.get(`${apiBase}/api/v1/billing/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(statusRes.ok(), await statusRes.text()).toBeTruthy();
      const status = (await statusRes.json()) as { requires_payment: boolean };
      if (!status.requires_payment) {
        active = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    expect(active, "mock checkout did not activate subscription").toBe(true);
  });
});
