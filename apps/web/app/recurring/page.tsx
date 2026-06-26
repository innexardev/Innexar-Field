"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Crew, RecurringJob } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, IconSparkles } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

export default function RecurringPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.recurring");
  const tc = useTranslations("modules.common");
  const locale = useLocale();
  const [items, setItems] = useState<RecurringJob[]>([]);
  const [crews, setCrews] = useState<Crew[]>([]);
  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const [crewId, setCrewId] = useState("");

  useEffect(() => {
    if (!token) return;
    client.listRecurringJobs().then((r) => setItems(r.data ?? [])).catch(console.error);
    client.listCrews().then((r) => setCrews(r.data ?? [])).catch(console.error);
  }, [token, client]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const created = await client.createRecurringJob({
      title: title || undefined,
      frequency,
      crew_id: crewId || undefined,
    });
    setItems((prev) => [created, ...prev]);
    setTitle("");
    setCrewId("");
  }

  async function toggleActive(item: RecurringJob) {
    const updated = await client.updateRecurringJob(item.id, { active: !item.active });
    setItems((prev) => prev.map((r) => (r.id === item.id ? updated : r)));
  }

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <Card>
        <CardHeader>
          <CardTitle>{t("addTitle")}</CardTitle>
          <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">{t("addDescription")}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <div className="form-field sm:col-span-2">
              <label className="form-label" htmlFor="recurring-title">{tc("title")}</label>
              <Input
                id="recurring-title"
                placeholder={t("titlePlaceholder")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label">{tc("frequency")}</label>
              <select className="form-select" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                <option value="weekly">{tc("weekly")}</option>
                <option value="biweekly">{tc("biweekly")}</option>
                <option value="monthly">{tc("monthly")}</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">{tc("crew")}</label>
              <select className="form-select" value={crewId} onChange={(e) => setCrewId(e.target.value)}>
                <option value="">{tc("unassigned")}</option>
                {crews.map((crew) => (
                  <option key={crew.id} value={crew.id}>{crew.name}</option>
                ))}
              </select>
            </div>
            <Button type="submit" className="lg:col-span-4 lg:w-fit">{t("addButton")}</Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 space-y-3">
        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <IconSparkles size={28} className="text-[var(--brand-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
            <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
          </div>
        ) : (
          items.map((item, i) => (
            <Card key={item.id} className="list-item-card stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div>
                  <div className="font-medium">{item.title}</div>
                  <div className="mt-1 text-sm capitalize text-[var(--brand-text-secondary)]">
                    {tc(item.frequency as "weekly" | "biweekly" | "monthly") || item.frequency}
                    {item.crew_id && crews.find((c) => c.id === item.crew_id) && (
                      <> · {crews.find((c) => c.id === item.crew_id)?.name}</>
                    )}
                  </div>
                  {item.next_occurrence && (
                    <div className="mt-1 text-sm text-[var(--brand-text-muted)]">
                      {t("nextOccurrence", {
                        date: new Date(item.next_occurrence).toLocaleDateString(locale, { dateStyle: "medium" }),
                      })}
                    </div>
                  )}
                  {item.job_id && (
                    <div className="mt-1 text-xs text-[var(--brand-text-muted)]">
                      {tc("linkedJob", { id: item.job_id.slice(0, 8) })}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={item.active ? "success" : "default"}>
                    {item.active ? tc("active") : tc("paused")}
                  </Badge>
                  <Button type="button" variant="secondary" size="sm" onClick={() => toggleActive(item)}>
                    {item.active ? tc("pause") : tc("resume")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </ModulePage>
  );
}
