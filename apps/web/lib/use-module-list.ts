"use client";

import { useEffect, useState } from "react";
import type { FieldForgeClient } from "@fieldforge/sdk";
import { useAppPage } from "@/lib/use-app-page";

/** Normalize list endpoint `data` — SDK also guards, this is defense in depth for pages. */
export function listData<T>(data: T[] | null | undefined): T[] {
  return data ?? [];
}

/**
 * Fetch a tenant list endpoint and keep state as a non-null array.
 * Pass a stable fetcher, e.g. `(c) => c.listJobs()`.
 */
export function useModuleList<T>(
  fetcher: (client: FieldForgeClient) => Promise<{ data: T[] | null | undefined }>,
  deps: readonly unknown[] = [],
): T[] {
  const { client, token } = useAppPage();
  const [items, setItems] = useState<T[]>([]);

  useEffect(() => {
    if (!token) return;
    fetcher(client)
      .then((r) => setItems(listData(r.data)))
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls extra deps
  }, [token, client, fetcher, ...deps]);

  return items;
}
