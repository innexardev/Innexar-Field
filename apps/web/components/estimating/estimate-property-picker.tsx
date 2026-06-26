"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { FieldForgeClient, Property } from "@fieldforge/sdk";
import { formatPropertyOptionLabel, propertyHasRoomCounts } from "@/lib/crm/property-format";

interface EstimatePropertyPickerProps {
  client: FieldForgeClient;
  token: string | null;
  customerId: string;
  propertyId: string;
  onPropertyIdChange: (propertyId: string) => void;
  disabled?: boolean;
  selectId?: string;
  showHint?: boolean;
}

export function EstimatePropertyPicker({
  client,
  token,
  customerId,
  propertyId,
  onPropertyIdChange,
  disabled = false,
  selectId = "est-property",
  showHint = true,
}: EstimatePropertyPickerProps) {
  const t = useTranslations("modules.estimates");
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || !customerId) {
      setProperties([]);
      return;
    }
    setLoading(true);
    client
      .listCustomerProperties(customerId)
      .then((r: { data?: Property[] }) => setProperties(r.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, client, customerId]);

  const selectedProperty = properties.find((p) => p.id === propertyId);
  const hasRoomCounts = selectedProperty ? propertyHasRoomCounts(selectedProperty) : false;

  if (!customerId) {
    return <p className="form-hint">{t("propertySelectCustomerFirst")}</p>;
  }

  return (
    <div className="space-y-2">
      <select
        id={selectId}
        className="form-select w-full"
        value={propertyId}
        disabled={disabled || loading}
        onChange={(e) => onPropertyIdChange(e.target.value)}
      >
        <option value="">{t("noPropertySelected")}</option>
        {properties.map((p) => (
          <option key={p.id} value={p.id}>
            {formatPropertyOptionLabel(p, (key, values) => t(key, values))}
          </option>
        ))}
      </select>
      {loading && <p className="form-hint">{t("loadingProperties")}</p>}
      {!loading && properties.length === 0 && (
        <p className="form-hint">
          {t("noPropertiesForCustomer")}{" "}
          <Link href={`/customers/${customerId}/properties`} className="text-[var(--brand-accent)] hover:underline">
            {t("addPropertyLink")}
          </Link>
        </p>
      )}
      {showHint && propertyId && selectedProperty && (
        <p
          className={`text-sm ${hasRoomCounts ? "text-[var(--brand-text-secondary)]" : "text-[var(--brand-warning)]"}`}
        >
          {hasRoomCounts
            ? t("roomTierHint", {
                label: selectedProperty.label,
                beds: selectedProperty.bedrooms ?? 0,
                baths: selectedProperty.bathrooms ?? 0,
              })
            : t("roomTierMissingHint")}
        </p>
      )}
    </div>
  );
}
