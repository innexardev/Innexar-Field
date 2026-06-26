"use client";

import { useEffect, useState } from "react";
import type { IndustryPack } from "@fieldforge/sdk";
import { IconBuilding, IconCheck, IconSparkles, IconWrench } from "@fieldforge/ui";
import type { ComponentType, SVGProps } from "react";

type PackIconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

const PACK_ICONS: Record<string, PackIconComponent> = {
  cleaning: IconSparkles,
  construction: IconBuilding,
  "field-services": IconWrench,
};

const FALLBACK_PACKS: IndustryPack[] = [
  {
    id: "cleaning",
    name: "House Cleaning",
    description: "Recurring cleans, crews, and client portal",
    modules: ["crm", "estimating", "scheduling", "invoicing", "cleaning"],
  },
  {
    id: "construction",
    name: "Construction",
    description: "Estimates, job costing, change orders",
    modules: ["crm", "estimating", "scheduling", "invoicing", "construction", "job-costing"],
  },
  {
    id: "field-services",
    name: "Field Services",
    description: "Dispatch, work orders, and mobile PWA",
    modules: ["crm", "estimating", "scheduling", "invoicing", "dispatch", "accounting"],
  },
];

function PackIcon({ packId }: { packId: string }) {
  const Icon = PACK_ICONS[packId] ?? IconWrench;
  return (
    <span className="pack-card__icon">
      <Icon size={16} />
    </span>
  );
}

export function IndustryPackPicker({
  value,
  onChange,
  apiBase,
}: {
  value: string;
  onChange: (id: string) => void;
  apiBase: string;
}) {
  const [packs, setPacks] = useState<IndustryPack[]>(FALLBACK_PACKS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/industry-packs`);
        if (!res.ok) throw new Error("fetch failed");
        const body = (await res.json()) as { data: IndustryPack[] };
        if (!cancelled && body.data?.length) setPacks(body.data);
      } catch {
        /* keep fallback */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  return (
    <fieldset className="form-section__fieldset">
      <legend className="form-section__legend">Industry</legend>
      <div
        className="grid gap-2 sm:grid-cols-3"
        role="radiogroup"
        aria-label="Industry pack"
        aria-busy={loading}
      >
        {packs.map((pack, index) => {
          const selected = value === pack.id;
          return (
            <button
              key={pack.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(pack.id)}
              className={`pack-card stagger-item ${selected ? "pack-card--selected" : ""}`}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="pack-card__header">
                <PackIcon packId={pack.id} />
                {selected && (
                  <span className="pack-card__check" aria-hidden>
                    <IconCheck size={12} strokeWidth={2.5} />
                  </span>
                )}
              </div>
              <span className="pack-card__name">{pack.name}</span>
              <span className="pack-card__desc">{pack.description}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
