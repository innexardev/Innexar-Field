"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { CleanJob } from "@fieldforge/sdk";
import { Badge, Card, CardContent, IconCalendar, IconSparkles } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

export default function CleaningJobsPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.cleaningJobs");
  const tc = useTranslations("modules.common");
  const locale = useLocale();
  const [jobs, setJobs] = useState<CleanJob[]>([]);
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);

  function formatTime(iso?: string) {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  }

  function formatTodayLabel(dateKey: string) {
    const today = new Date().toLocaleDateString("en-CA");
    if (dateKey === today) return tc("today");
    return new Date(`${dateKey}T12:00:00`).toLocaleDateString(locale, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }

  useEffect(() => {
    if (!token) return;
    client
      .listTodayCleans()
      .then((r) => {
        setJobs(r.data ?? []);
        setDate(r.date);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, client]);

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <div className="mb-6 flex items-center gap-2 text-sm text-[var(--brand-text-secondary)]">
        <IconCalendar size={16} />
        <span>{date ? formatTodayLabel(date) : tc("today")}</span>
        {!loading && <Badge>{tc("countScheduled", { count: jobs.length })}</Badge>}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--brand-text-muted)]">{t("loadingSchedule")}</p>
      ) : jobs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <IconSparkles size={28} className="text-[var(--brand-text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
          <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">
            {t.rich("emptyDescription", {
              jobsLink: (chunks) => (
                <Link href="/jobs" className="text-[var(--brand-accent)] hover:underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job, i) => (
            <Link key={job.id} href={`/cleaning/jobs/${job.id}`}>
              <Card className="list-item-card stagger-item transition-shadow hover:shadow-md" style={{ animationDelay: `${i * 40}ms` }}>
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="flex items-center gap-4">
                    {job.scheduled_at && (
                      <div className="w-16 shrink-0 text-sm font-medium text-[var(--brand-accent)]">
                        {formatTime(job.scheduled_at)}
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{job.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-[var(--brand-text-secondary)]">
                        {job.phase && <span>{tc("phaseSuffix", { phase: job.phase })}</span>}
                        <span>{tc("checklistProgress", { done: job.checklist_done, total: job.checklist_total })}</span>
                      </div>
                    </div>
                  </div>
                  <Badge tone={job.status === "completed" ? "success" : "default"}>{job.status}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </ModulePage>
  );
}
