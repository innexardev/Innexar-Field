"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Input } from "@fieldforge/ui";
import {
  formatErrorForUser,
  type PlatformAnnouncement,
  type PlatformAnnouncementInput,
} from "@fieldforge/sdk";
import { DataTable } from "@/components/data-table";
import { ErrorBanner } from "@/components/error-banner";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { useAdminPage } from "@/lib/use-admin-page";

const SEVERITIES = ["info", "warning", "critical"] as const;

function severityTone(severity: string): "success" | "warning" | "default" {
  if (severity === "critical") return "warning";
  if (severity === "warning") return "warning";
  return "default";
}

const emptyForm = (): PlatformAnnouncementInput => ({
  message: "",
  severity: "info",
  active: true,
});

export default function AnnouncementsPage() {
  const { client } = useAdminPage();
  const [items, setItems] = useState<PlatformAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformAnnouncement | null>(null);
  const [form, setForm] = useState<PlatformAnnouncementInput>(emptyForm());
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await client.listAnnouncements();
      setItems(res.data);
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

  function openEdit(item: PlatformAnnouncement) {
    setEditing(item);
    setForm({
      message: item.message,
      severity: item.severity,
      active: item.active,
      starts_at: item.starts_at,
      ends_at: item.ends_at,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await client.updateAnnouncement(editing.id, form);
      } else {
        await client.createAnnouncement(form);
      }
      setModalOpen(false);
      await refresh();
    } catch (e) {
      setError(formatErrorForUser(e));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: PlatformAnnouncement) {
    setError("");
    try {
      await client.updateAnnouncement(item.id, { active: !item.active });
      await refresh();
    } catch (e) {
      setError(formatErrorForUser(e));
    }
  }

  async function handleDelete(id: string) {
    setError("");
    try {
      await client.deleteAnnouncement(id);
      await refresh();
    } catch (e) {
      setError(formatErrorForUser(e));
    }
  }

  return (
    <>
      <PageHeader
        title="Announcements"
        subtitle="Tenant-facing banners shown in the workspace app (MVP)."
        actions={<Button onClick={openCreate}>New announcement</Button>}
      />
      <ErrorBanner message={error} className="mb-4" />

      {loading ? (
        <p className="text-sm text-[var(--brand-text-secondary)]">Loading announcements…</p>
      ) : (
        <DataTable
          columns={[
            { key: "message", label: "Message" },
            { key: "severity", label: "Severity" },
            { key: "status", label: "Status" },
            { key: "schedule", label: "Schedule" },
          ]}
          rows={items.map((item) => ({
            id: item.id,
            cells: {
              message: <span className="text-sm">{item.message}</span>,
              severity: <Badge tone={severityTone(item.severity)}>{item.severity}</Badge>,
              status: item.active ? (
                <Badge tone="success">Active</Badge>
              ) : (
                <Badge tone="default">Inactive</Badge>
              ),
              schedule: (
                <span className="text-xs text-[var(--brand-text-muted)]">
                  {item.starts_at ? new Date(item.starts_at).toLocaleDateString() : "—"}
                  {" → "}
                  {item.ends_at ? new Date(item.ends_at).toLocaleDateString() : "—"}
                </span>
              ),
            },
            actions: (
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => openEdit(item)}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void toggleActive(item)}>
                  {item.active ? "Deactivate" : "Activate"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void handleDelete(item.id)}>
                  Delete
                </Button>
              </div>
            ),
          }))}
          emptyMessage="No announcements yet. Create one to show a banner to all tenants."
        />
      )}

      <Modal
        open={modalOpen}
        title={editing ? "Edit announcement" : "New announcement"}
        onClose={() => setModalOpen(false)}
      >
        <div className="space-y-4">
          <div className="form-field">
            <label className="form-label">Message</label>
            <Input
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Scheduled maintenance Saturday 2–4 AM ET"
            />
          </div>
          <div className="form-field">
            <label className="form-label">Severity</label>
            <select
              className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm"
              value={form.severity ?? "info"}
              onChange={(e) => setForm({ ...form, severity: e.target.value })}
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active ?? true}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Active
          </label>
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
    </>
  );
}
