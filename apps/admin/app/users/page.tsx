"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge, Button, Input } from "@fieldforge/ui";
import {
  formatErrorForUser,
  type PlatformTenant,
  type PlatformUser,
  type PlatformUserCreateInput,
  type PlatformUserUpdateInput,
} from "@fieldforge/sdk";
import { AdminPage } from "@/components/admin-shell";
import { DataTable } from "@/components/data-table";
import { ErrorBanner } from "@/components/error-banner";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { useAdminPage } from "@/lib/use-admin-page";

const ROLES = ["owner", "admin", "accountant", "dispatcher", "field-tech"] as const;

function displayName(user: PlatformUser): string {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return name || user.email;
}

function roleTone(role: string): "success" | "default" {
  return role === "owner" ? "success" : "default";
}

const emptyCreateForm = (): PlatformUserCreateInput => ({
  tenant_id: "",
  email: "",
  password: "",
  role: "admin",
  first_name: "",
  last_name: "",
});

export default function UsersPage() {
  const searchParams = useSearchParams();
  const { client } = useAdminPage();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [tenantFilter, setTenantFilter] = useState(searchParams.get("tenant") ?? "");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<PlatformUser | null>(null);
  const [createForm, setCreateForm] = useState<PlatformUserCreateInput>(emptyCreateForm());
  const [editForm, setEditForm] = useState<PlatformUserUpdateInput>({});
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [userRes, tenantRes] = await Promise.all([
        client.listUsers(tenantFilter ? { tenant_id: tenantFilter } : undefined),
        client.listTenants(),
      ]);
      setUsers(userRes.data);
      setTenants(tenantRes.data);
    } catch (e) {
      setError(formatErrorForUser(e));
    } finally {
      setLoading(false);
    }
  }, [client, tenantFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        displayName(u).toLowerCase().includes(q) ||
        u.tenant_name?.toLowerCase().includes(q) ||
        u.tenant_slug?.toLowerCase().includes(q),
    );
  }, [users, search]);

  function openCreate() {
    setEditing(null);
    setCreateForm({ ...emptyCreateForm(), tenant_id: tenantFilter });
    setModalOpen(true);
  }

  function openEdit(user: PlatformUser) {
    setEditing(user);
    setEditForm({
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await client.updateUser(editing.id, editForm);
      } else {
        await client.createUser(createForm);
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
    if (!deleteUser) return;
    setSaving(true);
    setError("");
    try {
      await client.deleteUser(deleteUser.id);
      setDeleteUser(null);
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
        title="Users"
        subtitle="Platform-wide workspace member management."
        actions={<Button onClick={openCreate}>Create user</Button>}
      />
      <ErrorBanner message={error} className="mb-4" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="form-field flex-1">
          <label className="form-label">Search</label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Email, name, or tenant…"
          />
        </div>
        <div className="form-field sm:w-56">
          <label className="form-label">Tenant</label>
          <select
            className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm"
            value={tenantFilter}
            onChange={(e) => setTenantFilter(e.target.value)}
          >
            <option value="">All tenants</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--brand-text-secondary)]">Loading users…</p>
      ) : (
        <DataTable
          columns={[
            { key: "user", label: "User" },
            { key: "tenant", label: "Tenant" },
            { key: "role", label: "Role" },
            { key: "created", label: "Created" },
          ]}
          rows={filtered.map((u) => ({
            id: u.id,
            cells: {
              user: (
                <div>
                  <p className="font-medium">{displayName(u)}</p>
                  <p className="text-xs text-[var(--brand-text-muted)]">{u.email}</p>
                </div>
              ),
              tenant: (
                <div>
                  <p className="text-sm">{u.tenant_name}</p>
                  <Link href={`/tenants/${u.tenant_id}`} className="text-xs text-[var(--brand-accent)]">
                    {u.tenant_slug}
                  </Link>
                </div>
              ),
              role: <Badge tone={roleTone(u.role)}>{u.role}</Badge>,
              created: new Date(u.created_at).toLocaleDateString(),
            },
            actions: (
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => openEdit(u)}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleteUser(u)}>
                  Delete
                </Button>
              </div>
            ),
          }))}
        />
      )}

      <Modal
        open={modalOpen}
        title={editing ? "Edit user" : "Create user"}
        onClose={() => setModalOpen(false)}
        wide
      >
        {editing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="form-field sm:col-span-2">
              <label className="form-label">Email</label>
              <Input
                value={editForm.email ?? ""}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label className="form-label">First name</label>
              <Input
                value={editForm.first_name ?? ""}
                onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Last name</label>
              <Input
                value={editForm.last_name ?? ""}
                onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Role</label>
              <select
                className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm"
                value={editForm.role ?? "admin"}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">New password (optional)</label>
              <Input
                type="password"
                value={editForm.password ?? ""}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="Leave blank to keep current"
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="form-field sm:col-span-2">
              <label className="form-label">Tenant</label>
              <select
                className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm"
                value={createForm.tenant_id}
                onChange={(e) => setCreateForm({ ...createForm, tenant_id: e.target.value })}
              >
                <option value="">Select tenant…</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.slug})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field sm:col-span-2">
              <label className="form-label">Email</label>
              <Input
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Password</label>
              <Input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Role</label>
              <select
                className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm"
                value={createForm.role ?? "admin"}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">First name</label>
              <Input
                value={createForm.first_name ?? ""}
                onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Last name</label>
              <Input
                value={createForm.last_name ?? ""}
                onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
              />
            </div>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </Modal>

      <Modal open={!!deleteUser} title="Delete user" onClose={() => setDeleteUser(null)}>
        <p className="text-sm text-[var(--brand-text-secondary)]">
          Delete <strong>{deleteUser?.email}</strong> from {deleteUser?.tenant_name}? This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteUser(null)}>
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
