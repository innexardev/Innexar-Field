import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { PlatformAdminClient } from "./platform-admin";

const BASE = "http://api.test/v1";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("PlatformAdminClient", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("login posts credentials to platform auth", async () => {
    globalThis.fetch = async (input, init) => {
      assert.match(String(input), /\/platform\/auth\/login$/);
      assert.equal(init?.method, "POST");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.email, "ops@fieldforge.com");
      return jsonResponse({
        token: "plat-tok",
        admin: { id: "a1", email: "ops@fieldforge.com" },
      });
    };

    const client = new PlatformAdminClient(BASE);
    const result = await client.login("ops@fieldforge.com", "secret");
    assert.equal(result.token, "plat-tok");
    assert.equal(result.admin.id, "a1");
  });

  it("listPlans sends bearer token", async () => {
    globalThis.fetch = async (input, init) => {
      assert.match(String(input), /\/platform\/plans$/);
      assert.equal(init?.headers && (init.headers as Record<string, string>).Authorization, "Bearer plat-tok");
      return jsonResponse({
        data: [{ id: "starter", name: "Starter", description: "", features: [], active: true, sort_order: 0, created_at: "", updated_at: "" }],
      });
    };

    const client = new PlatformAdminClient(BASE, "plat-tok");
    const result = await client.listPlans();
    assert.equal(result.data[0].id, "starter");
  });

  it("createPromotion posts body", async () => {
    globalThis.fetch = async (input, init) => {
      assert.match(String(input), /\/platform\/promotions$/);
      assert.equal(init?.method, "POST");
      return jsonResponse({ id: "p1", code: "LAUNCH20", active: true, redemption_count: 0, created_at: "", updated_at: "" }, 201);
    };

    const client = new PlatformAdminClient(BASE, "plat-tok");
    const result = await client.createPromotion({ code: "LAUNCH20" });
    assert.equal(result.code, "LAUNCH20");
  });

  it("listAuditLog supports pagination query", async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);
      assert.match(url, /\/platform\/audit-log\?limit=10&offset=20/);
      return jsonResponse({ data: [] });
    };

    const client = new PlatformAdminClient(BASE, "plat-tok");
    await client.listAuditLog({ limit: 10, offset: 20 });
  });
});
