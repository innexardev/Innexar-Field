"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import type { ScheduleMapPin } from "@fieldforge/sdk";
import { Badge, Card, CardContent, IconTruck } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

function pinTone(type: ScheduleMapPin["type"]) {
  return type === "crew" ? "success" : "default";
}

export default function ScheduleMapPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.scheduleMap");
  const tc = useTranslations("modules.common");
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
        <Card className="overflow-hidden">
          <CardContent className="relative min-h-[420px] bg-gradient-to-br from-[var(--brand-surface-elevated)] to-[var(--brand-surface)] p-0">
            <div className="absolute inset-0 opacity-30" style={{
              backgroundImage:
                "linear-gradient(var(--brand-border) 1px, transparent 1px), linear-gradient(90deg, var(--brand-border) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }} />
            {pins.length === 0 ? (
              <div className="relative flex h-[420px] items-center justify-center">
                <p className="text-sm text-[var(--brand-text-muted)]">No pins for this range</p>
              </div>
            ) : (
              <div className="relative h-[420px]">
                {pins.map((pin, i) => (
                  <div
                    key={`${pin.type}-${pin.id}`}
                    className="absolute flex flex-col items-center"
                    style={{
                      left: `${12 + ((pin.lng + 122.5) * 520) % 78}%`,
                      top: `${10 + ((pin.lat - 37.7) * 900) % 72}%`,
                      animationDelay: `${i * 40}ms`,
                    }}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-sm ${
                        pin.type === "crew"
                          ? "border-[var(--brand-success)] bg-[var(--brand-success-subtle)] text-[var(--brand-success)]"
                          : "border-[var(--brand-accent)] bg-[var(--brand-info-subtle)] text-[var(--brand-accent)]"
                      }`}
                    >
                      <IconTruck size={16} />
                    </div>
                    <span className="mt-1 max-w-[7rem] truncate rounded-md bg-[var(--brand-surface)]/90 px-2 py-0.5 text-xs font-medium shadow-sm">
                      {pin.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-text-muted)]">
              Jobs ({jobs.length})
            </h2>
            <div className="mt-3 space-y-2">
              {jobs.length === 0 ? (
                <p className="text-sm text-[var(--brand-text-muted)]">No scheduled jobs on the map.</p>
              ) : (
                jobs.map((job) => (
                  <Card key={job.id} className="list-item-card">
                    <CardContent className="flex items-center justify-between py-3">
                      <span className="font-medium">{job.title}</span>
                      <Badge tone={pinTone(job.type)}>{job.status ?? "scheduled"}</Badge>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-text-muted)]">
              Active crews ({crews.length})
            </h2>
            <div className="mt-3 space-y-2">
              {crews.length === 0 ? (
                <p className="text-sm text-[var(--brand-text-muted)]">Add crews to see them on the map.</p>
              ) : (
                crews.map((crew) => (
                  <Card key={crew.id} className="list-item-card">
                    <CardContent className="flex items-center justify-between py-3">
                      <span className="font-medium">{crew.title}</span>
                      <Badge tone="success">{crew.status ?? "active"}</Badge>
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
