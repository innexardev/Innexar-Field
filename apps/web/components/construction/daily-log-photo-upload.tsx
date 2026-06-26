"use client";

import { useRef } from "react";
import type { DailyLogPhoto } from "@fieldforge/sdk";

type DailyLogPhotoUploadProps = {
  photos: DailyLogPhoto[];
  uploading: boolean;
  onUpload: (file: File) => Promise<void>;
};

export function DailyLogPhotoUpload({ photos, uploading, onUpload }: DailyLogPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await onUpload(file);
    event.target.value = "";
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        capture="environment"
        className="sr-only"
        onChange={(e) => void handleFileChange(e)}
      />

      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm font-medium text-[var(--brand-text-primary)] transition-colors hover:bg-[var(--brand-surface-elevated)] disabled:opacity-50"
      >
        {uploading ? "Uploading…" : "Attach site photo"}
      </button>

      <p className="text-xs text-[var(--brand-text-muted)]">PNG, JPEG, or WebP · max 10 MB</p>

      {photos.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {photos.map((photo) => (
            <figure
              key={photo.id}
              className="overflow-hidden rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.caption || "Site photo"}
                className="h-28 w-full object-cover"
              />
              {photo.caption && (
                <figcaption className="truncate px-2 py-1 text-xs text-[var(--brand-text-secondary)]">
                  {photo.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
