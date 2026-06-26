"use client";

import Link from "next/link";
import { Badge, Card, CardContent } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import type { PortalCustomerRoute } from "@/lib/portal-routes";

export function PortalStubPage({ route }: { route: PortalCustomerRoute }) {
  const Icon = route.icon;

  return (
    <ModulePage title={route.title} subtitle={route.description}>
      <div className="mb-4">
        <Link href="/portal" className="text-sm text-[var(--brand-accent)]">
          ← Back to portal hub
        </Link>
      </div>

      <Card>
        <CardContent className="py-10">
          <div className="empty-state">
            <div className="empty-state-icon">
              <Icon size={28} className="text-[var(--brand-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold">{route.title}</h3>
            <p className="mt-2 max-w-md text-sm text-[var(--brand-text-secondary)]">{route.hint}</p>
            <Badge tone="warning" className="mt-4">
              Coming soon
            </Badge>
          </div>
        </CardContent>
      </Card>
    </ModulePage>
  );
}
