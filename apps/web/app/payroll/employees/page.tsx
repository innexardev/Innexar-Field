"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Employee, WorkspaceUser } from "@fieldforge/sdk";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  IconUsers,
} from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage, formatCents } from "@/lib/use-app-page";

function displayUser(user: WorkspaceUser): string {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return name ? `${name} (${user.email})` : user.email;
}

export default function PayrollEmployeesPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.payroll");
  const tc = useTranslations("modules.common");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [employmentType, setEmploymentType] = useState("w2");
  const [hourlyRate, setHourlyRate] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [linkUserId, setLinkUserId] = useState("");
  const [savingLink, setSavingLink] = useState(false);

  const refresh = useCallback(async () => {
    const [empResult, userResult] = await Promise.all([
      client.listEmployees(),
      client.listUsers(),
    ]);
    setEmployees(empResult.data ?? []);
    setUsers(userResult.data ?? []);
  }, [client]);

  useEffect(() => {
    if (token) void refresh().catch(console.error);
  }, [token, refresh]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const hourlyRateCents = hourlyRate ? Math.round(parseFloat(hourlyRate) * 100) : 0;
      const employee = await client.createEmployee({
        first_name: firstName,
        last_name: lastName,
        email,
        employment_type: employmentType,
        hourly_rate_cents: hourlyRateCents,
      });
      setEmployees((prev) => [employee, ...prev]);
      setFirstName("");
      setLastName("");
      setEmail("");
      setEmploymentType("w2");
      setHourlyRate("");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(employee: Employee) {
    setEditingId(employee.id);
    setLinkUserId(employee.user_id ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setLinkUserId("");
  }

  async function saveUserLink(employeeId: string) {
    setSavingLink(true);
    try {
      const updated = await client.updateEmployee(employeeId, {
        user_id: linkUserId || null,
      });
      setEmployees((prev) => prev.map((e) => (e.id === employeeId ? updated : e)));
      cancelEdit();
    } finally {
      setSavingLink(false);
    }
  }

  function linkedUserLabel(userId?: string): string {
    if (!userId) return t("noLinkedUser");
    const user = users.find((u) => u.id === userId);
    return user ? displayUser(user) : userId;
  }

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <Card>
        <CardHeader>
          <CardTitle>{t("addTitle")}</CardTitle>
          <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">{t("addDescription")}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_140px_120px_auto] lg:items-end">
            <div className="form-field">
              <label className="form-label" htmlFor="emp-first">{tc("firstName")}</label>
              <Input
                id="emp-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
                required
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="emp-last">{tc("lastName")}</label>
              <Input
                id="emp-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                required
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="emp-email">{tc("email")}</label>
              <Input
                id="emp-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="emp-type">{tc("type")}</label>
              <select
                id="emp-type"
                className="form-input"
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
              >
                <option value="w2">W-2</option>
                <option value="1099">1099</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="emp-rate">{tc("hourlyRateUsd")}</label>
              <Input
                id="emp-rate"
                type="number"
                step="0.01"
                min="0"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="25.00"
              />
            </div>
            <Button type="submit" disabled={creating}>
              {creating ? tc("adding") : t("addEmployee")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 space-y-3">
        {employees.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <IconUsers size={28} className="text-[var(--brand-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
            <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
          </div>
        ) : (
          employees.map((employee, i) => (
            <Card key={employee.id} className="list-item-card stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
              <CardContent className="py-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium">
                      {employee.first_name} {employee.last_name}
                    </div>
                    <div className="text-sm text-[var(--brand-text-secondary)]">
                      {employee.email || tc("noEmail")} · {formatCents(employee.hourly_rate_cents)}{tc("perHour")}
                    </div>
                    <div className="mt-1 text-sm text-[var(--brand-text-muted)]">
                      {t("linkedUser")}: {linkedUserLabel(employee.user_id)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone="default">
                      {employee.employment_type === "1099" ? t("contractor1099") : "W-2"}
                    </Badge>
                    <Badge tone={employee.status === "active" ? "success" : "default"}>{employee.status}</Badge>
                    {editingId !== employee.id && (
                      <Button variant="secondary" size="sm" onClick={() => startEdit(employee)}>
                        {t("editEmployee")}
                      </Button>
                    )}
                  </div>
                </div>

                {editingId === employee.id && (
                  <div className="mt-4 border-t border-[var(--brand-border)] pt-4">
                    <p className="mb-2 text-sm font-medium">{t("linkUserTitle")}</p>
                    <p className="mb-3 text-sm text-[var(--brand-text-secondary)]">{t("linkUserDescription")}</p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <div className="form-field flex-1">
                        <label className="form-label" htmlFor={`link-user-${employee.id}`}>
                          {t("selectUser")}
                        </label>
                        <select
                          id={`link-user-${employee.id}`}
                          className="form-input"
                          value={linkUserId}
                          onChange={(e) => setLinkUserId(e.target.value)}
                        >
                          <option value="">{t("unlinkUser")}</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {displayUser(user)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          disabled={savingLink}
                          onClick={() => void saveUserLink(employee.id)}
                        >
                          {savingLink ? tc("saving") : t("saveLink")}
                        </Button>
                        <Button variant="secondary" onClick={cancelEdit}>
                          {tc("cancel")}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </ModulePage>
  );
}
