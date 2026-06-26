"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { Route } from "@fieldforge/sdk";
import { Badge, Card, CardContent, IconTruck } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { NavigateButton } from "@/components/maps/navigate-button";
import { buildDirectionsUrl } from "@/lib/maps";
import { useAppPage } from "@/lib/use-app-page";

function formatStopTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function RoutesPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.routes");
  const tc = useTranslations("modules.common");
  const [routes, setRoutes] = useState<Route[]>([]);
  const [date, setDate] = useState("");
  const [optimized, setOptimized] = useState(false);

  useEffect(() => {
    if (!token) return;
    client
      .listRoutes()
      .then((r) => {
        setRoutes(r.data ?? []);
        setDate(r.date);
        setOptimized(r.optimized);
      })
      .catch(console.error);
  }, [token, client]);

  const route = routes[0];
  const stops = route?.stops ?? [];

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {date && (
          <Badge>
            {new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Badge>
        )}
        <Badge tone={optimized ? "success" : "default"}>
          {optimized ? "Optimized" : "Manual order"}
        </Badge>
        {route && (
          <span className="text-sm text-[var(--brand-text-muted)]">
            {route.stop_count} stop{route.stop_count !== 1 ? "s" : ""} · ~{route.estimated_minutes} min
          </span>
        )}
      </div>

      {stops.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <IconTruck size={28} className="text-[var(--brand-text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
          <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stops.map((stop, i) => (
            <Card key={stop.job_id} className="list-item-card stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-info-subtle)] text-sm font-bold text-[var(--brand-accent)]">
                  {stop.order}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{stop.title}</div>
                  <div className="text-sm text-[var(--brand-text-secondary)]">
                    Arrive by {formatStopTime(stop.scheduled_at)}
                  </div>
                </div>
                <NavigateButton href={buildDirectionsUrl({ address: stop.title })} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ModulePage>
  );
}
