"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Customer, Invoice, Job, Property } from "@fieldforge/sdk";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  IconBuilding,
  IconCalendar,
  IconFileText,
  IconReceipt,
  IconUsers,
  Input,
} from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage, formatCents } from "@/lib/use-app-page";

function formatAddress(p: Property) {
  const parts = [p.street, p.city, p.state, p.zip].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "";
}

function formatPropertyDetails(
  p: Property,
  t: (key: "propertyDetails", values: { beds: number; baths: number; sqft: number }) => string,
) {
  const beds = p.bedrooms ?? 0;
  const baths = p.bathrooms ?? 0;
  const sqft = p.sqft ?? 0;
  if (beds === 0 && baths === 0 && sqft === 0) return "";
  return t("propertyDetails", { beds, baths, sqft });
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const { client, token } = useAppPage();
  const t = useTranslations("modules.customerDetail");
  const tc = useTranslations("modules.common");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [primaryProperty, setPrimaryProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!token || !params.id) return;
    const id = params.id;
    Promise.all([
      client.getCustomer(id),
      client.listJobs(),
      client.listInvoices(),
      client.listCustomerProperties(id),
    ])
      .then(([c, jobsRes, invRes, propsRes]) => {
        setCustomer(c);
        setEmail(c.email ?? "");
        setPhone(c.phone ?? "");
        setNotes(c.notes ?? "");
        setJobs(jobsRes.data.filter((j) => j.customer_id === id));
        setInvoices(invRes.data.filter((i) => i.customer_id === id));
        const props = propsRes.data ?? [];
        setPrimaryProperty(props.find((p) => p.is_primary) ?? props[0] ?? null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, client, params.id]);

  async function saveContact(e: React.FormEvent) {
    e.preventDefault();
    if (!customer) return;
    setSaving(true);
    setSaved(false);
    try {
      const updated = await client.updateCustomer(customer.id, { email, phone, notes });
      setCustomer(updated);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <ModulePage title={tc("customer")} subtitle={tc("loadingProfile")}>
        <p className="text-sm text-[var(--brand-text-muted)]">{tc("loading")}</p>
      </ModulePage>
    );
  }

  if (!customer) {
    return (
      <ModulePage title={tc("customer")} subtitle={tc("profileNotFound")}>
        <Link href="/customers" className="text-sm text-[var(--brand-accent)] hover:underline">
          {tc("backToCustomers")}
        </Link>
      </ModulePage>
    );
  }

  const addressLine = primaryProperty ? formatAddress(primaryProperty) : "";
  const propertyDetails = primaryProperty ? formatPropertyDetails(primaryProperty, t) : "";

  return (
    <ModulePage title={customer.name} subtitle={t("subtitle")}>
      <div className="mb-6">
        <Link href="/customers" className="text-sm text-[var(--brand-accent)] hover:underline">
          {tc("allCustomers")}
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-info-subtle)] text-xl font-semibold text-[var(--brand-accent)]">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <CardTitle>{customer.name}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveContact} className="space-y-4">
                <h3 className="text-sm font-semibold text-[var(--brand-text-primary)]">{t("contactTitle")}</h3>
                <div className="form-field">
                  <label className="form-label" htmlFor="customer-email">{tc("email")}</label>
                  <Input
                    id="customer-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setSaved(false);
                    }}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="customer-phone">{tc("phone")}</label>
                  <Input
                    id="customer-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setSaved(false);
                    }}
                    placeholder={t("phonePlaceholder")}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="customer-company">{t("companyNotes")}</label>
                  <Input
                    id="customer-company"
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                      setSaved(false);
                    }}
                    placeholder={t("companyPlaceholder")}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">{tc("address")}</label>
                  {addressLine ? (
                    <p className="text-sm font-medium text-[var(--brand-text-primary)]">{addressLine}</p>
                  ) : (
                    <p className="text-sm text-[var(--brand-text-muted)]">{t("addressHint")}</p>
                  )}
                  {propertyDetails && (
                    <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">{propertyDetails}</p>
                  )}
                  <Link
                    href={`/customers/${customer.id}/properties`}
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--brand-accent)] hover:underline"
                  >
                    <IconBuilding size={14} />
                    {t("manageProperties")}
                  </Link>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? tc("saving") : t("saveContact")}
                  </Button>
                  {saved && (
                    <span className="text-sm text-[var(--brand-success)]">{t("contactSaved")}</span>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-wrap gap-2 py-4">
              <Link
                href={`/customers/${customer.id}/properties`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-3 py-1.5 text-xs font-medium"
              >
                <IconBuilding size={14} />
                {tc("properties")}
              </Link>
              <Link
                href={`/customers/${customer.id}/jobs`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-3 py-1.5 text-xs font-medium"
              >
                <IconCalendar size={14} />
                {t("jobsTitle")}
              </Link>
              <Link
                href={`/customers/${customer.id}/invoices`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-3 py-1.5 text-xs font-medium"
              >
                <IconReceipt size={14} />
                {t("invoicesTitle")}
              </Link>
              <a
                href={`/estimates?customer=${customer.id}`}
                className="inline-flex items-center rounded-lg bg-[var(--brand-accent)] px-3 py-1.5 text-xs font-medium text-[var(--brand-accent-foreground)]"
              >
                {t("newEstimate")}
              </a>
              <a
                href="/jobs"
                className="inline-flex items-center rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-3 py-1.5 text-xs font-medium"
              >
                {t("scheduleJob")}
              </a>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <IconCalendar size={18} className="text-[var(--brand-accent)]" />
                  <CardTitle>{t("jobsTitle")}</CardTitle>
                </div>
                <Link
                  href={`/customers/${customer.id}/jobs`}
                  className="text-xs font-medium text-[var(--brand-accent)] hover:underline"
                >
                  {t("viewAll")}
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {jobs.length === 0 ? (
                <p className="text-sm text-[var(--brand-text-secondary)]">{t("noJobs")}</p>
              ) : (
                <ul className="space-y-2">
                  {jobs.map((job) => (
                    <li key={job.id}>
                      <Link href={`/jobs`} className="list-item-card flex items-center justify-between rounded-lg px-4 py-3">
                        <span className="font-medium">{job.title}</span>
                        <Badge>{job.status}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <IconReceipt size={18} className="text-[var(--brand-accent)]" />
                  <CardTitle>{t("invoicesTitle")}</CardTitle>
                </div>
                <Link
                  href={`/customers/${customer.id}/invoices`}
                  className="text-xs font-medium text-[var(--brand-accent)] hover:underline"
                >
                  {t("viewAll")}
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-sm text-[var(--brand-text-secondary)]">{t("noInvoices")}</p>
              ) : (
                <ul className="space-y-2">
                  {invoices.map((inv) => (
                    <li key={inv.id}>
                      <Link href={`/invoices/${inv.id}`} className="list-item-card flex items-center justify-between rounded-lg px-4 py-3">
                        <span className="font-medium">{inv.invoice_number}</span>
                        <span className="text-sm text-[var(--brand-text-secondary)]">
                          {formatCents(inv.total_cents)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <IconFileText size={18} className="text-[var(--brand-accent)]" />
                <CardTitle>{t("quickLinks")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              <Link href="/estimates" className="quick-link group">
                <IconFileText size={16} />
                <span>{tc("estimate")}</span>
              </Link>
              <Link href="/leads" className="quick-link group">
                <IconUsers size={16} />
                <span>{tc("lead")}</span>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </ModulePage>
  );
}
