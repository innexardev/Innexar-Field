"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { DailyLog, DailyLogPhoto, Project } from "@fieldforge/sdk";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  IconCalendar,
  Input,
} from "@fieldforge/ui";
import { DailyLogPhotoUpload } from "@/components/construction/daily-log-photo-upload";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

export default function ProjectDailyLogsPage() {
  const params = useParams<{ id: string }>();
  const { client, token } = useAppPage();
  const t = useTranslations("modules.projectDailyLogs");
  const tc = useTranslations("modules.common");
  const [project, setProject] = useState<Project | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [logPhotos, setLogPhotos] = useState<Record<string, DailyLogPhoto[]>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [uploadingLogId, setUploadingLogId] = useState<string | null>(null);
  const [weather, setWeather] = useState("");
  const [crewCount, setCrewCount] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    if (!token || !params.id) return;
    const [p, res] = await Promise.all([
      client.getProject(params.id),
      client.listDailyLogs(params.id),
    ]);
    setProject(p);
    setLogs(res.data);
  }, [token, client, params.id]);

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [load]);

  async function createLog(e: React.FormEvent) {
    e.preventDefault();
    if (!project) return;
    setCreating(true);
    try {
      const log = await client.createDailyLog(project.id, {
        weather: weather || undefined,
        crew_count: parseInt(crewCount || "0", 10) || 0,
        notes: notes || undefined,
      });
      setLogs((prev) => [log, ...prev]);
      setWeather("");
      setCrewCount("");
      setNotes("");
      setExpandedLogId(log.id);
      setLogPhotos((prev) => ({ ...prev, [log.id]: [] }));
    } finally {
      setCreating(false);
    }
  }

  async function expandLog(logId: string) {
    if (!project) return;
    if (expandedLogId === logId) {
      setExpandedLogId(null);
      return;
    }
    setExpandedLogId(logId);
    if (!logPhotos[logId]) {
      const res = await client.listDailyLogPhotos(project.id, logId);
      setLogPhotos((prev) => ({ ...prev, [logId]: res.data }));
    }
  }

  async function uploadPhoto(logId: string, file: File) {
    if (!project) return;
    setUploadingLogId(logId);
    try {
      const photo = await client.uploadDailyLogPhoto(project.id, logId, file, {
        caption: file.name,
      });
      setLogPhotos((prev) => ({
        ...prev,
        [logId]: [...(prev[logId] ?? []), photo],
      }));
      setLogs((prev) =>
        prev.map((log) =>
          log.id === logId ? { ...log, photo_count: (log.photo_count ?? 0) + 1 } : log,
        ),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingLogId(null);
    }
  }

  if (loading) {
    return (
      <ModulePage title={tc("dailyLogs")} subtitle={tc("loading")}>
        <p className="text-sm text-[var(--brand-text-muted)]">{tc("loading")}</p>
      </ModulePage>
    );
  }

  if (!project) {
    return (
      <ModulePage title={tc("dailyLogs")} subtitle={tc("projectNotFound")}>
        <Link href="/projects" className="text-sm text-[var(--brand-accent)] hover:underline">
          {tc("backToProjects")}
        </Link>
      </ModulePage>
    );
  }

  return (
    <ModulePage title={tc("dailyLogs")} subtitle={t("subtitle", { name: project.name })}>
      <div className="mb-6">
        <Link
          href={`/projects/${project.id}`}
          className="text-sm text-[var(--brand-accent)] hover:underline"
        >
          {tc("backToProject")}
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>New daily log</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createLog} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_120px_1fr_auto] lg:items-end">
            <div className="form-field">
              <label className="form-label">Weather</label>
              <Input value={weather} onChange={(e) => setWeather(e.target.value)} placeholder="Sunny, rain…" />
            </div>
            <div className="form-field">
              <label className="form-label">Crew on site</label>
              <Input
                type="number"
                min={0}
                value={crewCount}
                onChange={(e) => setCrewCount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="form-field sm:col-span-2 lg:col-span-1">
              <label className="form-label">Notes</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Site activity…" />
            </div>
            <Button type="submit" disabled={creating}>
              {creating ? "Saving…" : "Add log"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {logs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <IconCalendar size={28} className="text-[var(--brand-text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold">No daily logs yet</h3>
          <p className="mt-2 max-w-md text-sm text-[var(--brand-text-secondary)]">
            Log weather, crew count, and site notes. Attach photos to document progress.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id} className="list-item-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => void expandLog(log.id)}
                    className="text-left"
                  >
                    <CardTitle className="text-base">{log.log_date}</CardTitle>
                  </button>
                  <div className="flex items-center gap-2">
                    {(log.photo_count ?? 0) > 0 && (
                      <Badge>{log.photo_count} photo{(log.photo_count ?? 0) === 1 ? "" : "s"}</Badge>
                    )}
                    {log.crew_count > 0 && <Badge>{log.crew_count} on site</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {log.weather && (
                  <p className="text-[var(--brand-text-secondary)]">Weather: {log.weather}</p>
                )}
                {log.notes && <p>{log.notes}</p>}
                {expandedLogId === log.id && (
                  <DailyLogPhotoUpload
                    photos={logPhotos[log.id] ?? []}
                    uploading={uploadingLogId === log.id}
                    onUpload={(file) => uploadPhoto(log.id, file)}
                  />
                )}
                {expandedLogId !== log.id && (
                  <button
                    type="button"
                    onClick={() => void expandLog(log.id)}
                    className="text-sm text-[var(--brand-accent)] hover:underline"
                  >
                    {(log.photo_count ?? 0) > 0 ? "View photos" : "Attach photos"}
                  </button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ModulePage>
  );
}
