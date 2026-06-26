"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { RecurringClean } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, IconSparkles } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

export default function RecurringCleansPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.recurringCleans");
  const tc = useTranslations("modules.common");
  const [items, setItems] = useState<RecurringClean[]>([]);
  const [frequency, setFrequency] = useState("weekly");
  const [phase, setPhase] = useState("final");

  useEffect(() => {
    if (token) client.listRecurringCleans().then((r) => setItems(r.data ?? [])).catch(console.error);
  }, [token, client]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rc = await client.createRecurringClean({ frequency, phase });
    setItems((prev) => [rc, ...prev]);
  }

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <Card>
        <CardHeader><CardTitle>{t("addTitle")}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-3 sm:items-end">
            <div className="form-field">
              <label className="form-label">{tc("frequency")}</label>
              <select className="form-select" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                <option value="weekly">{tc("weekly")}</option>
                <option value="biweekly">{tc("biweekly")}</option>
                <option value="monthly">{tc("monthly")}</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">{tc("phase")}</label>
              <select className="form-select" value={phase} onChange={(e) => setPhase(e.target.value)}>
                <option value="rough">{tc("rough")}</option>
                <option value="final">{tc("final")}</option>
                <option value="premium">{tc("premium")}</option>
              </select>
            </div>
            <Button type="submit">{t("addSchedule")}</Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 space-y-3">
        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><IconSparkles size={28} className="text-[var(--brand-text-muted)]" /></div>
            <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
          </div>
        ) : (
          items.map((rc, i) => (
            <Card key={rc.id} className="list-item-card stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
              <CardContent className="flex justify-between py-4">
                <div>
                  <div className="font-medium">
                    {t("frequencyPhase", {
                      frequency: tc(rc.frequency as "weekly" | "biweekly" | "monthly") || rc.frequency,
                      phase: tc(rc.phase as "rough" | "final" | "premium") || rc.phase,
                    })}
                  </div>
                  {rc.next_occurrence && (
                    <div className="text-sm text-[var(--brand-text-secondary)]">
                      {tc("next")}: {rc.next_occurrence}
                    </div>
                  )}
                </div>
                <Badge tone={rc.active ? "success" : "default"}>{rc.active ? tc("active") : tc("inactive")}</Badge>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </ModulePage>
  );
}
