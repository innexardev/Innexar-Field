"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Lead, LeadBoardColumn, LeadStatus } from "@fieldforge/sdk";
import { formatErrorForUser } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, IconUsers } from "@fieldforge/ui";
import { ErrorBanner } from "@/components/error-banner";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

const STATUS_ORDER: LeadStatus[] = ["new", "contacted", "qualified", "converted", "lost"];

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function statusTone(status: LeadStatus): "default" | "success" | "warning" {
  if (status === "converted") return "success";
  if (status === "lost") return "warning";
  return "default";
}

function IconArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function LeadsPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.leads");
  const tc = useTranslations("modules.common");
  const [columns, setColumns] = useState<LeadBoardColumn[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("web");
  const [error, setError] = useState("");

  const loadBoard = useCallback(() => {
    if (!token) return;
    client
      .getLeadsBoard()
      .then((r) => {
        setColumns(r.columns);
        setSummary(r.summary);
      })
      .catch(console.error);
  }, [token, client]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const sortedColumns = useMemo(() => {
    return [...columns].sort((a, b) => {
      const ai = STATUS_ORDER.indexOf(a.status);
      const bi = STATUS_ORDER.indexOf(b.status);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [columns]);

  const total = useMemo(() => Object.values(summary).reduce((n, c) => n + c, 0), [summary]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await client.createLead({ name, email, phone, source });
      setName("");
      setEmail("");
      setPhone("");
      loadBoard();
    } catch (err) {
      setError(formatErrorForUser(err));
    }
  }

  async function onStatusChange(lead: Lead, status: LeadStatus) {
    if (status === lead.status) return;
    await client.updateLead(lead.id, { status });
    loadBoard();
  }

  function sourceLabel(value: string) {
    switch (value) {
      case "web":
        return t("sourceWeb");
      case "referral":
        return t("sourceReferral");
      case "field":
        return t("sourceField");
      default:
        return t("sourceOther");
    }
  }

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <ErrorBanner message={error} className="mb-4" />
      <Card>
        <CardHeader>
          <CardTitle>{t("addTitle")}</CardTitle>
          <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">{t("addDescription")}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto_auto] sm:items-end">
            <div className="form-field">
              <label className="form-label" htmlFor="lead-name">{tc("name")}</label>
              <Input
                id="lead-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                required
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="lead-email">{tc("email")}</label>
              <Input
                id="lead-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="lead-phone">{tc("phone")}</label>
              <Input
                id="lead-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("phonePlaceholder")}
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="lead-source">{tc("source")}</label>
              <select id="lead-source" className="form-select" value={source} onChange={(e) => setSource(e.target.value)}>
                <option value="web">{t("sourceWeb")}</option>
                <option value="referral">{t("sourceReferral")}</option>
                <option value="field">{t("sourceField")}</option>
                <option value="other">{t("sourceOther")}</option>
              </select>
            </div>
            <Button type="submit" className="sm:mb-0.5">{t("addLead")}</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-4 border-[color-mix(in_srgb,var(--brand-accent)_25%,var(--brand-border))] bg-[var(--brand-info-subtle)]">
        <CardContent className="py-4">
          <p className="text-sm text-[var(--brand-text-secondary)]">
            {t.rich("afterCreateHint", {
              view: (chunks) => <strong className="text-[var(--brand-text-primary)]">{chunks}</strong>,
            })}
          </p>
        </CardContent>
      </Card>

      <div className="mt-6">
        {total === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <IconUsers size={28} className="text-[var(--brand-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
            <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-5">
            {sortedColumns.map((col, ci) => (
              <section key={col.status} className="stagger-item" style={{ animationDelay: `${ci * 50}ms` }}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold capitalize">{statusLabel(col.status)}</h2>
                  <Badge tone={statusTone(col.status)}>{col.count}</Badge>
                </div>
                <div className="space-y-3">
                  {col.leads.length === 0 ? (
                    <p className="text-sm text-[var(--brand-text-muted)]">{t("noItems")}</p>
                  ) : (
                    col.leads.map((lead, i) => (
                      <Card key={lead.id} className="list-item-card" style={{ animationDelay: `${i * 30}ms` }}>
                        <CardContent className="space-y-3 py-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-info-subtle)] text-xs font-semibold text-[var(--brand-accent)]">
                              {lead.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-[var(--brand-text-primary)]">{lead.name}</div>
                              <div className="text-xs text-[var(--brand-text-secondary)]">
                                {[lead.email, lead.phone].filter(Boolean).join(" · ") || t("noContactInfo")}
                              </div>
                              {lead.source && (
                                <div className="mt-1 text-xs text-[var(--brand-text-muted)]">
                                  {sourceLabel(lead.source)}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <select
                              className="form-select w-full text-xs"
                              value={lead.status}
                              onChange={(e) => onStatusChange(lead, e.target.value as LeadStatus)}
                              aria-label={`${t("moveToStage")}: ${lead.name}`}
                            >
                              {STATUS_ORDER.map((s) => (
                                <option key={s} value={s}>
                                  {statusLabel(s)}
                                </option>
                              ))}
                            </select>
                            <Link href={`/leads/${lead.id}`}>
                              <Button variant="secondary" size="sm" className="w-full">
                                {t("viewDetails")}
                                <IconArrowRight />
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </ModulePage>
  );
}
