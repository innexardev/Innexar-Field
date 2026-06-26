import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { FieldForgeClient } from "./index";

const BASE = "http://api.test/v1";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("FieldForgeClient users", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("listUsers returns tenant workspace members", async () => {
    globalThis.fetch = async (input) => {
      assert.match(String(input), /\/users$/);
      return jsonResponse({
        data: [
          {
            id: "u-1",
            email: "owner@example.com",
            role: "owner",
            first_name: "Ada",
            last_name: "Lovelace",
            created_at: "2026-01-01T00:00:00Z",
          },
        ],
      });
    };

    const client = new FieldForgeClient(BASE, "tok");
    const result = await client.listUsers();
    assert.equal(result.data.length, 1);
    assert.equal(result.data[0].email, "owner@example.com");
    assert.equal(result.data[0].role, "owner");
  });
});
