"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Job } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@fieldforge/ui";
import { useAuth } from "@/lib/auth-context";
import { usePlatform } from "@fieldforge/platform";
import { enqueueOffline, readJobsCache } from "@/lib/mobile/offline-queue";
import { formatJobTime, formatStatus, statusBadgeTone } from "@/lib/mobile/job-utils";
import { buildDirectionsUrl, resolveJobDirectionsUrl } from "@/lib/maps";
import { NavigateButton } from "@/components/maps/navigate-button";

export default function MobileJobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token, client } = useAuth();
  const { isOnline } = usePlatform();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [queued, setQueued] = useState(false);
  const [directionsUrl, setDirectionsUrl] = useState("");

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }

    async function load() {
      try {
        if (isOnline) {
          const j = await client.getJob(id);
          setJob(j);
          setNotes(j.notes ?? "");
        } else {
          const cached = readJobsCache<Job>();
          const found = cached?.jobs.find((j) => j.id === id) ?? null;
          setJob(found);
          setNotes(found?.notes ?? "");
        }
      } catch {
        const cached = readJobsCache<Job>();
        const found = cached?.jobs.find((j) => j.id === id) ?? null;
        setJob(found);
        setNotes(found?.notes ?? "");
      }
    }

    void load();
  }, [token, client, id, router, isOnline]);

  useEffect(() => {
    if (!job) {
      setDirectionsUrl("");
      return;
    }
    setDirectionsUrl(buildDirectionsUrl({ address: job.title }));
    if (!isOnline) return;
    void resolveJobDirectionsUrl(client, job).then(setDirectionsUrl);
  }, [job, client, isOnline]);

  async function saveNotes() {
    if (!job) return;
    setSaving(true);
    setQueued(false);
    try {
      if (isOnline) {
        const updated = await client.updateJob(job.id, { notes });
        setJob(updated);
      } else {
        enqueueOffline({
          method: "PATCH",
          path: `/scheduling/jobs/${job.id}`,
          body: { notes },
          label: `Update notes: ${job.title}`,
        });
        setJob({ ...job, notes });
        setQueued(true);
      }
    } finally {
      setSaving(false);
    }
  }

  async function markComplete() {
    if (!job || job.status === "completed") return;
    setCompleting(true);
    setQueued(false);
    try {
      if (isOnline) {
        await client.completeJob(job.id);
        setJob({ ...job, status: "completed", notes });
      } else {
        enqueueOffline({
          method: "POST",
          path: `/scheduling/jobs/${job.id}/complete`,
          label: `Complete job: ${job.title}`,
        });
        setJob({ ...job, status: "completed", notes });
        setQueued(true);
      }
    } finally {
      setCompleting(false);
    }
  }

  if (!job) {
    return (
      <div className="mobile-page">
        <p className="mobile-page__subtitle">Job not found{!isOnline && " (offline — open from today’s list)"}.</p>
      </div>
    );
  }

  return (
    <div className="mobile-page">
      <div className="mobile-page__header">
        <h1 className="mobile-page__title">{job.title}</h1>
        <div className="mobile-page__meta">
          <Badge tone={statusBadgeTone(job.status)}>{formatStatus(job.status)}</Badge>
          <span className="mobile-page__subtitle">{formatJobTime(job.scheduled_at)}</span>
        </div>
        <NavigateButton href={directionsUrl} className="mt-3" />
      </div>

      <Card className="mobile-detail-card">
        <CardHeader className="mobile-detail-card__header">
          <CardTitle className="mobile-detail-card__title">Notes</CardTitle>
        </CardHeader>
        <CardContent className="mobile-detail-card__body">
          <textarea
            className="mobile-textarea"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Field notes, access codes, issues…"
          />
          <Button size="sm" variant="secondary" onClick={() => void saveNotes()} disabled={saving}>
            {saving ? "Saving…" : isOnline ? "Save notes" : "Queue notes"}
          </Button>
        </CardContent>
      </Card>

      <Card className="mobile-detail-card">
        <CardHeader className="mobile-detail-card__header">
          <CardTitle className="mobile-detail-card__title">Photos</CardTitle>
        </CardHeader>
        <CardContent className="mobile-detail-card__body">
          <div className="mobile-photo-placeholder" role="img" aria-label="Photo upload placeholder">
            <span className="mobile-photo-placeholder__icon">📷</span>
            <p className="mobile-photo-placeholder__text">Tap to add photos</p>
            <p className="mobile-photo-placeholder__hint">Camera integration coming with Capacitor</p>
          </div>
        </CardContent>
      </Card>

      {queued && (
        <p className="mobile-queued-hint">Changes queued — will sync when back online.</p>
      )}

      <div className="mobile-actions">
        <Button
          className="mobile-actions__primary"
          onClick={() => void markComplete()}
          disabled={completing || job.status === "completed"}
        >
          {job.status === "completed"
            ? "Completed"
            : completing
              ? "Completing…"
              : isOnline
                ? "Mark complete"
                : "Queue complete"}
        </Button>
      </div>
    </div>
  );
}
