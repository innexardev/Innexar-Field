"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Job } from "@fieldforge/sdk";
import { Badge, Card, CardContent, IconCalendar } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

export default function SchedulePage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.schedule");
  const tc = useTranslations("modules.common");
  const locale = useLocale();
  const [jobs, setJobs] = useState<Job[]>([]);

  function formatDateKey(iso?: string) {
    if (!iso) return tc("unscheduled");
    const d = new Date(iso);
    return d.toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  function formatTime(iso?: string) {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  }

  useEffect(() => {
    if (token) client.listJobs().then((r) => setJobs(r.data ?? [])).catch(console.error);
  }, [token, client]);

  const grouped = useMemo(() => {
    const map = new Map<string, Job[]>();
    const sorted = [...jobs].sort((a, b) => {
      if (!a.scheduled_at && !b.scheduled_at) return 0;
      if (!a.scheduled_at) return 1;
      if (!b.scheduled_at) return -1;
      return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
    });
    for (const job of sorted) {
      const key = formatDateKey(job.scheduled_at);
      const list = map.get(key) ?? [];
      list.push(job);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [jobs, locale, tc]);

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      {grouped.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <IconCalendar size={28} className="text-[var(--brand-text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
          <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([dateLabel, dayJobs], gi) => (
            <section key={dateLabel} className="stagger-item" style={{ animationDelay: `${gi * 60}ms` }}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-text-muted)]">
                {dateLabel}
              </h2>
              <div className="mt-3 space-y-3">
                {dayJobs.map((job, i) => (
                  <Card key={job.id} className="list-item-card" style={{ animationDelay: `${i * 40}ms` }}>
                    <CardContent className="flex items-center justify-between gap-4 py-4">
                      <div className="flex items-center gap-4">
                        {job.scheduled_at && (
                          <div className="w-16 shrink-0 text-sm font-medium text-[var(--brand-accent)]">
                            {formatTime(job.scheduled_at)}
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{job.title}</div>
                          {job.notes && (
                            <div className="text-sm text-[var(--brand-text-secondary)]">{job.notes}</div>
                          )}
                        </div>
                      </div>
                      <Badge tone={job.status === "completed" ? "success" : "default"}>{job.status}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </ModulePage>
  );
}
