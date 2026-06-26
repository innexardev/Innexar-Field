"use client";

import { PortalStubPage } from "@/components/portal-stub-page";
import { PORTAL_CUSTOMER_ROUTES } from "@/lib/portal-routes";

const route = PORTAL_CUSTOMER_ROUTES.find((item) => item.slug === "payments")!;

export default function PortalPaymentsPage() {
  return <PortalStubPage route={route} />;
}
