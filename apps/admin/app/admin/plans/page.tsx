"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, Input, PricingCard, IconCreditCard } from "@fieldforge/ui";
import { formatErrorForUser, type PlatformPlan, type PlatformPlanInput } from "@fieldforge/sdk";
import { DataTable } from "@/components/data-table";
import { ErrorBanner } from "@/components/error-banner";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { useAdminPage } from "@/lib/use-admin-page";

function formatPrice(cents?: number | null) {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

function parseFeatures(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string" && raw.trim()) return [raw];
  return [];
}

function parseFeaturesText(raw: unknown): string {
  return parseFeatures(raw).join("\n");
}

function featuresToJson(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

const emptyForm = (): PlatformPlanInput => ({
  id: "",
  name: "",
  description: "",
  stripe_price_id: "",
  price_monthly_cents: null,
  features: [],
  active: true,
  sort_order: 0,
});

function validatePlanForm(
  form: PlatformPlanInput,
  editing: PlatformPlan | null,
  priceDollars: string,
): string | null {
  if (!editing) {
    const id = form.id.trim();
    if (!id) return "Plan ID is required.";
    if (!/^[a-z][a-z0-9_-]*$/.test(id)) {
      return "Plan ID must start with a lowercase letter and contain only lowercase letters, digits, hyphens, or underscores.";
    }
  }
  if (!form.name.trim()) return "Name is required.";
  if (form.stripe_price_id?.trim() && !form.stripe_price_id.startsWith("price_")) {
    return "Stripe price ID must start with price_ (paste from Stripe dashboard).";
  }
  if (priceDollars) {
    const amount = parseFloat(priceDollars);
    if (Number.isNaN(amount) || amount < 0) return "Price must be a non-negative number.";
  }
  return null;
}

type ViewMode = "cards" | "table";

export default function PlansPage() {
  const { client } = useAdminPage();
  const t = useTranslations("admin.pages.plans");
  const tc = useTranslations("admin.common");
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PlatformPlan | null>(null);
  const [form, setForm] = useState<PlatformPlanInput>(emptyForm());
  const [featuresText, setFeaturesText] = useState("");
  const [priceDollars, setPriceDollars] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await client.listPlans();
      setPlans(res.data);
    } catch (e) {
      setError(formatErrorForUser(e));
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setFeaturesText("");
    setPriceDollars("");
    setModalOpen(true);
  }

  function openEdit(plan: PlatformPlan) {
    setEditing(plan);
    setForm({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      stripe_price_id: plan.stripe_price_id ?? "",
      price_monthly_cents: plan.price_monthly_cents,
      active: plan.active,
      sort_order: plan.sort_order,
    });
    setFeaturesText(parseFeaturesText(plan.features));
    setPriceDollars(
      plan.price_monthly_cents != null ? String(plan.price_monthly_cents / 100) : "",
    );
    setModalOpen(true);
  }

  async function handleSave() {
    const validationError = validatePlanForm(form, editing, priceDollars);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError("");
    const cents = priceDollars ? Math.round(parseFloat(priceDollars) * 100) : null;
    const payload = {
      ...form,
      price_monthly_cents: cents,
      features: featuresToJson(featuresText),
    };
    try {
      if (editing) {
        await client.updatePlan(editing.id, payload);
      } else {
        await client.createPlan(payload as PlatformPlanInput);
      }
      setModalOpen(false);
      await refresh();
    } catch (e) {
      setError(formatErrorForUser(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setSaving(true);
    setError("");
    try {
      await client.deletePlan(deleteId);
      setDeleteId(null);
      await refresh();
    } catch (e) {
      setError(formatErrorForUser(e));
    } finally {
      setSaving(false);
    }
  }

  const sortedPlans = [...plans].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {plans.length > 0 && (
              <div className="view-toggle" role="group" aria-label="View mode">
                <button
                  type="button"
                  className={`view-toggle-btn ${viewMode === "cards" ? "view-toggle-btn-active" : "view-toggle-btn-inactive"}`}
                  onClick={() => setViewMode("cards")}
                >
                  {tc("cardsView")}
                </button>
                <button
                  type="button"
                  className={`view-toggle-btn ${viewMode === "table" ? "view-toggle-btn-active" : "view-toggle-btn-inactive"}`}
                  onClick={() => setViewMode("table")}
                >
                  {tc("tableView")}
                </button>
              </div>
            )}
            <Button onClick={openCreate}>{t("createPlan")}</Button>
          </div>
        }
      />
      <ErrorBanner message={error} className="mb-4" />

      {loading ? (
        <p className="text-sm text-[var(--brand-text-secondary)]">{t("loadingPlans")}</p>
      ) : viewMode === "cards" ? (
        sortedPlans.length === 0 ? (
          <DataTable
            columns={[]}
            rows={[]}
            emptyTitle={t("emptyTitle")}
            emptyDescription={t("emptyDesc")}
            emptyIcon={IconCreditCard}
            emptyAction={<Button onClick={openCreate}>{t("createPlan")}</Button>}
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {sortedPlans.map((plan) => {
              const features = parseFeatures(plan.features);
              return (
                <PricingCard
                  key={plan.id}
                  name={plan.name}
                  badge={plan.active ? tc("active") : tc("inactive")}
                  price={formatPrice(plan.price_monthly_cents)}
                  description={plan.description ?? undefined}
                  features={
                    features.length > 0
                      ? features
                      : [plan.stripe_price_id ? `Stripe: ${plan.stripe_price_id}` : plan.id]
                  }
                  featured={plan.active}
                  cta={
                    <div className="flex gap-2">
                      <Button className="flex-1" variant="secondary" onClick={() => openEdit(plan)}>
                        {tc("edit")}
                      </Button>
                      <Button variant="ghost" onClick={() => setDeleteId(plan.id)}>
                        {tc("delete")}
                      </Button>
                    </div>
                  }
                />
              );
            })}
          </div>
        )
      ) : (
        <DataTable
          emptyTitle={t("emptyTitle")}
          emptyDescription={t("emptyDesc")}
          emptyIcon={IconCreditCard}
          emptyAction={<Button onClick={openCreate}>{t("createPlan")}</Button>}
          actionsLabel={tc("actions")}
          columns={[
            { key: "id", label: t("colId") },
            { key: "name", label: t("colName") },
            { key: "price", label: t("colPrice") },
            { key: "stripe", label: t("colStripe") },
            { key: "status", label: t("colStatus") },
          ]}
          rows={sortedPlans.map((p) => ({
            id: p.id,
            cells: {
              id: <code className="text-xs">{p.id}</code>,
              name: (
                <div>
                  <p className="font-medium">{p.name}</p>
                  {p.description && (
                    <p className="text-xs text-[var(--brand-text-muted)]">{p.description}</p>
                  )}
                </div>
              ),
              price: `${formatPrice(p.price_monthly_cents)}/mo`,
              stripe: p.stripe_price_id ? (
                <code className="text-xs">{p.stripe_price_id}</code>
              ) : (
                "—"
              ),
              status: (
                <Badge tone={p.active ? "success" : "default"}>
                  {p.active ? tc("active") : tc("inactive")}
                </Badge>
              ),
            },
            actions: (
              <>
                <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>
                  {tc("edit")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleteId(p.id)}>
                  {tc("delete")}
                </Button>
              </>
            ),
          }))}
        />
      )}

      <Modal
        open={modalOpen}
        title={editing ? t("editPlan") : t("createPlan")}
        onClose={() => setModalOpen(false)}
        wide
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="form-field">
            <label className="form-label">Plan ID</label>
            <Input
              value={form.id}
              onChange={(e) => setForm({ ...form, id: e.target.value })}
              disabled={!!editing}
              placeholder="starter"
            />
          </div>
          <div className="form-field">
            <label className="form-label">Name</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-field sm:col-span-2">
            <label className="form-label">Description</label>
            <Input
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Monthly price (USD)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={priceDollars}
              onChange={(e) => setPriceDollars(e.target.value)}
              placeholder="49.00"
            />
          </div>
          <div className="form-field">
            <label className="form-label">Stripe price ID</label>
            <Input
              value={form.stripe_price_id ?? ""}
              onChange={(e) => setForm({ ...form, stripe_price_id: e.target.value })}
              placeholder="price_..."
            />
          </div>
          <div className="form-field">
            <label className="form-label">Sort order</label>
            <Input
              type="number"
              value={form.sort_order ?? 0}
              onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value, 10) || 0 })}
            />
          </div>
          <div className="form-field flex items-end">
            <label className="flex items-center gap-2 text-sm text-[var(--brand-text-primary)]">
              <input
                type="checkbox"
                checked={form.active ?? true}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="rounded border-[var(--brand-border)]"
              />
              {tc("active")}
            </label>
          </div>
          <div className="form-field sm:col-span-2">
            <label className="form-label">Features (one per line)</label>
            <textarea
              className="form-textarea"
              rows={4}
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2 border-t border-[var(--brand-border)] pt-4">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            {tc("cancel")}
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? tc("saving") : tc("save")}
          </Button>
        </div>
      </Modal>

      <Modal open={!!deleteId} title={t("deletePlan")} onClose={() => setDeleteId(null)}>
        <p className="text-sm text-[var(--brand-text-secondary)]">
          {t("deleteConfirm", { id: deleteId ?? "" })}
        </p>
        <div className="mt-6 flex justify-end gap-2 border-t border-[var(--brand-border)] pt-4">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>
            {tc("cancel")}
          </Button>
          <Button onClick={() => void handleDelete()} disabled={saving}>
            {tc("delete")}
          </Button>
        </div>
      </Modal>
    </>
  );
}
