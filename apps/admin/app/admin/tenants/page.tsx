"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge, Button, Input, IconBuilding } from "@fieldforge/ui";
import {
  formatErrorForUser,
  type PlatformPlan,
  type PlatformTenant,
  type PlatformTenantCreateInput,
} from "@fieldforge/sdk";
import { DataTable } from "@/components/data-table";
import { ErrorBanner } from "@/components/error-banner";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { useAdminPage } from "@/lib/use-admin-page";

const INDUSTRY_PACKS = ["field-services", "cleaning", "construction"] as const;
const SUBSCRIPTION_STATUSES = ["trialing", "active", "incomplete", "past_due", "canceled"] as const;

const emptyForm = (): PlatformTenantCreateInput => ({
  name: "",
  slug: "",
  industry_pack: "field-services",
  plan_id: "starter",
  subscription_status: "trialing",
  owner_email: "",
  owner_password: "",
});

export default function TenantsPage() {
  const { client } = useAdminPage();
  const t = useTranslations("admin.pages.tenants");
  const tc = useTranslations("admin.common");
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<PlatformTenantCreateInput>(emptyForm());
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [tenantRes, planRes] = await Promise.all([client.listTenants(), client.listPlans()]);
      setTenants(tenantRes.data);
      setPlans(planRes.data);
    } catch (e) {
      setError(formatErrorForUser(e));
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.slug.toLowerCase().includes(q) ||
        row.plan_id.toLowerCase().includes(q) ||
        row.subscription_status.toLowerCase().includes(q),
    );
  }, [tenants, search]);

  async function handleCreate() {
    setSaving(true);
    setError("");
    try {
      await client.createTenant(form);
      setModalOpen(false);
      setForm(emptyForm());
      await refresh();
    } catch (e) {
      setError(formatErrorForUser(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={<Button onClick={() => setModalOpen(true)}>{t("createTenant")}</Button>}
      />
      <ErrorBanner message={error} className="mb-4" />

      <div className="mb-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
        />
      </div>

      {loading ? (
        <p className="text-sm text-[var(--brand-text-secondary)]">{t("loadingTenants")}</p>
      ) : (
        <DataTable
          emptyTitle={t("emptyTitle")}
          emptyDescription={t("emptyDesc")}
          emptyIcon={IconBuilding}
          emptyAction={
            !search.trim() ? (
              <Button onClick={() => setModalOpen(true)}>{t("createTenant")}</Button>
            ) : undefined
          }
          actionsLabel={tc("actions")}
          columns={[
            { key: "name", label: t("colTenant") },
            { key: "plan", label: t("colPlan") },
            { key: "industry", label: t("colIndustry") },
            { key: "status", label: t("colStatus") },
            { key: "created", label: t("colCreated") },
          ]}
          rows={filtered.map((row) => ({
            id: row.id,
            cells: {
              name: (
                <div>
                  <p className="font-medium">{row.name}</p>
                  <p className="text-xs text-[var(--brand-text-muted)]">{row.slug}</p>
                </div>
              ),
              plan: <code className="text-xs">{row.plan_id}</code>,
              industry: row.industry_pack,
              status: row.suspended_at ? (
                <Badge tone="default">{tc("suspended")}</Badge>
              ) : (
                <Badge tone="success">{row.subscription_status || "active"}</Badge>
              ),
              created: new Date(row.created_at).toLocaleDateString(),
            },
            actions: (
              <Link href={`/admin/tenants/${row.id}`}>
                <Button size="sm" variant="secondary">
                  {tc("view")}
                </Button>
              </Link>
            ),
          }))}
        />
      )}

      <Modal open={modalOpen} title={t("createTenant")} onClose={() => setModalOpen(false)} wide>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="form-field sm:col-span-2">
            <label className="form-label">Company name</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-field">
            <label className="form-label">Slug (optional)</label>
            <Input
              value={form.slug ?? ""}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="auto-generated if empty"
            />
          </div>
          <div className="form-field">
            <label className="form-label">Industry pack</label>
            <select
              className="form-select"
              value={form.industry_pack ?? "field-services"}
              onChange={(e) => setForm({ ...form, industry_pack: e.target.value })}
            >
              {INDUSTRY_PACKS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Plan</label>
            <select
              className="form-select"
              value={form.plan_id ?? "starter"}
              onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id})
                </option>
              ))}
              {plans.length === 0 && <option value="starter">starter</option>}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Subscription status</label>
            <select
              className="form-select"
              value={form.subscription_status ?? "trialing"}
              onChange={(e) => setForm({ ...form, subscription_status: e.target.value })}
            >
              {SUBSCRIPTION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field sm:col-span-2 border-t border-[var(--brand-border)] pt-4">
            <p className="mb-2 text-sm font-medium text-[var(--brand-text-primary)]">
              Initial owner (optional)
            </p>
          </div>
          <div className="form-field">
            <label className="form-label">Owner email</label>
            <Input
              type="email"
              value={form.owner_email ?? ""}
              onChange={(e) => setForm({ ...form, owner_email: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Owner password</label>
            <Input
              type="password"
              value={form.owner_password ?? ""}
              onChange={(e) => setForm({ ...form, owner_password: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2 border-t border-[var(--brand-border)] pt-4">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            {tc("cancel")}
          </Button>
          <Button onClick={() => void handleCreate()} disabled={saving}>
            {saving ? tc("creating") : t("createTenant")}
          </Button>
        </div>
      </Modal>
    </>
  );
}
