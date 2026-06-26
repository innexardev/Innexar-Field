"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Input } from "@fieldforge/ui";
import { formatErrorForUser, type PlatformPlan, type PlatformPlanInput } from "@fieldforge/sdk";
import { DataTable } from "@/components/data-table";
import { ErrorBanner } from "@/components/error-banner";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { useAdminPage } from "@/lib/use-admin-page";

function formatPrice(cents?: number | null) {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(2)}/mo`;
}

function parseFeatures(raw: unknown): string {
  if (Array.isArray(raw)) return raw.join("\n");
  if (typeof raw === "string") return raw;
  return "";
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

export default function PlansPage() {
  const { client } = useAdminPage();
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
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
    setFeaturesText(parseFeatures(plan.features));
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

  return (
    <>
      <PageHeader
        title="Plans"
        subtitle="Subscription plans, pricing, and Stripe price IDs."
        actions={<Button onClick={openCreate}>Create plan</Button>}
      />
      <ErrorBanner message={error} className="mb-4" />

      {loading ? (
        <p className="text-sm text-[var(--brand-text-secondary)]">Loading plans…</p>
      ) : (
        <DataTable
          columns={[
            { key: "id", label: "ID" },
            { key: "name", label: "Name" },
            { key: "price", label: "Price" },
            { key: "stripe", label: "Stripe price" },
            { key: "status", label: "Status" },
          ]}
          rows={plans.map((p) => ({
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
              price: formatPrice(p.price_monthly_cents),
              stripe: p.stripe_price_id || "—",
              status: (
                <Badge tone={p.active ? "success" : "default"}>{p.active ? "Active" : "Inactive"}</Badge>
              ),
            },
            actions: (
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleteId(p.id)}>
                  Delete
                </Button>
              </div>
            ),
          }))}
        />
      )}

      <Modal
        open={modalOpen}
        title={editing ? "Edit plan" : "Create plan"}
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
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active ?? true}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Active
            </label>
          </div>
          <div className="form-field sm:col-span-2">
            <label className="form-label">Features (one per line)</label>
            <textarea
              className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm"
              rows={4}
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </Modal>

      <Modal open={!!deleteId} title="Delete plan" onClose={() => setDeleteId(null)}>
        <p className="text-sm text-[var(--brand-text-secondary)]">
          Delete plan <strong>{deleteId}</strong>? This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>
            Cancel
          </Button>
          <Button onClick={() => void handleDelete()} disabled={saving}>
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}
