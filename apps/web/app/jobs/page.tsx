"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Job } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, IconCalendar } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

export default function JobsPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.jobs");
  const tc = useTranslations("modules.common");
  const locale = useLocale();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  useEffect(() => {
    if (token) client.listJobs().then((r) => setJobs(r.data ?? [])).catch(console.error);
  }, [token, client]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const job = await client.createJob({
      title,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
    });
    setJobs((prev) => [job, ...prev]);
    setTitle("");
    setScheduledAt("");
  }

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <Card>
        <CardHeader>
          <CardTitle>{t("scheduleTitle")}</CardTitle>
          <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">{t("scheduleDescription")}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div className="form-field">
              <label className="form-label" htmlFor="job-title">{tc("title")}</label>
              <Input
                id="job-title"
                placeholder={t("titlePlaceholder")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="job-date">{t("scheduled")}</label>
              <Input
                id="job-date"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            <Button type="submit" className="sm:mb-0.5">{t("scheduleButton")}</Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 space-y-3">
        {jobs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <IconCalendar size={28} className="text-[var(--brand-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
            <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
          </div>
        ) : (
          jobs.map((job, i) => (
            <Card key={job.id} className="list-item-card stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div>
                  <div className="font-medium">{job.title}</div>
                  {job.scheduled_at && (
                    <div className="text-sm text-[var(--brand-text-secondary)]">
                      {new Date(job.scheduled_at).toLocaleString(locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </div>
                  )}
                </div>
                <Badge tone={job.status === "completed" ? "success" : "default"}>{job.status}</Badge>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </ModulePage>
  );
}
