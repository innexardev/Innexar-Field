"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Lead, LeadStatus } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@fieldforge/ui";
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

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const { client, token } = useAppPage();
  const t = useTranslations("modules.leadDetail");
  const tc = useTranslations("modules.common");
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("web");

  const load = useCallback(async () => {
    if (!token || !params.id) return;
    const l = await client.getLead(params.id);
    setLead(l);
    setEmail(l.email ?? "");
    setPhone(l.phone ?? "");
    setSource(l.source ?? "web");
  }, [token, client, params.id]);

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [load]);

  async function onStatusChange(status: LeadStatus) {
    if (!lead || status === lead.status) return;
    setUpdating(true);
    try {
      const updated = await client.updateLead(lead.id, { status });
      setLead(updated);
    } finally {
      setUpdating(false);
    }
  }

  async function saveContact(e: React.FormEvent) {
    e.preventDefault();
    if (!lead) return;
    setSaving(true);
    setSaved(false);
    try {
      const updated = await client.updateLead(lead.id, { email, phone, source });
      setLead(updated);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <ModulePage title={tc("lead")} subtitle={tc("loading")}>
        <p className="text-sm text-[var(--brand-text-muted)]">{tc("loading")}</p>
      </ModulePage>
    );
  }

  if (!lead) {
    return (
      <ModulePage title={tc("lead")} subtitle={tc("notFound")}>
        <Link href="/leads" className="text-sm text-[var(--brand-accent)] hover:underline">
          {tc("backToLeads")}
        </Link>
      </ModulePage>
    );
  }

  return (
    <ModulePage title={lead.name} subtitle={t("subtitle")}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link href="/leads" className="text-sm text-[var(--brand-accent)] hover:underline">
          {tc("allLeads")}
        </Link>
        <Badge tone={statusTone(lead.status)}>{statusLabel(lead.status)}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-info-subtle)] text-xl font-semibold text-[var(--brand-accent)]">
                {lead.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <CardTitle>{lead.name}</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveContact} className="space-y-4">
              <h3 className="text-sm font-semibold text-[var(--brand-text-primary)]">{t("contactTitle")}</h3>
              <div className="form-field">
                <label className="form-label" htmlFor="lead-email">{tc("email")}</label>
                <Input
                  id="lead-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setSaved(false);
                  }}
                  placeholder={t("emailPlaceholder")}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="lead-phone">{tc("phone")}</label>
                <Input
                  id="lead-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setSaved(false);
                  }}
                  placeholder={t("phonePlaceholder")}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="lead-source">{tc("source")}</label>
                <select
                  id="lead-source"
                  className="form-select"
                  value={source}
                  onChange={(e) => {
                    setSource(e.target.value);
                    setSaved(false);
                  }}
                >
                  <option value="web">{t("sourceWeb")}</option>
                  <option value="referral">{t("sourceReferral")}</option>
                  <option value="field">{t("sourceField")}</option>
                  <option value="other">{t("sourceOther")}</option>
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? tc("saving") : t("saveLead")}
                </Button>
                {saved && <span className="text-sm text-[var(--brand-success)]">{t("leadSaved")}</span>}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("pipeline")}</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="form-label" htmlFor="lead-status">
              {t("stage")}
            </label>
            <select
              id="lead-status"
              className="form-select mt-1 w-full"
              value={lead.status}
              disabled={updating}
              onChange={(e) => onStatusChange(e.target.value as LeadStatus)}
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
            {lead.status === "converted" && (
              <p className="mt-4 text-sm text-[var(--brand-text-secondary)]">{t("convertedHint")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </ModulePage>
  );
}
