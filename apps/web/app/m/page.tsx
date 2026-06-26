"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Job } from "@fieldforge/sdk";
import { Badge, Card, CardContent } from "@fieldforge/ui";
import { useBrand } from "@/components/brand-provider";
import { useAuth } from "@/lib/auth-context";
import { usePlatform } from "@fieldforge/platform";
import { useOfflineQueue } from "@/lib/mobile/use-offline-queue";
import { cacheJobs, readJobsCache } from "@/lib/mobile/offline-queue";
import { filterTodaysJobs } from "@/lib/mobile/job-utils";

export default function MobileHomePage() {
  const brand = useBrand();
  const { token, client, user } = useAuth();
  const { isOnline, platform, isPWA } = usePlatform();
  const { pendingCount, syncing } = useOfflineQueue();
  const router = useRouter();
  const [jobCount, setJobCount] = useState(0);
  const [loading, setLoading] = useState(true);

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
          cacheJobs(res.data);
          setJobCount(filterTodaysJobs(res.data).length);
        } else {
          const cached = readJobsCache<Job>();
          setJobCount(filterTodaysJobs(cached?.jobs ?? []).length);
        }
      } catch {
        const cached = readJobsCache<Job>();
        setJobCount(filterTodaysJobs(cached?.jobs ?? []).length);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [token, client, router, isOnline]);

  const syncLabel = !isOnline
    ? "Offline"
    : syncing
      ? "Syncing…"
      : pendingCount > 0
        ? `${pendingCount} pending`
        : "Synced";

  return (
    <div className="mobile-page">
      <div className="mobile-page__header">
        <h1 className="mobile-page__title">Field home</h1>
        <p className="mobile-page__subtitle">
          {user?.email ? `Signed in as ${user.email}` : brand.tagline}
        </p>
      </div>

      <div className="mobile-home-grid">
        <Link href="/m/jobs" className="mobile-home-card-link">
          <Card variant="interactive" className="mobile-home-card">
            <CardContent className="mobile-home-card__content">
              <span className="mobile-home-card__label">Today&apos;s jobs</span>
              <span className="mobile-home-card__value">{loading ? "…" : jobCount}</span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/m/sync" className="mobile-home-card-link">
          <Card variant="interactive" className="mobile-home-card">
            <CardContent className="mobile-home-card__content">
              <span className="mobile-home-card__label">Sync status</span>
              <Badge tone={!isOnline ? "warning" : pendingCount > 0 ? "warning" : "success"}>
                {syncLabel}
              </Badge>
            </CardContent>
          </Card>
        </Link>

        <Link href="/m/time" className="mobile-home-card-link">
          <Card variant="interactive" className="mobile-home-card">
            <CardContent className="mobile-home-card__content">
              <span className="mobile-home-card__label">Time</span>
              <span className="mobile-home-card__desc">Clock in and out</span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/m/expenses" className="mobile-home-card-link">
          <Card variant="interactive" className="mobile-home-card">
            <CardContent className="mobile-home-card__content">
              <span className="mobile-home-card__label">Expenses</span>
              <span className="mobile-home-card__desc">Receipt photos</span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/m/signature" className="mobile-home-card-link">
          <Card variant="interactive" className="mobile-home-card">
            <CardContent className="mobile-home-card__content">
              <span className="mobile-home-card__label">Signature</span>
              <span className="mobile-home-card__desc">Customer sign-off</span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/m/vehicle" className="mobile-home-card-link">
          <Card variant="interactive" className="mobile-home-card">
            <CardContent className="mobile-home-card__content">
              <span className="mobile-home-card__label">Vehicle</span>
              <span className="mobile-home-card__desc">Mileage log</span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/m/profile" className="mobile-home-card-link">
          <Card variant="interactive" className="mobile-home-card">
            <CardContent className="mobile-home-card__content">
              <span className="mobile-home-card__label">Profile</span>
              <span className="mobile-home-card__desc">Account settings</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card className="mobile-detail-card">
        <CardContent className="mobile-sync-status">
          <div className="mobile-sync-status__row">
            <span>Platform</span>
            <span className="mobile-sync-status__value">
              {platform}
              {isPWA ? " · installed" : ""}
            </span>
          </div>
          <div className="mobile-sync-status__row">
            <span>Connection</span>
            <Badge tone={isOnline ? "success" : "warning"}>{isOnline ? "Online" : "Offline"}</Badge>
          </div>
        </CardContent>
      </Card>

      <Link href="/dashboard" className="mobile-desktop-link">
        Open desktop app
      </Link>
    </div>
  );
}
