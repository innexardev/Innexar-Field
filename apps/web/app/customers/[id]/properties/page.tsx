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

function formatAddress(p: Property, noAddress: string) {
  const parts = [p.street, p.city, p.state, p.zip].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : noAddress;
}

function optionalInt(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function optionalFloat(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = parseFloat(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
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

type PropertyFormState = {
  label: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  bedrooms: string;
  bathrooms: string;
  sqft: string;
  isPrimary: boolean;
};

function emptyForm(): PropertyFormState {
  return {
    label: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    bedrooms: "",
    bathrooms: "",
    sqft: "",
    isPrimary: false,
  };
}

function formFromProperty(p: Property): PropertyFormState {
  return {
    label: p.label,
    street: p.street,
    city: p.city,
    state: p.state,
    zip: p.zip,
    bedrooms: p.bedrooms != null ? String(p.bedrooms) : "",
    bathrooms: p.bathrooms != null ? String(p.bathrooms) : "",
    sqft: p.sqft != null ? String(p.sqft) : "",
    isPrimary: p.is_primary,
  };
}

function PropertyFields({
  form,
  setForm,
  idPrefix,
  t,
}: {
  form: PropertyFormState;
  setForm: (next: PropertyFormState) => void;
  idPrefix: string;
  t: ReturnType<typeof useTranslations<"modules.customerProperties">>;
}) {
  return (
    <>
      <div className="form-field">
        <label className="form-label" htmlFor={`${idPrefix}-label`}>
          {t("label")}
        </label>
        <Input
          id={`${idPrefix}-label`}
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          placeholder={t("labelPlaceholder")}
          required
        />
      </div>
      <div className="form-field sm:col-span-2">
        <label className="form-label" htmlFor={`${idPrefix}-street`}>
          {t("street")}
        </label>
        <Input
          id={`${idPrefix}-street`}
          value={form.street}
          onChange={(e) => setForm({ ...form, street: e.target.value })}
          placeholder={t("streetPlaceholder")}
        />
      </div>
      <div className="form-field">
        <label className="form-label" htmlFor={`${idPrefix}-city`}>
          {t("city")}
        </label>
        <Input
          id={`${idPrefix}-city`}
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          placeholder={t("cityPlaceholder")}
        />
      </div>
      <div className="form-field">
        <label className="form-label" htmlFor={`${idPrefix}-state`}>
          {t("state")}
        </label>
        <Input
          id={`${idPrefix}-state`}
          value={form.state}
          onChange={(e) => setForm({ ...form, state: e.target.value })}
          placeholder={t("statePlaceholder")}
        />
      </div>
      <div className="form-field">
        <label className="form-label" htmlFor={`${idPrefix}-zip`}>
          {t("zip")}
        </label>
        <Input
          id={`${idPrefix}-zip`}
          value={form.zip}
          onChange={(e) => setForm({ ...form, zip: e.target.value })}
          placeholder={t("zipPlaceholder")}
        />
      </div>
      <div className="form-field">
        <label className="form-label" htmlFor={`${idPrefix}-bedrooms`}>
          {t("bedrooms")}
        </label>
        <Input
          id={`${idPrefix}-bedrooms`}
          type="number"
          min={0}
          step={1}
          value={form.bedrooms}
          onChange={(e) => setForm({ ...form, bedrooms: e.target.value })}
        />
      </div>
      <div className="form-field">
        <label className="form-label" htmlFor={`${idPrefix}-bathrooms`}>
          {t("bathrooms")}
        </label>
        <Input
          id={`${idPrefix}-bathrooms`}
          type="number"
          min={0}
          step={0.5}
          value={form.bathrooms}
          onChange={(e) => setForm({ ...form, bathrooms: e.target.value })}
        />
      </div>
      <div className="form-field">
        <label className="form-label" htmlFor={`${idPrefix}-sqft`}>
          {t("sqft")}
        </label>
        <Input
          id={`${idPrefix}-sqft`}
          type="number"
          min={0}
          step={1}
          value={form.sqft}
          onChange={(e) => setForm({ ...form, sqft: e.target.value })}
        />
      </div>
      <div className="flex items-center gap-2 sm:col-span-3">
        <input
          id={`${idPrefix}-primary`}
          type="checkbox"
          checked={form.isPrimary}
          onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })}
          className="rounded border-[var(--brand-border)]"
        />
        <label htmlFor={`${idPrefix}-primary`} className="text-sm">
          {t("isPrimary")}
        </label>
      </div>
    </>
  );
}

