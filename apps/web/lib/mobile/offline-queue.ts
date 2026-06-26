"use client";

import type { FieldForgeClient } from "@fieldforge/sdk";
import { API_URL } from "@/lib/api-url";

const QUEUE_KEY = "ff_offline_queue";
const JOBS_CACHE_KEY = "ff_jobs_cache";
const TOKEN_KEY = "ff_token";

export const EXPENSE_POST_PATH = "/expenses/expenses";
export const TIME_POST_PATH = "/payroll/timesheets";
export const SIGNATURE_POST_PATH = "/scheduling/signatures";
export const VEHICLE_CHECK_POST_PATH = "/scheduling/vehicle-checks";

export type QueueItemStatus = "pending" | "syncing" | "failed";
export type QueueItemKind = "job" | "expense" | "time" | "signature" | "vehicle";

export interface OfflineQueueItem {
  id: string;
  createdAt: string;
  method: "PATCH" | "POST";
  path: string;
  body?: Record<string, unknown>;
  label: string;
  kind?: QueueItemKind;
  status: QueueItemStatus;
  error?: string;
  retryCount?: number;
  nextRetryAt?: string;
}

export interface ExpenseQueueBody {
  description: string;
  amount_cents: number;
  category?: string;
  job_id?: string;
  expense_date?: string;
}

export interface TimeQueueBody {
  action: "clock_in" | "clock_out";
  job_id?: string;
  latitude?: number;
  longitude?: number;
  recorded_at: string;
}

export interface SignatureQueueBody {
  signer_name: string;
  image_data: string;
  job_id?: string;
  source?: "pad" | "camera";
}

export interface VehicleCheckQueueBody {
  vehicle_label: string;
  odometer_miles: number;
  fuel_level?: string;
  tires_ok?: boolean;
  lights_ok?: boolean;
  damage_notes?: string;
  job_id?: string;
}

export const OFFLINE_QUEUE_EVENT = "ff-offline-queue-change";

const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 60_000;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

let queueStorage: StorageLike | null = null;
let fetchImpl: typeof fetch | null = null;
let apiBaseUrl = API_URL;

function getStorage(): StorageLike {
  if (queueStorage) return queueStorage;
  if (typeof window === "undefined") {
    return { getItem: () => null, setItem: () => undefined };
  }
  return localStorage;
}

function getFetch(): typeof fetch {
  if (fetchImpl) return fetchImpl;
  if (typeof fetch === "undefined") {
    throw new Error("fetch is not available");
  }
  return fetch;
}

function emitChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_EVENT));
  }
}

function readQueue(): OfflineQueueItem[] {
  try {
    const raw = getStorage().getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as OfflineQueueItem[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: OfflineQueueItem[]) {
  getStorage().setItem(QUEUE_KEY, JSON.stringify(items));
  emitChange();
}

export function getOfflineQueue(): OfflineQueueItem[] {
  return readQueue();
}

export function getPendingCount(): number {
  return readQueue().filter((item) => item.status === "pending" || item.status === "failed").length;
}

export function enqueueOffline(item: Omit<OfflineQueueItem, "id" | "createdAt" | "status">): OfflineQueueItem {
  const entry: OfflineQueueItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: "pending",
    retryCount: 0,
  };
  const queue = readQueue();
  queue.push(entry);
  writeQueue(queue);
  return entry;
}

export function enqueueExpense(
  body: ExpenseQueueBody,
  status: QueueItemStatus = "pending",
  error?: string,
): OfflineQueueItem {
  const amount = (body.amount_cents / 100).toFixed(2);
  const entry: OfflineQueueItem = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    method: "POST",
    path: EXPENSE_POST_PATH,
    body: body as unknown as Record<string, unknown>,
    label: `Expense: ${body.description} ($${amount})`,
    kind: "expense",
    status,
    error,
    retryCount: 0,
  };
  const queue = readQueue();
  queue.push(entry);
  writeQueue(queue);
  return entry;
}

export function enqueueTimeEntry(
  body: TimeQueueBody,
  status: QueueItemStatus = "pending",
  error?: string,
): OfflineQueueItem {
  const actionLabel = body.action === "clock_in" ? "Clock in" : "Clock out";
  const entry: OfflineQueueItem = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    method: "POST",
    path: TIME_POST_PATH,
    body: body as unknown as Record<string, unknown>,
    label: `${actionLabel}${body.job_id ? ` · job ${body.job_id.slice(0, 8)}` : ""}`,
    kind: "time",
    status,
    error,
    retryCount: 0,
  };
  const queue = readQueue();
  queue.push(entry);
  writeQueue(queue);
  return entry;
}

export function enqueueSignature(
  body: SignatureQueueBody,
  status: QueueItemStatus = "pending",
  error?: string,
): OfflineQueueItem {
  const entry: OfflineQueueItem = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    method: "POST",
    path: SIGNATURE_POST_PATH,
    body: body as unknown as Record<string, unknown>,
    label: `Signature: ${body.signer_name}`,
    kind: "signature",
    status,
    error,
    retryCount: 0,
  };
  const queue = readQueue();
  queue.push(entry);
  writeQueue(queue);
  return entry;
}

