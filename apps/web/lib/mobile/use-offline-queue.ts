"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { usePlatform } from "@fieldforge/platform";
import {
  getOfflineQueue,
  getPendingCount,
  OFFLINE_QUEUE_EVENT,
  syncOfflineQueue,
  type OfflineQueueItem,
} from "./offline-queue";

export function useOfflineQueue() {
  const { client } = useAuth();
  const { isOnline } = usePlatform();
  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(() => {
    setQueue(getOfflineQueue());
    setPendingCount(getPendingCount());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(OFFLINE_QUEUE_EVENT, refresh);
    return () => window.removeEventListener(OFFLINE_QUEUE_EVENT, refresh);
  }, [refresh]);

  useEffect(() => {
    const onOnline = () => {
      if (getPendingCount() === 0) return;
      void (async () => {
        setSyncing(true);
        try {
          await syncOfflineQueue(client);
        } finally {
          setSyncing(false);
          refresh();
        }
      })();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [client, refresh]);

  const forceSync = useCallback(async () => {
    if (!isOnline) return { synced: 0, failed: pendingCount };
    setSyncing(true);
    try {
      return await syncOfflineQueue(client);
    } finally {
      setSyncing(false);
      refresh();
    }
  }, [client, isOnline, pendingCount, refresh]);

  return { queue, pendingCount, syncing, forceSync, refresh };
}
