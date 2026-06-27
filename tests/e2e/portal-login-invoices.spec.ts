import { expect, test } from "@playwright/test";
import {
  completeOnboardingViaAPI,
  createSentInvoiceForCustomer,
  loginToken,
  portalTokenViaAPI,
  seedPortalAuthStorage,
  setupPortalFixtures,
  signupViaAPI,
  verifyAuthToken,
  waitForPortalInvoices,
} from "./helpers";

test.describe("portal login and invoices", () => {
  test("magic-link login lists sent invoices and mock pay marks paid", async ({ page, request }) => {
    test.setTimeout(process.env.CI ? 120_000 : 90_000);
    const stamp = Date.now();

    const user = await signupViaAPI(request, stamp);
    const staffToken = await loginToken(request, user);
    await completeOnboardingViaAPI(request, staffToken);
    await verifyAuthToken(request, staffToken);

    const portal = await setupPortalFixtures(request, staffToken, stamp);
    const invoice = await createSentInvoiceForCustomer(request, staffToken, portal.customerId);

    const portalToken = await portalTokenViaAPI(request, portal.customerEmail, portal.tenantSlug);
    await seedPortalAuthStorage(page, portalToken);
    await waitForPortalInvoices(page);

    await expect(page.getByRole("heading", { level: 1, name: /Your invoices/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(invoice.invoice_number)).toBeVisible();
    await expect(page.getByText("sent")).toBeVisible();

    const payButton = page.getByRole("button").filter({ hasText: /pay/i }).first();
    await expect(payButton).toBeVisible();
    await payButton.click();

    await expect(page.getByText("paid")).toBeVisible({ timeout: 15_000 });
  });

  test("UI magic-link flow reaches invoice list", async ({ page, request }) => {
    test.setTimeout(process.env.CI ? 120_000 : 90_000);
    const stamp = Date.now() + 1;

    const user = await signupViaAPI(request, stamp);
    const staffToken = await loginToken(request, user);
    await completeOnboardingViaAPI(request, staffToken);
    await verifyAuthToken(request, staffToken);

    const portal = await setupPortalFixtures(request, staffToken, stamp);
    const invoice = await createSentInvoiceForCustomer(request, staffToken, portal.customerId);

    await page.goto("/portal/login");
    await page.getByLabel("Email").fill(portal.customerEmail);
    await page.getByLabel("Company code").fill(portal.tenantSlug);
    await page.getByRole("button", { name: "Email me a sign-in link" }).click();

    await page.getByRole("link", { name: "Open sign-in link" }).click();

    await expect(page).toHaveURL(/\/portal\/invoices/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1, name: /Your invoices/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(invoice.invoice_number)).toBeVisible();
  });
});