export function enqueueVehicleCheck(
  body: VehicleCheckQueueBody,
  status: QueueItemStatus = "pending",
  error?: string,
): OfflineQueueItem {
  const entry: OfflineQueueItem = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    method: "POST",
    path: VEHICLE_CHECK_POST_PATH,
    body: body as unknown as Record<string, unknown>,
    label: `Vehicle: ${body.vehicle_label} (${body.odometer_miles} mi)`,
    kind: "vehicle",
    status,
    error,
    retryCount: 0,
  };
  const queue = readQueue();
  queue.push(entry);
  writeQueue(queue);
  return entry;
}

export function removeQueueItem(id: string) {
  writeQueue(readQueue().filter((item) => item.id !== id));
}

export function clearSyncedQueue() {
  writeQueue(readQueue().filter((item) => item.status === "pending" || item.status === "failed"));
}

export function cacheJobs<T>(jobs: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(JOBS_CACHE_KEY, JSON.stringify({ cachedAt: new Date().toISOString(), jobs }));
}

export function readJobsCache<T>(): { cachedAt: string; jobs: T[] } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(JOBS_CACHE_KEY);
    return raw ? (JSON.parse(raw) as { cachedAt: string; jobs: T[] }) : null;
  } catch {
    return null;
  }
}

function canRetryNow(item: OfflineQueueItem): boolean {
  if (!item.nextRetryAt) return true;
  return new Date(item.nextRetryAt).getTime() <= Date.now();
}

function scheduleBackoff(item: OfflineQueueItem) {
  const retryCount = (item.retryCount ?? 0) + 1;
  const delay = Math.min(BACKOFF_BASE_MS * 2 ** (retryCount - 1), BACKOFF_MAX_MS);
  item.retryCount = retryCount;
  item.nextRetryAt = new Date(Date.now() + delay).toISOString();
}

async function executeQueueItem(item: OfflineQueueItem): Promise<void> {
  const token = getStorage().getItem(TOKEN_KEY);
  if (!token) throw new Error("Not authenticated");

  const res = await getFetch()(`${apiBaseUrl}${item.path}`, {
    method: item.method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: item.body ? JSON.stringify(item.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error((err as { error?: { message?: string } }).error?.message ?? "Sync failed");
  }
}

export async function postOrEnqueue(params: {
  path: string;
  body: Record<string, unknown>;
  label: string;
  kind: QueueItemKind;
  isOnline: boolean;
}): Promise<{ ok: boolean; queued: boolean; error?: string }> {
  if (!params.isOnline) {
    if (params.kind === "expense") {
      enqueueExpense(params.body as unknown as ExpenseQueueBody);
    } else if (params.kind === "time") {
      enqueueTimeEntry(params.body as unknown as TimeQueueBody);
    } else if (params.kind === "signature") {
      enqueueSignature(params.body as unknown as SignatureQueueBody);
    } else if (params.kind === "vehicle") {
      enqueueVehicleCheck(params.body as unknown as VehicleCheckQueueBody);
    } else {
      enqueueOffline({
        method: "POST",
        path: params.path,
        body: params.body,
        label: params.label,
        kind: params.kind,
      });
    }
    return { ok: true, queued: true };
  }

  try {
    await executeQueueItem({
      id: "",
      createdAt: "",
      method: "POST",
      path: params.path,
      body: params.body,
      label: params.label,
      kind: params.kind,
      status: "pending",
    });
    return { ok: true, queued: false };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Request failed";
    if (params.kind === "expense") {
      enqueueExpense(params.body as unknown as ExpenseQueueBody, "failed", message);
    } else if (params.kind === "time") {
      enqueueTimeEntry(params.body as unknown as TimeQueueBody, "failed", message);
    } else if (params.kind === "signature") {
      enqueueSignature(params.body as unknown as SignatureQueueBody, "failed", message);
    } else if (params.kind === "vehicle") {
      enqueueVehicleCheck(params.body as unknown as VehicleCheckQueueBody, "failed", message);
    } else {
      enqueueOffline({
        method: "POST",
        path: params.path,
        body: params.body,
        label: params.label,
        kind: params.kind,
      });
      const queue = readQueue();
      const last = queue[queue.length - 1];
      if (last) {
        last.status = "failed";
        last.error = message;
        writeQueue(queue);
      }
    }
    return { ok: false, queued: true, error: message };
  }
}

export async function syncOfflineQueue(client: FieldForgeClient): Promise<{ synced: number; failed: number }> {
  void client;
  let synced = 0;
  let failed = 0;

  while (true) {
    const queue = readQueue();
    const item = queue.find(
      (entry) => (entry.status === "pending" || entry.status === "failed") && canRetryNow(entry),
    );
    if (!item) break;

    item.status = "syncing";
    item.error = undefined;
    writeQueue(queue);

    try {
      await executeQueueItem(item);
      removeQueueItem(item.id);
      synced++;
    } catch (e) {
      const updated = readQueue();
      const target = updated.find((entry) => entry.id === item.id);
      if (target) {
        target.status = "failed";
        target.error = e instanceof Error ? e.message : "Sync failed";
        scheduleBackoff(target);
        writeQueue(updated);
      }
      failed++;
      break;
    }
  }

  emitChange();
  return { synced, failed };
}

export function __setQueueStorageForTests(storage: StorageLike | null) {
  queueStorage = storage;
}

export function __setFetchForTests(fetchFn: typeof fetch | null) {
  fetchImpl = fetchFn;
}

export function __setApiBaseUrlForTests(url: string) {
  apiBaseUrl = url;
}

export function __resetOfflineQueueTestHooks() {
  queueStorage = null;
  fetchImpl = null;
  apiBaseUrl = API_URL;
}
