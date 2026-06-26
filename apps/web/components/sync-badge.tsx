"use client";

import Link from "next/link";
import { useOfflineQueue } from "@/lib/mobile/use-offline-queue";
import { usePlatform } from "@fieldforge/platform";

export function SyncBadge({ surface = false }: { surface?: boolean }) {
  const { pendingCount, syncing } = useOfflineQueue();
  const { isOnline } = usePlatform();

  const tone = !isOnline ? "offline" : pendingCount > 0 ? "pending" : "synced";
  const label =
    !isOnline ? "Offline" : syncing ? "Syncing…" : pendingCount > 0 ? `${pendingCount} pending` : "Synced";

  return (
    <Link
      href="/m/sync"
      className={`mobile-sync-badge mobile-sync-badge--${tone}${surface ? " mobile-sync-badge--surface" : ""}`}
      aria-label={`Sync status: ${label}`}
    >
      <span className="mobile-sync-badge__dot" aria-hidden />
      {label}
    </Link>
  );
}
