"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Customer, Property } from "@fieldforge/sdk";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  IconBuilding,
} from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

function formatAddress(p: Property) {
  const parts = [p.street, p.city, p.state, p.zip].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "No address on file";
}

export default function CustomerPropertiesPage() {
  const params = useParams<{ id: string }>();
  const { client, token } = useAppPage();
  const t = useTranslations("modules.customerProperties");
  const tc = useTranslations("modules.common");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token || !params.id) return;
    const id = params.id;
    Promise.all([client.getCustomer(id), client.listCustomerProperties(id)])
      .then(([c, propsRes]) => {
        setCustomer(c);
        setProperties(propsRes.data ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, client, params.id]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!params.id) return;
    setSaving(true);
    try {
      const created = await client.createCustomerProperty(params.id, {
        label,
        street,
        city,
        state,
        zip,
        is_primary: isPrimary,
      });
      setProperties((prev) =>
        [created, ...prev.filter((p) => !created.is_primary || !p.is_primary)].sort((a, b) =>
          Number(b.is_primary) - Number(a.is_primary),
        ),
      );
      setLabel("");
      setStreet("");
      setCity("");
      setState("");
      setZip("");
      setIsPrimary(false);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <ModulePage title={tc("properties")} subtitle={tc("loadingServiceLocations")}>
        <p className="text-sm text-[var(--brand-text-muted)]">{tc("loading")}</p>
      </ModulePage>
    );
  }

  if (!customer) {
    return (
      <ModulePage title={tc("properties")} subtitle={tc("customerNotFound")}>
        <Link href="/customers" className="text-sm text-[var(--brand-accent)] hover:underline">
          {tc("backToCustomers")}
        </Link>
      </ModulePage>
    );
  }

  return (
    <ModulePage title={tc("titleWithSuffix", { name: customer.name, suffix: t("suffix") })} subtitle={t("subtitle")}>
      <div className="mb-6">
        <Link href={`/customers/${customer.id}`} className="text-sm text-[var(--brand-accent)] hover:underline">
          {tc("customerProfile")}
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add property</CardTitle>
          <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">
            Store service locations to schedule jobs at the right address.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="form-field">
              <label className="form-label" htmlFor="prop-label">Label</label>
              <Input id="prop-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Main site" required />
            </div>
            <div className="form-field sm:col-span-2">
              <label className="form-label" htmlFor="prop-street">Street</label>
              <Input id="prop-street" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="1200 Oak Street" />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="prop-city">City</label>
              <Input id="prop-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Austin" />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="prop-state">State</label>
              <Input id="prop-state" value={state} onChange={(e) => setState(e.target.value)} placeholder="TX" />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="prop-zip">ZIP</label>
              <Input id="prop-zip" value={zip} onChange={(e) => setZip(e.target.value)} placeholder="78701" />
            </div>
            <div className="flex items-center gap-2 sm:col-span-3">
              <input
                id="prop-primary"
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="rounded border-[var(--brand-border)]"
              />
              <label htmlFor="prop-primary" className="text-sm">Primary service location</label>
            </div>
            <div className="sm:col-span-3">
              <Button type="submit" disabled={saving}>{saving ? "Adding…" : "Add property"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8">
        {properties.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <IconBuilding size={28} className="text-[var(--brand-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold">No properties yet</h3>
            <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">
              Add service locations to schedule jobs at the right address.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {properties.map((prop, i) => (
              <Card key={prop.id} className="list-item-card stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <IconBuilding size={18} className="text-[var(--brand-accent)]" />
                    <CardTitle className="text-base">{prop.label}</CardTitle>
                  </div>
                  {prop.is_primary && <Badge tone="success">Primary</Badge>}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[var(--brand-text-secondary)]">{formatAddress(prop)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ModulePage>
  );
}
