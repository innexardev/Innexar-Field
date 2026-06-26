"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { PortalBooking } from "@fieldforge/sdk";
import { Badge, Card, CardContent, IconCalendar } from "@fieldforge/ui";
import { PortalPage } from "@/components/portal-page";
import { usePortalPage } from "@/lib/use-portal-page";

function bookingTone(status: string): "success" | "warning" | "default" {
  if (status === "completed") return "success";
  if (status === "in_progress") return "warning";
  return "default";
}

export default function PortalBookingsPage() {
  const t = useTranslations("modules.portal.bookings");
  const tc = useTranslations("modules.common");
  const { customer, client } = usePortalPage();
  const [bookings, setBookings] = useState<PortalBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .listPortalBookings()
      .then((r) => setBookings(r.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [client]);

  return (
    <PortalPage
      title={t("title")}
      subtitle={customer ? t("subtitle", { name: customer.name }) : t("loadingSubtitle")}
    >
      {loading ? (
        <p className="text-sm text-[var(--brand-text-secondary)]">{tc("loading")}</p>
      ) : bookings.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <div className="empty-state">
              <div className="empty-state-icon">
                <IconCalendar size={28} className="text-[var(--brand-text-muted)]" />
              </div>
              <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
              <p className="mt-2 max-w-md text-sm text-[var(--brand-text-secondary)]">
                {t("emptyDescription")}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking, i) => (
            <Card
              key={booking.id}
              className="list-item-card stagger-item"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{booking.title}</div>
                  {booking.scheduled_at ? (
                    <div className="text-sm text-[var(--brand-text-secondary)]">
                      {t("scheduledAt", {
                        date: new Date(booking.scheduled_at).toLocaleString(),
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-[var(--brand-text-secondary)]">{t("unscheduled")}</div>
                  )}
                  {booking.notes ? (
                    <div className="mt-1 text-xs text-[var(--brand-text-muted)]">{booking.notes}</div>
                  ) : null}
                </div>
                <Badge tone={bookingTone(booking.status)}>
                  {t(`status.${booking.status}`, { defaultValue: booking.status })}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <p className="mt-6 text-xs text-[var(--brand-text-muted)]">{t("readOnlyHint")}</p>
    </PortalPage>
  );
}
