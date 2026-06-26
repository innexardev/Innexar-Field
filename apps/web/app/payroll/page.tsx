"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Employee } from "@fieldforge/sdk";
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

export default function PayrollPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.payroll");
  const tc = useTranslations("modules.common");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [employmentType, setEmploymentType] = useState("w2");
  const [hourlyRate, setHourlyRate] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (token) client.listEmployees().then((r) => setEmployees(r.data ?? [])).catch(console.error);
  }, [token, client]);

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
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div>
                  <div className="font-medium">
                    {employee.first_name} {employee.last_name}
                  </div>
                  <div className="text-sm text-[var(--brand-text-secondary)]">
                    {employee.email || tc("noEmail")} · {formatCents(employee.hourly_rate_cents)}{tc("perHour")}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone="default">
                    {employee.employment_type === "1099" ? t("contractor1099") : "W-2"}
                  </Badge>
                  <Badge tone={employee.status === "active" ? "success" : "default"}>{employee.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </ModulePage>
  );
}
