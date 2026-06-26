"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { Subcontractor } from "@fieldforge/sdk";
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
import { useAppPage } from "@/lib/use-app-page";

export default function SubcontractorsPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.subcontractors");
  const tc = useTranslations("modules.common");
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [trade, setTrade] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    client.listSubcontractors().then((r) => setSubcontractors(r.data ?? [])).catch(console.error);
  }, [token, client]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await client.createSubcontractor({
        company_name: companyName,
        contact_name: contactName || undefined,
        email: email || undefined,
        phone: phone || undefined,
        trade: trade || undefined,
      });
      setSubcontractors((prev) => [created, ...prev]);
      setCompanyName("");
      setContactName("");
      setEmail("");
      setPhone("");
      setTrade("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <Card>
        <CardHeader>
          <CardTitle>Add subcontractor</CardTitle>
          <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">
            Track electricians, plumbers, and other trade partners assigned to projects.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_140px_auto] lg:items-end">
            <div className="form-field">
              <label className="form-label" htmlFor="sc-company">Company</label>
              <Input
                id="sc-company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="ABC Electric LLC"
                required
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="sc-contact">Contact</label>
              <Input
                id="sc-contact"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Jordan Lee"
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="sc-email">{tc("email")}</label>
              <Input
                id="sc-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ops@abc-electric.com"
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="sc-phone">Phone</label>
              <Input
                id="sc-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="sc-trade">Trade</label>
              <Input
                id="sc-trade"
                value={trade}
                onChange={(e) => setTrade(e.target.value)}
                placeholder="Electrical"
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? tc("adding") : "Add subcontractor"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 space-y-3">
        {subcontractors.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <IconUsers size={28} className="text-[var(--brand-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
            <p className="mt-2 max-w-md text-sm text-[var(--brand-text-secondary)]">
              Add trade partners above to assign them to construction projects.
            </p>
          </div>
        ) : (
          subcontractors.map((sc) => (
            <Card key={sc.id} className="list-item-card">
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div>
                  <div className="font-medium">{sc.company_name}</div>
                  <div className="text-sm text-[var(--brand-text-secondary)]">
                    {[sc.trade, sc.contact_name].filter(Boolean).join(" · ") || "No contact on file"}
                  </div>
                  {(sc.email || sc.phone) && (
                    <div className="mt-1 text-sm text-[var(--brand-text-muted)]">
                      {[sc.email, sc.phone].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
                <Badge tone={sc.status === "active" ? "success" : "default"}>{sc.status}</Badge>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </ModulePage>
  );
}
