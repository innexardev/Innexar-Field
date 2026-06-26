"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Job } from "@fieldforge/sdk";
import { Badge, Card, CardContent } from "@fieldforge/ui";
import { useAuth } from "@/lib/auth-context";
import { usePlatform } from "@fieldforge/platform";
import { cacheJobs, readJobsCache } from "@/lib/mobile/offline-queue";
import { filterTodaysJobs, formatJobTime, formatStatus, statusBadgeTone } from "@/lib/mobile/job-utils";

export default function MobileJobsPage() {
  const { token, client } = useAuth();
  const { isOnline } = usePlatform();
  const router = useRouter();
  const t = useTranslations("modules.mobileJobs");
  const tc = useTranslations("modules.common");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }

    async function load() {
      setLoading(true);
      try {
        if (isOnline) {
          const res = await client.listJobs({ mine: true });
          const todays = filterTodaysJobs(res.data);
          setJobs(todays);
          cacheJobs(res.data);
          setFromCache(false);
        } else {
          const cached = readJobsCache<Job>();
          const all = cached?.jobs ?? [];
          setJobs(filterTodaysJobs(all));
          setFromCache(true);
        }
      } catch {
        const cached = readJobsCache<Job>();
        const all = cached?.jobs ?? [];
        setJobs(filterTodaysJobs(all));
        setFromCache(true);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [token, client, router, isOnline]);

  const subtitle = loading
    ? tc("loading")
    : `${t("subtitle", { count: jobs.length })}${fromCache ? t("subtitleCached") : ""}`;

  return (
    <div className="mobile-page">
      <div className="mobile-page__header">
        <h1 className="mobile-page__title">{t("title")}</h1>
        <p className="mobile-page__subtitle">{subtitle}</p>
      </div>

      <div className="mobile-list">
        {jobs.map((j, i) => (
          <Link key={j.id} href={`/m/jobs/${j.id}`} className="mobile-list__link">
            <Card variant="interactive" className={`stagger-item mobile-job-card`} style={{ animationDelay: `${i * 50}ms` }}>
              <CardContent className="mobile-job-card__content">
                <div className="mobile-job-card__main">
                  <span className="mobile-job-card__title">{j.title}</span>
                  <span className="mobile-job-card__time">{formatJobTime(j.scheduled_at)}</span>
                </div>
                <Badge tone={statusBadgeTone(j.status)}>{formatStatus(j.status)}</Badge>
              </CardContent>
            </Card>
          </Link>
        ))}

        {!loading && jobs.length === 0 && (
          <div className="mobile-empty">
            <p className="mobile-empty__title">{t("emptyTitle")}</p>
            <p className="mobile-empty__text">{t("emptyDescription")}</p>
          </div>
        )}
      </div>

      <Link href="/dashboard" className="mobile-desktop-link">
        {t("openDesktop")}
      </Link>
    </div>
  );
}
