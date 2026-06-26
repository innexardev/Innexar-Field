"use client";

import { PortalStubPage } from "@/components/portal-stub-page";
import { PORTAL_CUSTOMER_ROUTES } from "@/lib/portal-routes";

const route = PORTAL_CUSTOMER_ROUTES.find((item) => item.slug === "login")!;

export default function PortalLoginPage() {
  return <PortalStubPage route={route} />;
}
