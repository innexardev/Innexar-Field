import { expect, test } from "@playwright/test";
import { apiBase } from "./helpers";

const platformAdmin = {
  email: process.env.PLATFORM_ADMIN_EMAIL ?? "admin@fieldforge.local",
  password: process.env.PLATFORM_ADMIN_PASSWORD ?? "Admin123!",
};

test.describe("Platform admin smoke", () => {
  test("login, plan CRUD, tenant list", async ({ request }) => {
    const apiV1 = `${apiBase}/api/v1`;

    const loginRes = await request.post(`${apiV1}/platform/auth/login`, {
      data: { email: platformAdmin.email, password: platformAdmin.password },
    });
    expect(loginRes.ok(), await loginRes.text()).toBeTruthy();
    const loginBody = await loginRes.json();
    const token = loginBody.token as string;
    expect(token).toBeTruthy();
    expect(loginBody.admin?.email).toBe(platformAdmin.email);

    const auth = { Authorization: `Bearer ${token}` };
    const planId = `smoke-${Date.now()}`;

    const createRes = await request.post(`${apiV1}/platform/plans`, {
      headers: auth,
      data: { id: planId, name: "Smoke Test Plan" },
    });
    expect(createRes.status(), await createRes.text()).toBe(201);

    const listRes = await request.get(`${apiV1}/platform/plans`, { headers: auth });
    expect(listRes.ok(), await listRes.text()).toBeTruthy();
    const listBody = (await listRes.json()) as { data: { id: string }[] };
    expect(listBody.data.some((plan) => plan.id === planId)).toBeTruthy();

    const deleteRes = await request.delete(`${apiV1}/platform/plans/${planId}`, {
      headers: auth,
    });
    expect(deleteRes.status(), await deleteRes.text()).toBe(204);

    const tenantsRes = await request.get(`${apiV1}/platform/tenants`, { headers: auth });
    expect(tenantsRes.status(), await tenantsRes.text()).toBe(200);
  });
});
