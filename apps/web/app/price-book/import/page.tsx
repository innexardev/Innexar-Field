"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import type { PriceBookImportResult } from "@fieldforge/sdk";
import { Button, Card, CardContent, CardHeader, CardTitle, IconFileText } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

export default function PriceBookImportPage() {
  const { client } = useAppPage();
  const t = useTranslations("modules.priceBookImport");
  const tc = useTranslations("modules.common");
  const [fileName, setFileName] = useState("");
  const [csvContent, setCsvContent] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<PriceBookImportResult | null>(null);
  const [error, setError] = useState("");

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      setCsvContent(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsText(file);
  }

  async function onImport() {
    if (!csvContent.trim()) {
      setError("Select a CSV file first.");
      return;
    }
    setImporting(true);
    setError("");
    try {
      const res = await client.importPriceBookCSV(csvContent);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <ModulePage
      title={t("title")}
      subtitle={t("subtitle")}
    >
      <Link href="/price-book" className="mb-6 inline-block text-sm text-[var(--brand-accent)] hover:underline">
        {tc("backToPriceBook")}
      </Link>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-info-subtle)] text-[var(--brand-accent)]">
                <IconFileText size={22} />
              </div>
            </div>
            <CardTitle className="mt-3">Upload CSV</CardTitle>
            <p className="text-sm text-[var(--brand-text-secondary)]">
              Expected columns: name, category, unit, unit_price. Prices are in USD (e.g. 150.00 or 0.15).
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="form-field">
              <label className="form-label" htmlFor="csv-file">
                CSV file
              </label>
              <input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                onChange={onFileSelect}
                className="block w-full text-sm text-[var(--brand-text-secondary)] file:mr-4 file:rounded-lg file:border file:border-[var(--brand-border)] file:bg-[var(--brand-surface-elevated)] file:px-4 file:py-2 file:text-sm file:font-medium"
              />
              {fileName && (
                <p className="form-hint mt-2">
                  Selected: <span className="font-medium">{fileName}</span>
                </p>
              )}
            </div>
            {error && <p className="form-error">{error}</p>}
            <Button onClick={() => void onImport()} disabled={importing || !csvContent}>
              {importing ? "Importing…" : "Import price book"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import result</CardTitle>
          </CardHeader>
          <CardContent>
            {!result ? (
              <p className="text-sm text-[var(--brand-text-secondary)]">
                Upload a CSV to import items into your price book.
              </p>
            ) : (
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-[var(--brand-text-muted)]">Status</dt>
                  <dd className="font-medium capitalize">{result.status}</dd>
                </div>
                <div>
                  <dt className="text-[var(--brand-text-muted)]">Message</dt>
                  <dd>{result.message}</dd>
                </div>
                <div className="flex gap-6">
                  <div>
                    <dt className="text-[var(--brand-text-muted)]">Accepted rows</dt>
                    <dd className="text-lg font-semibold">{result.accepted_rows}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--brand-text-muted)]">Skipped rows</dt>
                    <dd className="text-lg font-semibold">{result.skipped_rows}</dd>
                  </div>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Sample format</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] p-4 text-xs">
{`name,category,unit,unit_price
Deep clean — standard,service,sqft,0.15
Move-out clean,service,sqft,0.22
Supplies,material,each,25.00`}
          </pre>
        </CardContent>
      </Card>
    </ModulePage>
  );
}
