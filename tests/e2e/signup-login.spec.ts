import { expect, test, type Page } from "@playwright/test";
import {
  apiBase,
  loginViaAPI,
  signupViaAPI,
  type TestUser,
} from "./helpers";

async function loginViaUI(page: Page, user: TestUser) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1, name: /Welcome back,/i })).toBeVisible({
    timeout: 15_000,
  });
}

/** Walk through industry → profile → modules → setup → complete (localStorage wizard). */
async function completeOnboardingWizard(page: Page) {
  await expect(page).toHaveURL(/\/onboarding\/industry/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /What type of work do you do/i })).toBeVisible();

  const packBtn = page.getByRole("button", { name: "Field Services" });
  if ((await packBtn.getAttribute("aria-pressed")) !== "true") {
    await packBtn.click();
  }
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page).toHaveURL(/\/onboarding\/profile/, { timeout: 15_000 });
  await page.locator("#state").selectOption("CA");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page).toHaveURL(/\/onboarding\/modules/, { timeout: 15_000 });
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page).toHaveURL(/\/onboarding\/setup/, { timeout: 15_000 });
  await page.getByRole("button", { name: "Skip for now" }).click();

  await expect(page).toHaveURL(/\/onboarding\/complete/, { timeout: 15_000 });
  await page.getByRole("button", { name: "Go to dashboard" }).click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1, name: /Welcome back,/i })).toBeVisible({
    timeout: 15_000,
  });
}

test.describe("signup and login", () => {
  test("API signup then UI login reaches dashboard", async ({ page, request }) => {
    const user = await signupViaAPI(request);

    const loginRes = await request.post(`${apiBase}/api/v1/auth/login`, {
      data: { email: user.email, password: user.password },
    });
    expect(loginRes.ok(), await loginRes.text()).toBeTruthy();
    const loginBody = await loginRes.json();
    expect(loginBody.token).toBeTruthy();
    expect(loginBody.user.email).toBe(user.email);

    await loginViaUI(page, user);
  });

  test("UI signup flow reaches onboarding then dashboard", async ({ page }) => {
    test.setTimeout(90_000);
    const stamp = Date.now();
    const email = `e2e-ui-${stamp}@example.com`;
    const password = "e2e-password-123";
    const company = `E2E UI Co ${stamp}`;

    await page.goto("/signup");
    await page.getByLabel("Company name").fill(company);
    await page.getByLabel("Work email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Create workspace" }).click();

    await completeOnboardingWizard(page);
  });
});

test.describe("module smoke tests", () => {
  let user: TestUser;

  test.beforeEach(async ({ request }) => {
    user = await signupViaAPI(request, Date.now() + Math.floor(Math.random() * 10000));
  });

  test("customers page loads and can add a customer", async ({ page, request }) => {
    await loginViaAPI(page, request, user);

    await page.goto("/customers");
    await expect(page.getByRole("heading", { level: 1, name: "Customers" })).toBeVisible();

    await page.getByLabel("Name").fill("Jane Smith");
    await page.getByLabel("Email").fill("jane@example.com");
    await page.getByRole("button", { name: "Add customer" }).click();

    await expect(page.getByText("Jane Smith")).toBeVisible();
    await expect(page.getByText("jane@example.com")).toBeVisible();
    await expect(page.getByText(/\d+ customers?/)).toBeVisible();
  });

  test("work-orders page loads and can create a work order", async ({ page, request }) => {
    await loginViaAPI(page, request, user);

    await page.goto("/work-orders");
    await expect(page.getByRole("heading", { level: 1, name: "Work Orders" })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByLabel("Title").fill("HVAC repair — Unit 4B");
    await page.getByRole("button", { name: "Create" }).click();

    await expect(page.getByText("HVAC repair — Unit 4B")).toBeVisible();
  });

  test("expenses page loads and can log an expense", async ({ page, request }) => {
    await loginViaAPI(page, request, user);

    await page.goto("/expenses");
    await expect(page.getByRole("heading", { level: 1, name: "Expenses" })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByLabel("Description").fill("Fuel — Job #1024");
    await page.getByLabel("Amount (USD)").fill("45.00");
    await page.getByRole("button", { name: "Add" }).click();

    await expect(page.getByText("Fuel — Job #1024")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("pending")).toBeVisible();
  });

  test("dashboard quick links navigate to key modules", async ({ page, request }) => {
    await loginViaAPI(page, request, user);

    await page.getByRole("link", { name: "Customers" }).first().click();
    await expect(page).toHaveURL(/\/customers/);
    await expect(page.getByRole("heading", { level: 1, name: "Customers" })).toBeVisible();

    await page.goto("/dashboard");
    await page.getByRole("link", { name: "Jobs", exact: true }).first().click();
    await expect(page).toHaveURL(/\/jobs/);
    await expect(page.getByRole("heading", { level: 1, name: "Jobs" })).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/dashboard");
    await page.getByRole("link", { name: "Estimates", exact: true }).first().click();
    await expect(page).toHaveURL(/\/estimates/);
    await expect(page.getByRole("heading", { level: 1, name: "Estimates" })).toBeVisible({
      timeout: 15_000,
    });
  });
});
