"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { PortalBooking, PortalScheduleSlot } from "@fieldforge/sdk";
import { Button, Card, CardContent, CardHeader, CardTitle, IconCalendar, Input } from "@fieldforge/ui";
import { ErrorBanner } from "@/components/error-banner";
import { PortalPage } from "@/components/portal-page";
import { usePortalPage } from "@/lib/use-portal-page";

export default function PortalSchedulePage() {
  const t = useTranslations("modules.portal.schedule");
  const tc = useTranslations("modules.common");
  const tErr = useTranslations("common");
  const locale = useLocale();
  const { customer, client } = usePortalPage();
  const [slots, setSlots] = useState<PortalScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<PortalBooking | null>(null);

  useEffect(() => {
    client
      .listScheduleSlots()
      .then((r) => setSlots(r.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [client]);

  function formatSlot(iso: string) {
    return new Date(iso).toLocaleString(locale, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setError("");
    try {
      const booking = await client.createScheduleBooking({
        title: title.trim() || undefined,
        scheduled_at: selected,
        notes: notes.trim() || undefined,
      });
      setConfirmed(booking);
      setSelected("");
      setTitle("");
      setNotes("");
      const refreshed = await client.listScheduleSlots();
      setSlots(refreshed.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : tErr("error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PortalPage
      title={t("title")}
      subtitle={customer ? t("subtitle", { name: customer.name }) : t("loadingSubtitle")}
    >
      {confirmed ? (
        <div className="mb-6 rounded-lg border border-[var(--brand-success)] bg-[var(--brand-success-subtle)] px-4 py-3 text-sm">
          {t("confirmed", {
            date: confirmed.scheduled_at
              ? new Date(confirmed.scheduled_at).toLocaleString(locale)
              : "",
          })}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("formTitle")}</CardTitle>
          <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">{t("formHint")}</p>
        </CardHeader>
        <CardContent>
          <ErrorBanner message={error} />
          {loading ? (
            <p className="text-sm text-[var(--brand-text-secondary)]">{tc("loading")}</p>
          ) : slots.length === 0 ? (
            <div className="empty-state py-8">
              <div className="empty-state-icon">
                <IconCalendar size={28} className="text-[var(--brand-text-muted)]" />
              </div>
              <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
              <p className="mt-2 max-w-md text-sm text-[var(--brand-text-secondary)]">
                {t("emptyDescription")}
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="max-w-lg space-y-4">
              <div className="form-field">
                <label className="form-label" htmlFor="portal-slot">
                  {t("slotLabel")}
                </label>
                <select
                  id="portal-slot"
                  className="form-select"
                  value={selected}
                  required
                  onChange={(e) => setSelected(e.target.value)}
                >
                  <option value="">{t("slotPlaceholder")}</option>
                  {slots.map((slot) => (
                    <option key={slot.starts_at} value={slot.starts_at}>
                      {formatSlot(slot.starts_at)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="portal-booking-title">
                  {t("serviceLabel")}
                </label>
                <Input
                  id="portal-booking-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("servicePlaceholder")}
                  maxLength={120}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="portal-booking-notes">
                  {t("notesLabel")}
                </label>
                <textarea
                  id="portal-booking-notes"
                  className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text-primary)] shadow-sm outline-none transition focus:border-[var(--brand-accent)]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
              </div>
              <Button type="submit" disabled={submitting || !selected}>
                {submitting ? t("submitting") : t("submit")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </PortalPage>
  );
}
