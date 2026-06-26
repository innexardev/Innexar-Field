import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeListPayload } from "./index";

describe("normalizeListPayload", () => {
  it("coerces null data to empty array", () => {
    const out = normalizeListPayload({ data: null });
    assert.deepEqual(out, { data: [] });
  });

  it("coerces null nested list fields", () => {
    const out = normalizeListPayload({
      data: [{ id: "1", rooms: null }],
      columns: null,
    });
    assert.deepEqual(out, {
      data: [{ id: "1", rooms: [] }],
      columns: [],
    });
  });

  it("leaves non-list null fields unchanged", () => {
    const out = normalizeListPayload({ summary: null });
    assert.deepEqual(out, { summary: null });
  });
});
