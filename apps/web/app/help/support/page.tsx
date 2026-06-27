"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { SupportTicket } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@fieldforge/ui";
import { ErrorBanner } from "@/components/error-banner";
import { HelpShell } from "@/components/help/help-shell";
import { useConfig } from "@/components/brand-provider";
import { useAppPage } from "@/lib/use-app-page";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

function statusTone(status: string): "default" | "success" | "warning" {
  if (status === "resolved" || status === "closed") return "success";
  if (status === "in_progress") return "warning";
  return "default";
}

export default function HelpSupportPage() {
  const t = useTranslations("help.support");
  const tErr = useTranslations("common");
  const { contact } = useConfig();
  const { client, token } = useAppPage();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [error, setError] = useState("");
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  useEffect(() => {
    if (!token) return;
    setLoadingTickets(true);
    void client
      .listSupportTickets()
      .then((res) => setTickets(res.data ?? []))
      .catch(() => setTickets([]))
      .finally(() => setLoadingTickets(false));
  }, [client, token, referenceId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setReferenceId(null);
    try {
      const created = await client.createSupportTicket({ subject, message });
      setReferenceId(created.id);
      setSubject("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : tErr("error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <HelpShell title={t("title")} subtitle={t("subtitle")}>
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("contactTitle")}</CardTitle>
            <p className="text-sm text-[var(--brand-text-secondary)]">{t("contactHint")}</p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-[var(--brand-text-secondary)]">
            <div>
              <p className="font-medium text-[var(--brand-text-primary)]">{t("emailLabel")}</p>
              <a href={`mailto:${contact.support_email}`} className="text-[var(--brand-accent)] hover:underline">
                {contact.support_email}
              </a>
            </div>
            {contact.phone ? (
              <div>
                <p className="font-medium text-[var(--brand-text-primary)]">{t("phoneLabel")}</p>
                <a href={`tel:${contact.phone}`} className="text-[var(--brand-accent)] hover:underline">
                  {contact.phone}
                </a>
              </div>
            ) : null}
            <p className="text-xs text-[var(--brand-text-muted)]">{t("responseTime")}</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{t("formTitle")}</CardTitle>
            <p className="text-sm text-[var(--brand-text-secondary)]">{t("formHint")}</p>
          </CardHeader>
          <CardContent>
            <ErrorBanner message={error} />
            {referenceId ? (
              <div className="mb-6 rounded-lg border border-[var(--brand-success)] bg-[var(--brand-success-subtle)] px-4 py-3 text-sm text-[var(--brand-text-primary)]">
                {t("submitted", { id: referenceId.slice(0, 8) })}
              </div>
            ) : null}
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="form-field">
                <label className="form-label" htmlFor="support-subject">
                  {t("subject")}
                </label>
                <Input
                  id="support-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  maxLength={200}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="support-message">
                  {t("message")}
                </label>
                <textarea
                  id="support-message"
                  className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text-primary)] shadow-sm outline-none transition focus:border-[var(--brand-accent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand-accent)_18%,transparent)]"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={5}
                  maxLength={4000}
                />
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("submitting") : t("submit")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>{t("ticketsTitle")}</CardTitle>
          <p className="text-sm text-[var(--brand-text-secondary)]">{t("ticketsHint")}</p>
        </CardHeader>
        <CardContent>
          {loadingTickets ? (
            <p className="text-sm text-[var(--brand-text-muted)]">{t("loadingTickets")}</p>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-[var(--brand-text-secondary)]">{t("emptyTickets")}</p>
          ) : (
            <ul className="divide-y divide-[var(--brand-border)]">
              {tickets.map((ticket) => (
                <li key={ticket.id} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--brand-text-primary)]">{ticket.subject}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--brand-text-secondary)]">{ticket.message}</p>
                    <p className="mt-2 text-xs text-[var(--brand-text-muted)]">
                      {t("ticketMeta", { date: formatDate(ticket.created_at), id: ticket.id.slice(0, 8) })}
                    </p>
                  </div>
                  <Badge tone={statusTone(ticket.status)}>{t(`status.${ticket.status}`)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </HelpShell>
  );
}
