"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { QcReviewItem } from "@fieldforge/sdk";
import { Badge, Card, CardContent, CardHeader, CardTitle, IconSparkles } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

function statusTone(status: string): "success" | "warning" | "default" {
  if (status === "passed") return "success";
  if (status === "pending" || status === "awaiting_photos") return "warning";
  return "default";
}

function statusLabel(status: string): string {
  if (status === "awaiting_photos") return "Awaiting photos";
  return status.replace(/_/g, " ");
}

export default function CleaningQcPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.cleaningQc");
  const tc = useTranslations("modules.common");
  const [reviews, setReviews] = useState<QcReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    client
      .listQcReviews()
      .then((r) => setReviews(r.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, client]);

  const pendingCount = reviews.filter((r) => r.status === "pending").length;

  return (
    <ModulePage
      title={t("title")}
      subtitle={t("subtitle")}
    >
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone="warning">Stub</Badge>
        {!loading && pendingCount > 0 && <Badge tone="warning">{pendingCount} pending</Badge>}
        <p className="text-sm text-[var(--brand-text-secondary)]">
          Queue pulls jobs with checklist progress and{" "}
          <Link href="/cleaning/jobs" className="text-[var(--brand-accent)] hover:underline">
            QC photos
          </Link>
          .
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--brand-text-muted)]">Loading review queue…</p>
      ) : reviews.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <IconSparkles size={28} className="text-[var(--brand-text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold">No jobs in QC queue</h3>
          <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">
            Upload before/after photos on a job detail page to populate the review queue.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((item, i) => (
            <Link key={item.id} href={`/cleaning/jobs/${item.job_id}`}>
              <Card className="list-item-card stagger-item transition-shadow hover:shadow-md" style={{ animationDelay: `${i * 40}ms` }}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="text-base">{item.job_title}</CardTitle>
                    <Badge tone={statusTone(item.status)}>{statusLabel(item.status)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-4 pt-0 text-sm text-[var(--brand-text-secondary)]">
                  <span className="capitalize">{item.phase} phase</span>
                  <span>{item.photo_count} photo{item.photo_count === 1 ? "" : "s"}</span>
                  {item.score != null ? (
                    <span>Score: {item.score}%</span>
                  ) : item.status === "pending" ? (
                    <span>Awaiting review</span>
                  ) : item.status === "awaiting_photos" ? (
                    <span>Upload photos to start review</span>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </ModulePage>
  );
}
