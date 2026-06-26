"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardContent, Input } from "@fieldforge/ui";
import { MobileModulePage } from "@/components/mobile-module-page";
import { useAuth } from "@/lib/auth-context";
import { usePlatform } from "@fieldforge/platform";
import { enqueueTimeEntry, postOrEnqueue, type TimeQueueBody } from "@/lib/mobile/offline-queue";

type ClockState = "out" | "in";

export default function MobileTimePage() {
  const { token, client } = useAuth();
  const t = useTranslations("modules.mobileTime");
  const tc = useTranslations("modules.common");
  const { isOnline } = usePlatform();
  const router = useRouter();
  const [clockState, setClockState] = useState<ClockState>("out");
  const [jobId, setJobId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [queued, setQueued] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) router.replace("/login");
  }, [token, router]);

  async function submitClock(action: "clock_in" | "clock_out") {
    setSubmitting(true);
    setQueued(false);
    setError(null);

    const body: TimeQueueBody = {
      action,
      recorded_at: new Date().toISOString(),
    };
    if (jobId.trim()) body.job_id = jobId.trim();

    if (isOnline && typeof navigator !== "undefined" && navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, maximumAge: 60_000 });
        });
        body.latitude = position.coords.latitude;
        body.longitude = position.coords.longitude;
      } catch {
        // GPS optional — queue still works without coordinates
      }
    }

    try {
      if (isOnline) {
        try {
          await client.createTimeEntry(body);
          setClockState(action === "clock_in" ? "in" : "out");
        } catch (submitErr) {
          const message = submitErr instanceof Error ? submitErr.message : "Failed to record time";
          enqueueTimeEntry(body, "failed", message);
          setQueued(true);
          setError(message);
          setClockState(action === "clock_in" ? "in" : "out");
          return;
        }
      } else {
        const result = await postOrEnqueue({
          path: "/payroll/timesheets",
          body: body as unknown as Record<string, unknown>,
          label: action === "clock_in" ? "Clock in" : "Clock out",
          kind: "time",
          isOnline: false,
        });
        if (result.queued) {
          setQueued(true);
          setClockState(action === "clock_in" ? "in" : "out");
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MobileModulePage title={t("title")} subtitle={t("subtitle")}>
      <Card className="mobile-detail-card">
        <CardContent className="mobile-sync-status">
          <div className="mobile-sync-status__row">
            <span>Status</span>
            <Badge tone={clockState === "in" ? "success" : "default"}>
              {clockState === "in" ? "Clocked in" : "Not clocked in"}
            </Badge>
          </div>
          <div className="mobile-sync-status__row">
            <span>Connection</span>
            <Badge tone={isOnline ? "success" : "warning"}>{isOnline ? "Online" : "Offline"}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="mobile-detail-card">
        <CardContent>
          <label className="mobile-form__label" htmlFor="time-job">
            Job ID (optional)
          </label>
          <Input
            id="time-job"
            value={jobId}
            onChange={(event) => setJobId(event.target.value)}
            placeholder="Link clock event to job"
          />
        </CardContent>
      </Card>

      <div className="mobile-sync-actions">
        <Button disabled={submitting || clockState === "in"} onClick={() => void submitClock("clock_in")}>
          {submitting && clockState === "out" ? "Clocking in…" : isOnline ? "Clock in" : "Queue clock in"}
        </Button>
        <Button
          variant="secondary"
          disabled={submitting || clockState === "out"}
          onClick={() => void submitClock("clock_out")}
        >
          {submitting && clockState === "in" ? "Clocking out…" : isOnline ? "Clock out" : "Queue clock out"}
        </Button>
      </div>

      {queued && (
        <p className="mobile-queued-hint">
          Time entry queued — will sync when back online. Check <a href="/m/sync">Sync</a>.
        </p>
      )}
      {error && <p className="mobile-queue-item__error">{error}</p>}
    </MobileModulePage>
  );
}
