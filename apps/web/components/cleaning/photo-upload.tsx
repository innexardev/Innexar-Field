"use client";

import { useRef } from "react";
import type { QcPhoto } from "@fieldforge/sdk";
import { Badge } from "@fieldforge/ui";

type PhotoUploadProps = {
  photos: QcPhoto[];
  uploading: boolean;
  onUpload: (file: File, kind: "before" | "after") => Promise<void>;
};

export function PhotoUpload({ photos, uploading, onUpload }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const kindRef = useRef<"before" | "after">("after");

  function openPicker(kind: "before" | "after") {
    kindRef.current = kind;
    inputRef.current?.click();
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await onUpload(file, kindRef.current);
    event.target.value = "";
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        capture="environment"
        className="sr-only"
        onChange={(e) => void handleFileChange(e)}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={uploading}
          onClick={() => openPicker("before")}
          className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm font-medium text-[var(--brand-text-primary)] transition-colors hover:bg-[var(--brand-surface-elevated)] disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Add before photo"}
        </button>
        <button
          type="button"
          disabled={uploading}
          onClick={() => openPicker("after")}
          className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm font-medium text-[var(--brand-text-primary)] transition-colors hover:bg-[var(--brand-surface-elevated)] disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Add after photo"}
        </button>
      </div>

      <p className="text-xs text-[var(--brand-text-muted)]">PNG, JPEG, or WebP · max 10 MB</p>

      {photos.length === 0 ? (
        <div className="mobile-photo-placeholder" role="img" aria-label="Photo upload placeholder">
          <span className="mobile-photo-placeholder__icon">📷</span>
          <p className="mobile-photo-placeholder__text">Add before &amp; after photos</p>
          <p className="mobile-photo-placeholder__hint">
            Document quality for review — photos are stored securely per job
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <figure
              key={photo.id}
              className="overflow-hidden rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.caption || `${photo.kind} photo`} className="h-36 w-full object-cover" />
              <figcaption className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                <Badge tone={photo.kind === "before" ? "default" : "success"}>{photo.kind}</Badge>
                <span className="truncate text-[var(--brand-text-secondary)]">
                  {photo.caption || "QC photo"}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
