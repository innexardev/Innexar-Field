"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { Employee, TaxProfile } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, IconFileText } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

const FILING_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "married_filing_jointly", label: "Married Filing Jointly" },
  { value: "married_filing_separately", label: "Married Filing Separately" },
  { value: "head_of_household", label: "Head of Household" },
] as const;

const FILING_LABELS: Record<string, string> = Object.fromEntries(
  FILING_OPTIONS.map((o) => [o.value, o.label]),
);

export default function TaxWithholdingPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.payrollTax");
  const tc = useTranslations("modules.common");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [profiles, setProfiles] = useState<TaxProfile[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [filingStatus, setFilingStatus] = useState("single");
  const [allowances, setAllowances] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    client.listEmployees().then((r) => setEmployees(r.data ?? [])).catch(console.error);
    client.listTaxProfiles().then((r) => setProfiles(r.data ?? [])).catch(console.error);
  }, [token, client]);

  const employeeName = (id: string) => {
    const e = employees.find((emp) => emp.id === id);
    return e ? `${e.first_name} ${e.last_name}` : `Employee ${id.slice(0, 8)}`;
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId) return;
    setSaving(true);
    try {
      const profile = await client.upsertTaxProfile({
        employee_id: employeeId,
        filing_status: filingStatus,
        allowances: parseInt(allowances, 10) || 0,
      });
      setProfiles((prev) => {
        const rest = prev.filter((p) => p.employee_id !== profile.employee_id);
        return [profile, ...rest];
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <Card>
        <CardHeader>
          <CardTitle>Employee W-4</CardTitle>
          <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">
            Record federal filing status and allowances from Form W-4 before running payroll withholdings.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="form-field">
                <label className="form-label" htmlFor="w4-employee">
                  Employee
                </label>
                <select
                  id="w4-employee"
                  className="form-select"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  required
                >
                  <option value="">Select employee</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.first_name} {e.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="w4-filing">
                  Filing status
                </label>
                <select
                  id="w4-filing"
                  className="form-select"
                  value={filingStatus}
                  onChange={(e) => setFilingStatus(e.target.value)}
                >
                  {FILING_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="w4-allowances">
                  Allowances
                </label>
                <Input
                  id="w4-allowances"
                  type="number"
                  min="0"
                  step="1"
                  value={allowances}
                  onChange={(e) => setAllowances(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Button type="submit" disabled={saving || employees.length === 0}>
                {saving ? "Saving…" : "Save W-4 profile"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 space-y-3">
        {profiles.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <IconFileText size={28} className="text-[var(--brand-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
            <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
          </div>
        ) : (
          profiles.map((profile, i) => (
            <Card key={profile.id} className="list-item-card stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div>
                  <div className="font-medium">{employeeName(profile.employee_id)}</div>
                  <div className="text-sm text-[var(--brand-text-secondary)]">
                    {FILING_LABELS[profile.filing_status] ?? profile.filing_status} · {profile.allowances} allowance
                    {profile.allowances === 1 ? "" : "s"}
                  </div>
                </div>
                <Badge tone="default">W-4</Badge>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </ModulePage>
  );
}
