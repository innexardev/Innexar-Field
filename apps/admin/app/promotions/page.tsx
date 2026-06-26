"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Input } from "@fieldforge/ui";
import {
  formatErrorForUser,
  type PlatformPlan,
  type PlatformPromotion,
  type PlatformPromotionInput,
} from "@fieldforge/sdk";
import { AdminPage } from "@/components/admin-shell";
import { DataTable } from "@/components/data-table";
import { ErrorBanner } from "@/components/error-banner";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { useAdminPage } from "@/lib/use-admin-page";

function toDateInput(iso?: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

const emptyForm = (): PlatformPromotionInput => ({
  code: "",
  description: "",
  discount_percent: null,
  plan_id: "",
  starts_at: null,
  ends_at: null,
  max_redemptions: null,
  active: true,
});

export default function PromotionsPage() {
  const { client } = useAdminPage();
  const [promotions, setPromotions] = useState<PlatformPromotion[]>([]);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PlatformPromotion | null>(null);
  const [form, setForm] = useState<PlatformPromotionInput>(emptyForm());
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [promoRes, planRes] = await Promise.all([client.listPromotions(), client.listPlans()]);
      setPromotions(promoRes.data);
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

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(p: PlatformPromotion) {
    setEditing(p);
    setForm({
      code: p.code,
      description: p.description,
      discount_percent: p.discount_percent,
      plan_id: p.plan_id ?? "",
      starts_at: p.starts_at,
      ends_at: p.ends_at,
      max_redemptions: p.max_redemptions,
      active: p.active,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await client.updatePromotion(editing.id, form);
      } else {
        await client.createPromotion(form);
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
      await client.deletePromotion(deleteId);
      setDeleteId(null);
      await refresh();
    } catch (e) {
      setError(formatErrorForUser(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminPage>
      <PageHeader
        title="Promotions"
        subtitle="Coupon codes and promotional discounts."
        actions={<Button onClick={openCreate}>Create promotion</Button>}
      />
      <ErrorBanner message={error} className="mb-4" />

      {loading ? (
        <p className="text-sm text-[var(--brand-text-secondary)]">Loading promotions…</p>
      ) : (
        <DataTable
          columns={[
            { key: "code", label: "Code" },
            { key: "discount", label: "Discount" },
            { key: "plan", label: "Plan" },
            { key: "dates", label: "Valid dates" },
            { key: "status", label: "Status" },
          ]}
          rows={promotions.map((p) => ({
            id: p.id,
            cells: {
              code: <code className="font-semibold">{p.code}</code>,
              discount: p.discount_percent != null ? `${p.discount_percent}%` : "—",
              plan: p.plan_id || "All plans",
              dates: (
                <span className="text-xs">
                  {p.starts_at ? new Date(p.starts_at).toLocaleDateString() : "—"} →{" "}
                  {p.ends_at ? new Date(p.ends_at).toLocaleDateString() : "—"}
                </span>
              ),
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
        title={editing ? "Edit promotion" : "Create promotion"}
        onClose={() => setModalOpen(false)}
        wide
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="form-field">
            <label className="form-label">Code</label>
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="LAUNCH20"
            />
          </div>
          <div className="form-field">
            <label className="form-label">Discount %</label>
            <Input
              type="number"
              min="0"
              max="100"
              value={form.discount_percent ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  discount_percent: e.target.value ? parseInt(e.target.value, 10) : null,
                })
              }
            />
          </div>
          <div className="form-field sm:col-span-2">
            <label className="form-label">Description</label>
            <Input
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Applicable plan</label>
            <select
              className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm"
              value={form.plan_id ?? ""}
              onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
            >
              <option value="">All plans</option>
              {plans.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Max redemptions</label>
            <Input
              type="number"
              min="0"
              value={form.max_redemptions ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  max_redemptions: e.target.value ? parseInt(e.target.value, 10) : null,
                })
              }
            />
          </div>
          <div className="form-field">
            <label className="form-label">Starts at</label>
            <Input
              type="date"
              value={toDateInput(form.starts_at)}
              onChange={(e) =>
                setForm({
                  ...form,
                  starts_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                })
              }
            />
          </div>
          <div className="form-field">
            <label className="form-label">Ends at</label>
            <Input
              type="date"
              value={toDateInput(form.ends_at)}
              onChange={(e) =>
                setForm({
                  ...form,
                  ends_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                })
              }
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

      <Modal open={!!deleteId} title="Delete promotion" onClose={() => setDeleteId(null)}>
        <p className="text-sm text-[var(--brand-text-secondary)]">Delete this promotion?</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>
            Cancel
          </Button>
          <Button onClick={() => void handleDelete()} disabled={saving}>
            Delete
          </Button>
        </div>
      </Modal>
    </AdminPage>
  );
}
