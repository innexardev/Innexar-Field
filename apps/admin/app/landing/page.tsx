"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Input } from "@fieldforge/ui";
import { formatErrorForUser, type LandingContentBlock, type LandingContentInput } from "@fieldforge/sdk";
import { AdminPage } from "@/components/admin-shell";
import { DataTable } from "@/components/data-table";
import { ErrorBanner } from "@/components/error-banner";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { MARKETING_URL } from "@/lib/api-url";
import { useAdminPage } from "@/lib/use-admin-page";

const SECTIONS = ["hero", "features", "pricing", "footer"] as const;

const CONTENT_HINTS: Record<string, string> = {
  hero: '{"title":"...","subtitle":"...","cta_label":"...","cta_href":"..."}',
  features: '{"title":"...","cards":[{"title":"...","description":"..."}]}',
  pricing: '{"headline":"..."}',
  footer: '{"testimonials":[{"quote":"...","author":"..."}]}',
};

function summarizeContent(content: Record<string, unknown>) {
  if (typeof content.title === "string") return content.title;
  if (typeof content.headline === "string") return content.headline;
  return JSON.stringify(content).slice(0, 60) + "…";
}

const emptyForm = (): LandingContentInput => ({
  section: "hero",
  block_key: "default",
  content: {},
  active: true,
  sort_order: 0,
});

export default function LandingPage() {
  const { client } = useAdminPage();
  const [blocks, setBlocks] = useState<LandingContentBlock[]>([]);
  const [sectionFilter, setSectionFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<LandingContentBlock | null>(null);
  const [form, setForm] = useState<LandingContentInput>(emptyForm());
  const [contentJson, setContentJson] = useState("{}");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await client.listLandingContent(sectionFilter || undefined);
      setBlocks(res.data);
    } catch (e) {
      setError(formatErrorForUser(e));
    } finally {
      setLoading(false);
    }
  }, [client, sectionFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setContentJson(CONTENT_HINTS.hero);
    setModalOpen(true);
  }

  function openEdit(block: LandingContentBlock) {
    setEditing(block);
    setForm({
      section: block.section,
      block_key: block.block_key,
      active: block.active,
      sort_order: block.sort_order,
    });
    setContentJson(JSON.stringify(block.content, null, 2));
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    let content: Record<string, unknown>;
    try {
      content = JSON.parse(contentJson) as Record<string, unknown>;
    } catch {
      setError("Content must be valid JSON.");
      setSaving(false);
      return;
    }
    const payload = { ...form, content };
    try {
      if (editing) {
        await client.updateLandingContent(editing.id, payload);
      } else {
        await client.createLandingContent(payload);
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
      await client.deleteLandingContent(deleteId);
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
        title="Landing content"
        subtitle="CMS blocks for the marketing site hero, features, and testimonials."
        actions={
          <>
            <a
              href={MARKETING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg border border-[var(--brand-border)] px-4 py-2 text-sm font-medium text-[var(--brand-text-primary)] hover:bg-[var(--brand-surface-elevated)]"
            >
              Preview site ↗
            </a>
            <Button onClick={openCreate}>Create block</Button>
          </>
        }
      />
      <ErrorBanner message={error} className="mb-4" />

      <div className="mb-4">
        <label className="form-label">Filter by section</label>
        <select
          className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm"
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
        >
          <option value="">All sections</option>
          {SECTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--brand-text-secondary)]">Loading content…</p>
      ) : (
        <DataTable
          columns={[
            { key: "section", label: "Section" },
            { key: "key", label: "Block key" },
            { key: "preview", label: "Preview" },
            { key: "status", label: "Status" },
          ]}
          rows={blocks.map((b) => ({
            id: b.id,
            cells: {
              section: <Badge>{b.section}</Badge>,
              key: <code className="text-xs">{b.block_key}</code>,
              preview: summarizeContent(b.content),
              status: (
                <Badge tone={b.active ? "success" : "default"}>{b.active ? "Active" : "Inactive"}</Badge>
              ),
            },
            actions: (
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => openEdit(b)}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleteId(b.id)}>
                  Delete
                </Button>
              </div>
            ),
          }))}
        />
      )}

      <Modal
        open={modalOpen}
        title={editing ? "Edit content block" : "Create content block"}
        onClose={() => setModalOpen(false)}
        wide
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="form-field">
            <label className="form-label">Section</label>
            <select
              className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm"
              value={form.section}
              onChange={(e) => {
                const section = e.target.value;
                setForm({ ...form, section });
                if (!editing) setContentJson(CONTENT_HINTS[section] ?? "{}");
              }}
            >
              {SECTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Block key</label>
            <Input
              value={form.block_key ?? "default"}
              onChange={(e) => setForm({ ...form, block_key: e.target.value })}
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
            <label className="form-label">Content (JSON)</label>
            <textarea
              className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 font-mono text-xs"
              rows={10}
              value={contentJson}
              onChange={(e) => setContentJson(e.target.value)}
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

      <Modal open={!!deleteId} title="Delete content block" onClose={() => setDeleteId(null)}>
        <p className="text-sm text-[var(--brand-text-secondary)]">Delete this landing content block?</p>
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
