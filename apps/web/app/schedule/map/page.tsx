"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import type { ScheduleMapPin } from "@fieldforge/sdk";
import { Badge, Card, CardContent, CardHeader, CardTitle, IconTruck } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { NavigateButton } from "@/components/maps/navigate-button";
import { buildDirectionsUrl, formatCoordinates } from "@/lib/maps";
import { useAppPage } from "@/lib/use-app-page";

function pinTone(type: ScheduleMapPin["type"]) {
  return type === "crew" ? "success" : "default";
}

export default function ScheduleMapPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.scheduleMap");
  const [pins, setPins] = useState<ScheduleMapPin[]>([]);

  useEffect(() => {
    if (!token) return;
    client.getScheduleMap().then((r) => setPins(r.data ?? [])).catch(console.error);
  }, [token, client]);

  const jobs = useMemo(() => pins.filter((p) => p.type === "job"), [pins]);
  const crews = useMemo(() => pins.filter((p) => p.type === "crew"), [pins]);

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("locationsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pins.length === 0 ? (
              <div className="empty-state py-8">
                <div className="empty-state-icon">
                  <IconTruck size={28} className="text-[var(--brand-text-muted)]" />
                </div>
                <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
                <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
              </div>
            ) : (
              pins.map((pin, i) => (
                <Card key={`${pin.type}-${pin.id}`} className="list-item-card stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
                  <CardContent className="flex items-center justify-between gap-4 py-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{pin.title}</span>
                        <Badge tone={pinTone(pin.type)}>{pin.type}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">
                        {t("coordinates")}: {formatCoordinates(pin.lat, pin.lng)}
                      </p>
                      {pin.status && (
                        <p className="mt-0.5 text-xs text-[var(--brand-text-muted)]">{pin.status}</p>
                      )}
                    </div>
                    <NavigateButton href={buildDirectionsUrl({ lat: pin.lat, lng: pin.lng })} />
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-text-muted)]">
              {t("jobsSection", { count: jobs.length })}
            </h2>
            <div className="mt-3 space-y-2">
              {jobs.length === 0 ? (
                <p className="text-sm text-[var(--brand-text-muted)]">{t("noJobs")}</p>
              ) : (
                jobs.map((job) => (
                  <Card key={job.id} className="list-item-card">
                    <CardContent className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <span className="font-medium">{job.title}</span>
                        <p className="text-xs text-[var(--brand-text-muted)]">
                          {formatCoordinates(job.lat, job.lng)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge tone={pinTone(job.type)}>{job.status ?? "scheduled"}</Badge>
                        <NavigateButton href={buildDirectionsUrl({ lat: job.lat, lng: job.lng })} />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-text-muted)]">
              {t("crewsSection", { count: crews.length })}
            </h2>
            <div className="mt-3 space-y-2">
              {crews.length === 0 ? (
                <p className="text-sm text-[var(--brand-text-muted)]">{t("noCrews")}</p>
              ) : (
                crews.map((crew) => (
                  <Card key={crew.id} className="list-item-card">
                    <CardContent className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <span className="font-medium">{crew.title}</span>
                        <p className="text-xs text-[var(--brand-text-muted)]">
                          {formatCoordinates(crew.lat, crew.lng)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge tone="success">{crew.status ?? "active"}</Badge>
                        <NavigateButton href={buildDirectionsUrl({ lat: crew.lat, lng: crew.lng })} />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </ModulePage>
  );
}
