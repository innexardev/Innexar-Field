import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  EXPENSE_POST_PATH,
  TIME_POST_PATH,
  __resetOfflineQueueTestHooks,
  __setApiBaseUrlForTests,
  __setFetchForTests,
  __setQueueStorageForTests,
  enqueueExpense,
  enqueueTimeEntry,
  getOfflineQueue,
  getPendingCount,
  postOrEnqueue,
  removeQueueItem,
  syncOfflineQueue,
} from "./offline-queue";

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

describe("offline-queue", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    storage.setItem("ff_token", "test-token");
    __setQueueStorageForTests(storage);
    __setApiBaseUrlForTests("https://api.test/v1");
  });

  afterEach(() => {
    __resetOfflineQueueTestHooks();
  });

  it("enqueueExpense persists a pending POST for expenses", () => {
    const entry = enqueueExpense({
      description: "Fuel",
      amount_cents: 4500,
      category: "field",
    });

    assert.equal(entry.path, EXPENSE_POST_PATH);
    assert.equal(entry.kind, "expense");
    assert.equal(entry.status, "pending");
    assert.equal(getPendingCount(), 1);
    assert.equal(getOfflineQueue()[0]?.label, "Expense: Fuel ($45.00)");
  });

  it("enqueueTimeEntry persists clock events", () => {
    const entry = enqueueTimeEntry({
      action: "clock_in",
      job_id: "job-12345678",
      recorded_at: "2026-06-25T12:00:00.000Z",
    });

    assert.equal(entry.path, TIME_POST_PATH);
    assert.equal(entry.kind, "time");
    assert.match(entry.label, /Clock in/);
  });

  it("postOrEnqueue queues expense when offline", async () => {
    const result = await postOrEnqueue({
      path: EXPENSE_POST_PATH,
      body: { description: "Supplies", amount_cents: 1200 },
      label: "Expense",
      kind: "expense",
      isOnline: false,
    });

    assert.equal(result.queued, true);
    assert.equal(getPendingCount(), 1);
  });

  it("postOrEnqueue persists failed online expense POSTs", async () => {
    __setFetchForTests(async () => new Response(JSON.stringify({ error: { message: "server down" } }), { status: 503 }));

    const result = await postOrEnqueue({
      path: EXPENSE_POST_PATH,
      body: { description: "Lunch", amount_cents: 1500 },
      label: "Expense",
      kind: "expense",
      isOnline: true,
    });

    assert.equal(result.ok, false);
    assert.equal(result.queued, true);
    const [item] = getOfflineQueue();
    assert.equal(item?.status, "failed");
    assert.equal(item?.error, "server down");
  });

  it("syncOfflineQueue replays pending items in FIFO order", async () => {
    enqueueExpense({ description: "First", amount_cents: 100 });
    enqueueTimeEntry({ action: "clock_out", recorded_at: "2026-06-25T18:00:00.000Z" });

    const calls: string[] = [];
    __setFetchForTests(async (_url, init) => {
      const body = init?.body ? (JSON.parse(String(init.body)) as { description?: string; action?: string }) : {};
      calls.push(body.description ?? body.action ?? "unknown");
      return new Response("{}", { status: 201 });
    });

    const result = await syncOfflineQueue({} as never);

    assert.equal(result.synced, 2);
    assert.equal(result.failed, 0);
    assert.deepEqual(calls, ["First", "clock_out"]);
    assert.equal(getOfflineQueue().length, 0);
  });

  it("syncOfflineQueue marks failures and schedules backoff", async () => {
    enqueueExpense({ description: "Retry me", amount_cents: 500 });

    __setFetchForTests(async () => new Response(JSON.stringify({ error: { message: "temporary" } }), { status: 503 }));

    const result = await syncOfflineQueue({} as never);

    assert.equal(result.synced, 0);
    assert.equal(result.failed, 1);
    const [item] = getOfflineQueue();
    assert.equal(item?.status, "failed");
    assert.equal(item?.retryCount, 1);
    assert.ok(item?.nextRetryAt);
  });

  it("removeQueueItem drops a failed entry", () => {
    const entry = enqueueExpense({ description: "Stale", amount_cents: 200 }, "failed", "old error");
    removeQueueItem(entry.id);
    assert.equal(getOfflineQueue().length, 0);
  });
});
