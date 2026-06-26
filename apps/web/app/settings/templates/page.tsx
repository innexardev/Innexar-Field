"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { EmailTemplate } from "@fieldforge/sdk";
import { formatErrorForUser } from "@fieldforge/sdk";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@fieldforge/ui";
import { ErrorBanner } from "@/components/error-banner";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

const textareaClassName =
  "w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text-primary)] shadow-sm outline-none transition-all duration-200 placeholder:text-[var(--brand-text-muted)] hover:border-[color-mix(in_srgb,var(--brand-accent)_25%,var(--brand-border))] focus:border-[var(--brand-accent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand-accent)_18%,transparent)] disabled:cursor-not-allowed disabled:opacity-50 min-h-[10rem] font-mono leading-relaxed";

const emptyForm = {
  slug: "",
  subject: "",
  body_html: "",
  active: true,
};

export default function SettingsTemplatesPage() {
  const { client, token, user } = useAppPage();
  const t = useTranslations("modules.settingsTemplates");
  const tc = useTranslations("modules.common");
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [testTo, setTestTo] = useState(user?.email ?? "");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await client.listEmailTemplates();
      setTemplates(result.data ?? []);
    } catch (e) {
      setError(formatErrorForUser(e));
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (!token) return;
    void refresh();
  }, [token, refresh]);

  useEffect(() => {
    if (user?.email) {
      setTestTo(user.email);
    }
  }, [user?.email]);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setTestResult("");
  }

  function startEdit(tmpl: EmailTemplate) {
    setEditingId(tmpl.id);
    setForm({
      slug: tmpl.slug,
      subject: tmpl.subject,
      body_html: tmpl.body_html,
      active: tmpl.active,
    });
    setTestResult("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        const updated = await client.updateEmailTemplate(editingId, form);
        setTemplates((prev) => prev.map((item) => (item.id === editingId ? updated : item)));
      } else {
        const created = await client.createEmailTemplate(form);
        setTemplates((prev) => [...prev, created].sort((a, b) => a.slug.localeCompare(b.slug)));
        setEditingId(created.id);
      }
    } catch (err) {
      setError(formatErrorForUser(err));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm(t("confirmDelete"))) return;
    setError("");
    try {
      await client.deleteEmailTemplate(id);
      setTemplates((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) {
        startCreate();
      }
    } catch (err) {
      setError(formatErrorForUser(err));
    }
  }

  async function onTestSend() {
    if (!editingId || !testTo.trim()) return;
    setTestSending(true);
    setTestResult("");
    setError("");
    try {
      const result = await client.sendEmailTemplateTest(editingId, { to: testTo.trim() });
      setTestResult(result.message);
    } catch (err) {
      setError(formatErrorForUser(err));
    } finally {
      setTestSending(false);
    }
  }

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <div className="mb-4">
        <Link href="/settings" className="text-sm text-[var(--brand-accent)]">
          {tc("backToSettings")}
        </Link>
      </div>

      <ErrorBanner message={error} className="mb-4" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>{t("listTitle")}</CardTitle>
              <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">{t("listDescription")}</p>
            </div>
            <Button type="button" variant="secondary" onClick={startCreate}>
              {t("newTemplate")}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-[var(--brand-text-secondary)]">{t("loadingTemplates")}</p>
            ) : templates.length === 0 ? (
              <p className="text-sm text-[var(--brand-text-secondary)]">{t("emptyTemplates")}</p>
            ) : (
              templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="flex flex-col gap-2 rounded-lg border border-[var(--brand-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-[var(--brand-text-primary)]">{tmpl.slug}</p>
                    <p className="text-sm text-[var(--brand-text-secondary)]">{tmpl.subject}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={tmpl.active ? "success" : "default"}>
                      {tmpl.active ? tc("active") : tc("inactive")}
                    </Badge>
                    <Button type="button" variant="secondary" onClick={() => startEdit(tmpl)}>
                      {tc("edit")}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{editingId ? t("editTemplate") : t("createTemplate")}</CardTitle>
            <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">{t("variablesHint")}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-4">
              <div className="form-field">
                <label className="form-label" htmlFor="tmpl-slug">{t("slugLabel")}</label>
                <Input
                  id="tmpl-slug"
                  value={form.slug}
                  onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="invoice-ready"
                  required
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="tmpl-subject">{t("subjectLabel")}</label>
                <Input
                  id="tmpl-subject"
                  value={form.subject}
                  onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                  placeholder={t("subjectPlaceholder")}
                  required
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="tmpl-body">{t("bodyLabel")}</label>
                <textarea
                  id="tmpl-body"
                  className={textareaClassName}
                  value={form.body_html}
                  onChange={(e) => setForm((prev) => ({ ...prev, body_html: e.target.value }))}
                  placeholder={t("bodyPlaceholder")}
                  required
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-[var(--brand-text-primary)]">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                />
                {t("activeLabel")}
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? tc("saving") : editingId ? tc("save") : tc("create")}
                </Button>
                {editingId && (
                  <Button type="button" variant="secondary" onClick={() => void onDelete(editingId)}>
                    {tc("delete")}
                  </Button>
                )}
              </div>
            </form>

            {editingId && (
              <div className="mt-6 border-t border-[var(--brand-border)] pt-6">
                <h3 className="text-sm font-semibold text-[var(--brand-text-primary)]">{t("testSendTitle")}</h3>
                <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">{t("testSendDescription")}</p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Input
                    type="email"
                    value={testTo}
                    onChange={(e) => setTestTo(e.target.value)}
                    placeholder={tc("email")}
                    className="sm:flex-1"
                  />
                  <Button type="button" disabled={testSending || !testTo.trim()} onClick={() => void onTestSend()}>
                    {testSending ? t("sendingTest") : t("sendTest")}
                  </Button>
                </div>
                {testResult && (
                  <p className="mt-3 text-sm text-[var(--brand-text-secondary)]">{testResult}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ModulePage>
  );
}
