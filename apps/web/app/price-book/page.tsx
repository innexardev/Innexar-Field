"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { PriceBookItem, PriceBookTier } from "@fieldforge/sdk";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  IconFileText,
} from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage, formatCents } from "@/lib/use-app-page";

type PricingModel = "flat" | "room_based";

const DEFAULT_TIERS: PriceBookTier[] = [
  { beds: 1, baths: 1, price_cents: 12000 },
  { beds: 2, baths: 1, price_cents: 15000 },
  { beds: 3, baths: 2, price_cents: 18500 },
];

function emptyTier(): PriceBookTier {
  return { beds: 1, baths: 1, price_cents: 0 };
}

export default function PriceBookPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.priceBook");
  const tc = useTranslations("modules.common");
  const [items, setItems] = useState<PriceBookItem[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("service");
  const [unit, setUnit] = useState("each");
  const [price, setPrice] = useState("");
  const [pricingModel, setPricingModel] = useState<PricingModel>("flat");
  const [tiers, setTiers] = useState<PriceBookTier[]>(DEFAULT_TIERS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (token) client.listPriceBookItems().then((r) => setItems(r.data ?? [])).catch(console.error);
  }, [token, client]);

  function onPricingModelChange(next: PricingModel) {
    setPricingModel(next);
    if (next === "room_based" && tiers.length === 0) {
      setTiers(DEFAULT_TIERS);
    }
  }

  function updateTier(index: number, field: keyof PriceBookTier, value: number) {
    setTiers((prev) => prev.map((tier, i) => (i === index ? { ...tier, [field]: value } : tier)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(price) * 100);
    if (pricingModel === "flat" && Number.isNaN(cents)) return;
    setSaving(true);
    try {
      const item = await client.createPriceBookItem({
        name,
        category,
        unit: pricingModel === "room_based" ? "visit" : unit,
        unit_price_cents: pricingModel === "flat" ? cents : 0,
        pricing_model: pricingModel,
        pricing_tiers: pricingModel === "room_based" ? tiers : [],
      });
      setItems((prev) => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      setPrice("");
      setPricingModel("flat");
      setTiers(DEFAULT_TIERS);
    } finally {
      setSaving(false);
    }
  }

  function itemPriceLabel(item: PriceBookItem) {
    if (item.pricing_model === "room_based") {
      const count = item.pricing_tiers?.length ?? 0;
      return t("roomBasedTiers", { count });
    }
    return formatCents(item.unit_price_cents);
  }

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <div className="mb-6 flex flex-wrap justify-end gap-2">
        <a
          href="/price-book/import"
          className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-4 py-2 text-sm font-medium transition hover:border-[var(--brand-accent)]"
        >
          {tc("importCsv")}
        </a>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("addTitle")}</CardTitle>
          <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">{t("addDescription")}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
              <div className="form-field lg:col-span-2">
                <label className="form-label" htmlFor="pb-name">{tc("name")}</label>
                <Input
                  id="pb-name"
                  placeholder={t("namePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="pb-category">{tc("category")}</label>
                <Input id="pb-category" value={category} onChange={(e) => setCategory(e.target.value)} />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="pb-pricing-model">{t("pricingModel")}</label>
                <select
                  id="pb-pricing-model"
                  className="form-select w-full"
                  value={pricingModel}
                  onChange={(e) => onPricingModelChange(e.target.value as PricingModel)}
                >
                  <option value="flat">{t("pricingModelFlat")}</option>
                  <option value="room_based">{t("pricingModelRoomBased")}</option>
                </select>
              </div>
            </div>

            {pricingModel === "flat" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
                <div className="form-field">
                  <label className="form-label" htmlFor="pb-unit">{tc("unit")}</label>
                  <Input id="pb-unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="pb-price">{tc("priceUsd")}</label>
                  <Input
                    id="pb-price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="150.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-background-subtle)] p-4">
                <div className="mb-3">
                  <p className="text-sm font-medium text-[var(--brand-text-primary)]">{t("roomTiersTitle")}</p>
                  <p className="mt-1 text-xs text-[var(--brand-text-secondary)]">{t("roomTiersDescription")}</p>
                </div>
                <div className="space-y-2">
                  {tiers.map((tier, index) => (
                    <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                      <div className="form-field">
                        <label className="form-label">{t("beds")}</label>
                        <Input
                          type="number"
                          min="0"
                          value={tier.beds}
                          onChange={(e) => updateTier(index, "beds", parseInt(e.target.value, 10) || 0)}
                        />
                      </div>
                      <div className="form-field">
                        <label className="form-label">{t("baths")}</label>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          value={tier.baths}
                          onChange={(e) => updateTier(index, "baths", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="form-field">
                        <label className="form-label">{tc("priceUsd")}</label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={tier.price_cents / 100}
                          onChange={(e) =>
                            updateTier(index, "price_cents", Math.round(parseFloat(e.target.value) * 100) || 0)
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="sm:mb-0.5"
                        disabled={tiers.length <= 1}
                        onClick={() => setTiers((prev) => prev.filter((_, i) => i !== index))}
                      >
                        {tc("remove")}
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => setTiers((prev) => [...prev, emptyTier()])}
                >
                  {t("addTier")}
                </Button>
              </div>
            )}

            <Button type="submit" disabled={saving}>
              {saving ? tc("adding") : t("addItem")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8">
        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <IconFileText size={28} className="text-[var(--brand-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
            <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, i) => (
              <Card key={item.id} className="list-item-card stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-[var(--brand-text-secondary)]">
                      {item.category}
                      {item.pricing_model === "flat" && ` · ${tc("perUnit", { unit: item.unit })}`}
                    </div>
                    {item.pricing_model === "room_based" && item.pricing_tiers?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.pricing_tiers.map((tier, ti) => (
                          <span
                            key={ti}
                            className="rounded-md bg-[var(--brand-info-subtle)] px-2 py-0.5 text-xs text-[var(--brand-text-secondary)]"
                          >
                            {t("tierLabel", { beds: tier.beds, baths: tier.baths, price: formatCents(tier.price_cents) })}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={item.pricing_model === "room_based" ? "warning" : "default"}>
                      {item.pricing_model === "room_based" ? t("pricingModelRoomBased") : t("pricingModelFlat")}
                    </Badge>
                    <Badge>{itemPriceLabel(item)}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ModulePage>
  );
}
