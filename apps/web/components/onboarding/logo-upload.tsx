"use client";

import { useRef } from "react";
import { Button, Input } from "@fieldforge/ui";

type LogoUploadProps = {
  logoUrl: string;
  uploading: boolean;
  onLogoUrlChange: (url: string) => void;
  onUpload: (file: File) => Promise<void>;
};

export function LogoUpload({ logoUrl, uploading, onLogoUrlChange, onUpload }: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await onUpload(file);
    event.target.value = "";
  }

  return (
    <div className="form-field">
      <label className="form-label" htmlFor="logo-upload">
        Company logo <span className="text-[var(--brand-text-muted)]">(optional)</span>
      </label>

      <input
        ref={inputRef}
        id="logo-upload"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(e) => void handleFileChange(e)}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        {logoUrl ? (
          <figure className="shrink-0 overflow-hidden rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt="Company logo preview"
              className="h-20 w-20 object-contain p-2"
            />
          </figure>
        ) : (
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] text-xs text-[var(--brand-text-muted)]"
            aria-hidden
          >
            No logo
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? "Uploading…" : logoUrl ? "Replace logo" : "Upload logo"}
          </Button>
          <p className="form-hint">PNG, JPEG, or WebP · max 2 MB</p>
        </div>
      </div>

      <div className="mt-3">
        <label className="form-label text-sm" htmlFor="logo-url">
          Or paste a logo URL
        </label>
        <Input
          id="logo-url"
          type="url"
          placeholder="https://yoursite.com/logo.png"
          value={logoUrl}
          onChange={(e) => onLogoUrlChange(e.target.value)}
        />
      </div>
    </div>
  );
}
