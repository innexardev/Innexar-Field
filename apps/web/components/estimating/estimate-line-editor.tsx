"use client";

import { useTranslations } from "next-intl";
import type { PriceBookItem } from "@fieldforge/sdk";
import { Button, Input } from "@fieldforge/ui";
import { MoneyInput } from "@/components/money-input";
import { QuantityInput } from "@/components/quantity-input";
import { formatCents } from "@/lib/use-app-page";

export interface DraftLine {
  description: string;
  quantity: number;
  unit_price_cents: number;
}

interface EstimateLineEditorProps {
  lines: DraftLine[];
  onChange: (lines: DraftLine[]) => void;
  priceBook?: PriceBookItem[];
  readOnly?: boolean;
}

function lineTotal(line: DraftLine) {
  return Math.round(line.quantity * line.unit_price_cents);
}

export function EstimateLineEditor({ lines, onChange, priceBook = [], readOnly }: EstimateLineEditorProps) {
  const t = useTranslations("modules.estimates");
  const tc = useTranslations("modules.common");

  function updateLine(index: number, patch: Partial<DraftLine>) {
    const next = lines.map((line, i) => (i === index ? { ...line, ...patch } : line));
    onChange(next);
  }

  function removeLine(index: number) {
    onChange(lines.filter((_, i) => i !== index));
  }

  function addLine() {
    onChange([...lines, { description: "", quantity: 1, unit_price_cents: 0 }]);
  }

  function addFromPriceBook(item: PriceBookItem) {
    onChange([
      ...lines,
      {
        description: item.name,
        quantity: 1,
        unit_price_cents: item.unit_price_cents,
      },
    ]);
  }

  const subtotal = lines.reduce((sum, line) => sum + lineTotal(line), 0);

  return (
    <div className="space-y-4">
      {!readOnly && priceBook.length > 0 && (
        <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] p-4">
          <p className="mb-3 text-sm font-medium text-[var(--brand-text-primary)]">{tc("addFromPriceBook")}</p>
          <div className="flex flex-wrap gap-2">
            {priceBook.slice(0, 8).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => addFromPriceBook(item)}
                className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-1.5 text-xs font-medium transition hover:border-[var(--brand-accent)]"
              >
                {item.name} · {formatCents(item.unit_price_cents)}/{item.unit}
              </button>
            ))}
          </div>
        </div>
      )}

      {lines.length === 0 ? (
        <p className="text-sm text-[var(--brand-text-secondary)]">{tc("noLineItemsYet")}</p>
      ) : (
        <div className="space-y-3">
          {lines.map((line, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-lg border border-[var(--brand-border)] p-4 sm:grid-cols-[1fr_112px_128px_auto_auto]"
            >
              {readOnly ? (
                <>
                  <div className="text-sm font-medium">{line.description}</div>
                  <div className="text-sm text-[var(--brand-text-secondary)]">× {line.quantity}</div>
                  <div className="text-sm text-[var(--brand-text-secondary)]">{formatCents(line.unit_price_cents)}</div>
                  <div className="text-sm font-medium sm:col-span-2 sm:text-right">{formatCents(lineTotal(line))}</div>
                </>
              ) : (
                <>
                  <div className="form-field sm:col-span-1">
                    <label className="form-label">{tc("description")}</label>
                    <Input
                      value={line.description}
                      onChange={(e) => updateLine(index, { description: e.target.value })}
                      placeholder={t("descriptionPlaceholder")}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">{tc("qty")}</label>
                    <QuantityInput
                      quantity={line.quantity}
                      onChangeQuantity={(quantity) => updateLine(index, { quantity })}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">{tc("unitUsd")}</label>
                    <MoneyInput
                      cents={line.unit_price_cents}
                      onChangeCents={(unit_price_cents) => updateLine(index, { unit_price_cents })}
                    />
                  </div>
                  <div className="flex items-end text-sm font-medium">{formatCents(lineTotal(line))}</div>
                  <div className="flex items-end">
                    <Button type="button" variant="secondary" onClick={() => removeLine(index)}>
                      {tc("remove")}
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <Button type="button" variant="secondary" onClick={addLine}>
          {tc("addLineItem")}
        </Button>
      )}

      <div className="flex justify-end border-t border-[var(--brand-border)] pt-3 text-sm font-semibold">
        {tc("subtotal")}: {formatCents(subtotal)}
      </div>
    </div>
  );
}
