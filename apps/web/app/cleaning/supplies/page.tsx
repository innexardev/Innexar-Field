"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import type { CleaningSupply } from "@fieldforge/sdk";
import { Badge, Card, CardContent, CardHeader, CardTitle, IconSparkles } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

export default function CleaningSuppliesPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.cleaningSupplies");
  const tc = useTranslations("modules.common");
  const [supplies, setSupplies] = useState<CleaningSupply[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const res = await client.listCleaningSupplies();
    setSupplies(res.data);
  }, [token, client]);

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [load]);

  async function updateThreshold(supply: CleaningSupply, value: number) {
    if (Number.isNaN(value) || value < 0) return;
    setSavingId(supply.id);
    try {
      const updated = await client.updateCleaningSupply(supply.id, { reorder_threshold: value });
      setSupplies((prev) => prev.map((s) => (s.id === supply.id ? updated : s)));
    } catch (err) {
      console.error(err);
    } finally {
      setSavingId(null);
    }
  }

  const lowCount = supplies.filter((s) => s.needs_reorder).length;

  return (
    <ModulePage
      title={t("title")}
      subtitle={t("subtitle")}
    >
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone="warning">Stub</Badge>
        {!loading && lowCount > 0 && <Badge tone="warning">{lowCount} below threshold</Badge>}
        <p className="text-sm text-[var(--brand-text-secondary)]">
          Items below the reorder threshold are flagged for restock.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--brand-text-muted)]">Loading supplies…</p>
      ) : supplies.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <IconSparkles size={28} className="text-[var(--brand-text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold">No supplies configured</h3>
          <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">
            Default supply catalog seeds on first load per tenant.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {supplies.map((item, i) => (
            <Card key={item.id} className="stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{item.name}</CardTitle>
                  {item.needs_reorder && <Badge tone="warning">Reorder</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 text-sm text-[var(--brand-text-secondary)]">
                <div>
                  <span>
                    {item.on_hand} {item.unit}
                    {item.on_hand !== 1 ? "s" : ""} on hand
                  </span>
                </div>
                <label className="flex items-center gap-2">
                  <span className="shrink-0">Reorder at</span>
                  <input
                    type="number"
                    min={0}
                    className="w-20 rounded-md border border-[var(--brand-border)] bg-[var(--brand-surface)] px-2 py-1 text-sm text-[var(--brand-text-primary)] outline-none focus:border-[var(--brand-accent)]"
                    value={item.reorder_threshold}
                    disabled={savingId === item.id}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setSupplies((prev) =>
                        prev.map((s) =>
                          s.id === item.id
                            ? { ...s, reorder_threshold: next, needs_reorder: s.on_hand <= next }
                            : s,
                        ),
                      );
                    }}
                    onBlur={(e) => void updateThreshold(item, Number(e.target.value))}
                  />
                  <span>{item.unit}s</span>
                  {savingId === item.id && <span className="text-xs">Saving…</span>}
                </label>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ModulePage>
  );
}