export default function CustomerPropertiesPage() {
  const params = useParams<{ id: string }>();
  const { client, token } = useAppPage();
  const t = useTranslations("modules.customerProperties");
  const tc = useTranslations("modules.common");
  const tCommon = useTranslations("common");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [createForm, setCreateForm] = useState<PropertyFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PropertyFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

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

  function sortProperties(list: Property[]) {
    return [...list].sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!params.id) return;
    setSaving(true);
    try {
      const created = await client.createCustomerProperty(params.id, {
        label: createForm.label,
        street: createForm.street,
        city: createForm.city,
        state: createForm.state,
        zip: createForm.zip,
        is_primary: createForm.isPrimary,
        bedrooms: optionalInt(createForm.bedrooms),
        bathrooms: optionalFloat(createForm.bathrooms),
        sqft: optionalInt(createForm.sqft),
      });
      setProperties((prev) =>
        sortProperties(
          [created, ...prev.filter((p) => !created.is_primary || !p.is_primary)],
        ),
      );
      setCreateForm(emptyForm());
    } finally {
      setSaving(false);
    }
  }

  function startEdit(prop: Property) {
    setEditingId(prop.id);
    setEditForm(formFromProperty(prop));
    setSavedId(null);
  }

  async function onSaveEdit(e: React.FormEvent, propertyId: string) {
    e.preventDefault();
    if (!params.id) return;
    setSaving(true);
    setSavedId(null);
    try {
      const updated = await client.updateCustomerProperty(params.id, propertyId, {
        label: editForm.label,
        street: editForm.street,
        city: editForm.city,
        state: editForm.state,
        zip: editForm.zip,
        is_primary: editForm.isPrimary,
        bedrooms: optionalInt(editForm.bedrooms),
        bathrooms: optionalFloat(editForm.bathrooms),
        sqft: optionalInt(editForm.sqft),
      });
      setProperties((prev) =>
        sortProperties(
          prev
            .filter((p) => p.id !== propertyId)
            .filter((p) => !updated.is_primary || !p.is_primary)
            .concat(updated),
        ),
      );
      setEditingId(null);
      setSavedId(propertyId);
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
          <CardTitle>{t("addTitle")}</CardTitle>
          <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">{t("addDescription")}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <PropertyFields form={createForm} setForm={setCreateForm} idPrefix="create" t={t} />
            <div className="sm:col-span-3">
              <Button type="submit" disabled={saving}>
                {saving ? tc("adding") : t("addProperty")}
              </Button>
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
            <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
            <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {properties.map((prop, i) => {
              const details = formatPropertyDetails(prop, t);
              const isEditing = editingId === prop.id;

              return (
                <Card key={prop.id} className="list-item-card stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
                  <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <IconBuilding size={18} className="text-[var(--brand-accent)]" />
                      <CardTitle className="text-base">{prop.label}</CardTitle>
                    </div>
                    {prop.is_primary && <Badge tone="success">{t("primary")}</Badge>}
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <form onSubmit={(e) => onSaveEdit(e, prop.id)} className="grid gap-4 sm:grid-cols-2">
                        <PropertyFields form={editForm} setForm={setEditForm} idPrefix={`edit-${prop.id}`} t={t} />
                        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                          <Button type="submit" disabled={saving}>
                            {saving ? tc("saving") : t("saveProperty")}
                          </Button>
                          <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>
                            {tCommon("cancel")}
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <p className="text-sm text-[var(--brand-text-secondary)]">
                          {formatAddress(prop, t("noAddress"))}
                        </p>
                        {details && (
                          <p className="mt-1 text-sm font-medium text-[var(--brand-text-primary)]">{details}</p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(prop)}>
                            {t("edit")}
                          </Button>
                          {savedId === prop.id && (
                            <span className="text-sm text-[var(--brand-success)]">{t("propertySaved")}</span>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ModulePage>
  );
}
