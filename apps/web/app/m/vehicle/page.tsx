"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge, Card, CardContent } from "@fieldforge/ui";
import { MobileModulePage } from "@/components/mobile-module-page";
import { useAuth } from "@/lib/auth-context";

export default function MobileVehiclePage() {
  const { token } = useAuth();
  const t = useTranslations("modules.mobileVehicle");
  const tc = useTranslations("modules.common");
  const router = useRouter();

  useEffect(() => {
    if (!token) router.replace("/login");
  }, [token, router]);

  return (
    <MobileModulePage title={t("title")} subtitle={t("subtitle")}>
      <Card className="mobile-detail-card">
        <CardContent className="mobile-sync-status">
          <div className="mobile-sync-status__row">
            <span>Vehicle</span>
            <span className="mobile-sync-status__value">Not assigned</span>
          </div>
          <div className="mobile-sync-status__row">
            <span>Today's mileage</span>
            <span className="mobile-sync-status__value">0 mi</span>
          </div>
          <div className="mobile-sync-status__row">
            <span>Sync</span>
            <Badge tone="warning">Queue stub</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="mobile-empty">
        <p className="mobile-empty__title">No vehicle logs</p>
        <p className="mobile-empty__text">Fleet mileage tracking with offline sync coming soon.</p>
      </div>
    </MobileModulePage>
  );
}
