"use client";

import { PortalStubPage } from "@/components/portal-stub-page";
import { PORTAL_CUSTOMER_ROUTES } from "@/lib/portal-routes";

const route = PORTAL_CUSTOMER_ROUTES.find((item) => item.slug === "profile")!;

export default function PortalProfilePage() {
  return <PortalStubPage route={route} />;
}
