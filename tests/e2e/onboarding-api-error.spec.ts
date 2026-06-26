import { expect, test } from "@playwright/test";
import { loginToken, signupViaAPI } from "./helpers";

async function seedOnboardingSession(
  page: import("@playwright/test").Page,
  token: string,
) {
  await page.goto("/login");
  await page.evaluate((t) => localStorage.setItem("ff_token", t), token);
  const statusReady = page.waitForResponse(
    (r) => r.url().includes("/onboarding/status") && r.status() === 200,
    { timeout: 30_000 },
  );
  await page.goto("/onboarding/industry");
  await statusReady;
}

test.describe("onboarding API persistence", () => {
  test("industry step blocks advance when save API returns error", async ({ page, request }) => {
    test.setTimeout(60_000);

    const user = await signupViaAPI(request);
    const token = await loginToken(request, user);

    await page.route("**/api/v1/onboarding/industry", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: { message: "save failed" } }),
        });
        return;
      }
      await route.continue();
    });

    await seedOnboardingSession(page, token);

    await expect(page.getByRole("heading", { name: /What type of work do you do/i })).toBeVisible({
      timeout: 15_000,
    });

    const packBtn = page.getByRole("button", { name: "Field Services" });
    if ((await packBtn.getAttribute("aria-pressed")) !== "true") {
      await packBtn.click();
    }

    const saveFailed = page.waitForResponse(
      (r) =>
        r.url().includes("/onboarding/industry") &&
        r.request().method() === "POST" &&
        r.status() === 500,
    );
    await page.getByRole("button", { name: "Continue" }).click();
    await saveFailed;

    await expect(page).toHaveURL(/\/onboarding\/industry/, { timeout: 10_000 });
    await expect(page.getByText(/something went wrong on our end/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("heading", { name: /Tell us about your company/i })).not.toBeVisible();
  });
});
