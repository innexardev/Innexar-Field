"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { ChecklistItem, CleanJobDetail, QcPhoto } from "@fieldforge/sdk";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@fieldforge/ui";
import { PhotoUploadStub } from "@/components/cleaning/photo-upload-stub";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

function formatJobTime(iso?: string) {
  if (!iso) return "Unscheduled";
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function CleaningJobDetailPage() {
  const params = useParams<{ id: string }>();
  const { client, token } = useAppPage();
  const t = useTranslations("modules.estimates");
  const tc = useTranslations("modules.common");
  const [job, setJob] = useState<CleanJobDetail | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [photos, setPhotos] = useState<QcPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!token || !params.id) return;
    const [detail, photoRes] = await Promise.all([
      client.getCleanJob(params.id),
      client.listCleanJobPhotos(params.id),
    ]);
    setJob(detail);
    setChecklist(detail.checklist);
    setPhotos(photoRes.data);
  }, [token, client, params.id]);

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [load]);

  async function toggleItem(itemId: string) {
    if (!job) return;
    const next = checklist.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item,
    );
    setChecklist(next);
    setSaving(true);
    try {
      const res = await client.updateCleanChecklist(job.id, next);
      setChecklist(res.checklist);
    } catch (err) {
      console.error(err);
      setChecklist(checklist);
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhoto(file: File, kind: "before" | "after") {
    if (!job) return;
    setUploading(true);
    try {
      const dataUrl = await readFileAsDataURL(file);
      const photo = await client.uploadCleanJobPhoto(job.id, {
        kind,
        caption: file.name,
        data_url: dataUrl,
      });
      setPhotos((prev) => [...prev, photo]);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  const doneCount = checklist.filter((i) => i.completed).length;

  if (loading) {
    return (
      <ModulePage title={tc("cleanJob")} subtitle={tc("loading")}>
        <p className="text-sm text-[var(--brand-text-muted)]">{tc("loading")}</p>
      </ModulePage>
    );
  }

  if (!job) {
    return (
      <ModulePage title={tc("cleanJob")} subtitle={tc("notFound")}>
        <Link href="/cleaning/jobs" className="text-sm text-[var(--brand-accent)] hover:underline">
          {tc("backToTodaysCleans")}
        </Link>
      </ModulePage>
    );
  }

  return (
    <ModulePage title={job.title} subtitle={t("cleanJobSubtitle", { phase: job.phase, time: formatJobTime(job.scheduled_at) })}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link href="/cleaning/jobs" className="text-sm text-[var(--brand-accent)] hover:underline">
          {tc("todaysCleans")}
        </Link>
        <Badge tone={job.status === "completed" ? "success" : "default"}>{job.status}</Badge>
      </div>

      {job.notes && (
        <Card className="mb-6">
          <CardContent className="py-4 text-sm text-[var(--brand-text-secondary)]">{job.notes}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Checklist</CardTitle>
          <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">
            {doneCount} of {checklist.length} complete
            {saving && " · saving…"}
          </p>
        </CardHeader>
        <CardContent>
          {checklist.length === 0 ? (
            <p className="text-sm text-[var(--brand-text-muted)]">No checklist items for this phase.</p>
          ) : (
            <ul className="space-y-2">
              {checklist.map((item) => (
                <li key={item.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--brand-border)] px-4 py-3 transition-colors hover:bg-[var(--brand-surface-elevated)]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--brand-accent)]"
                      checked={item.completed}
                      disabled={saving}
                      onChange={() => void toggleItem(item.id)}
                    />
                    <span className={item.completed ? "text-[var(--brand-text-muted)] line-through" : ""}>
                      {item.label}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>QC Photos</CardTitle>
          <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">
            Before/after documentation for quality review · {photos.length} uploaded
          </p>
        </CardHeader>
        <CardContent>
          <PhotoUploadStub photos={photos} uploading={uploading} onUpload={uploadPhoto} />
        </CardContent>
      </Card>

      <div className="mt-6">
        <Link
          href="/cleaning/qc"
          className="inline-flex items-center justify-center rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 py-2 text-sm font-medium text-[var(--brand-text-primary)] transition-colors hover:bg-[var(--brand-surface-elevated)]"
        >
          Send to quality review →
        </Link>
      </div>
    </ModulePage>
  );
}
