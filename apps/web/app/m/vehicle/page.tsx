"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { VehicleCheck } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, Input } from "@fieldforge/ui";
import { MobileModulePage } from "@/components/mobile-module-page";
import { useAuth } from "@/lib/auth-context";
import { usePlatform } from "@fieldforge/platform";
import { enqueueVehicleCheck, postOrEnqueue } from "@/lib/mobile/offline-queue";

const FUEL_LEVELS = ["full", "three_quarters", "half", "quarter", "low", "empty"] as const;

export default function MobileVehiclePage() {
  const { token, client } = useAuth();
  const t = useTranslations("modules.mobileVehicle");
  const { isOnline } = usePlatform();
  const router = useRouter();
  const [vehicleLabel, setVehicleLabel] = useState("");
  const [odometer, setOdometer] = useState("");
  const [fuelLevel, setFuelLevel] = useState<(typeof FUEL_LEVELS)[number]>("full");
  const [tiresOk, setTiresOk] = useState(true);
  const [lightsOk, setLightsOk] = useState(true);
  const [damageNotes, setDamageNotes] = useState("");
  const [jobId, setJobId] = useState("");
  const [recent, setRecent] = useState<VehicleCheck[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [queued, setQueued] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) router.replace("/login");
  }, [token, router]);

  useEffect(() => {
    if (!token || !isOnline) return;
    client
      .listVehicleChecks()
      .then((res) => setRecent(res.data ?? []))
      .catch(() => setRecent([]));
  }, [token, client, isOnline]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const miles = parseInt(odometer, 10);
    if (!vehicleLabel.trim() || Number.isNaN(miles) || miles < 0) return;

    setSubmitting(true);
    setQueued(false);
    setError(null);

    const body = {
      vehicle_label: vehicleLabel.trim(),
      odometer_miles: miles,
      fuel_level: fuelLevel,
      tires_ok: tiresOk,
      lights_ok: lightsOk,
      damage_notes: damageNotes.trim(),
      ...(jobId.trim() ? { job_id: jobId.trim() } : {}),
    };

    try {
      if (isOnline) {
        try {
          const saved = await client.createVehicleCheck(body);
          setRecent((prev) => [saved, ...prev].slice(0, 20));
        } catch (submitErr) {
          const message = submitErr instanceof Error ? submitErr.message : "Failed to save vehicle check";
          enqueueVehicleCheck(body, "failed", message);
          setQueued(true);
          setError(message);
          return;
        }
      } else {
        const result = await postOrEnqueue({
          path: "/scheduling/vehicle-checks",
          body,
          label: `Vehicle: ${body.vehicle_label}`,
          kind: "vehicle",
          isOnline: false,
        });
        if (result.queued) setQueued(true);
      }

      setVehicleLabel("");
      setOdometer("");
      setFuelLevel("full");
      setTiresOk(true);
      setLightsOk(true);
      setDamageNotes("");
      setJobId("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MobileModulePage title={t("title")} subtitle={t("subtitle")}>
      <Card className="mobile-detail-card">
        <CardContent>
          <form onSubmit={(event) => void onSubmit(event)} className="mobile-form">
            <label className="mobile-form__label" htmlFor="vehicle-label">
              Vehicle
            </label>
            <Input
              id="vehicle-label"
              value={vehicleLabel}
              onChange={(event) => setVehicleLabel(event.target.value)}
              placeholder="Van 12 · plate or fleet ID"
              required
            />

            <label className="mobile-form__label" htmlFor="vehicle-odometer">
              Odometer (miles)
            </label>
            <Input
              id="vehicle-odometer"
              type="number"
              min="0"
              step="1"
              value={odometer}
              onChange={(event) => setOdometer(event.target.value)}
              placeholder="45210"
              required
            />

            <label className="mobile-form__label" htmlFor="vehicle-fuel">
              Fuel level
            </label>
            <select
              id="vehicle-fuel"
              className="mobile-select"
              value={fuelLevel}
              onChange={(event) => setFuelLevel(event.target.value as (typeof FUEL_LEVELS)[number])}
            >
              {FUEL_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level.replace("_", " ")}
                </option>
              ))}
            </select>

            <label className="mobile-form__checkbox">
              <input type="checkbox" checked={tiresOk} onChange={(event) => setTiresOk(event.target.checked)} />
              Tires OK
            </label>
            <label className="mobile-form__checkbox">
              <input type="checkbox" checked={lightsOk} onChange={(event) => setLightsOk(event.target.checked)} />
              Lights OK
            </label>

            <label className="mobile-form__label" htmlFor="vehicle-damage">
              Damage / notes
            </label>
            <textarea
              id="vehicle-damage"
              className="mobile-textarea"
              rows={3}
              value={damageNotes}
              onChange={(event) => setDamageNotes(event.target.value)}
              placeholder="Scratches, dents, issues…"
            />

            <label className="mobile-form__label" htmlFor="vehicle-job">
              Job ID (optional)
            </label>
            <Input
              id="vehicle-job"
              value={jobId}
              onChange={(event) => setJobId(event.target.value)}
              placeholder="Link to today's job"
            />

            <div className="mobile-sync-status__row">
              <span>Connection</span>
              <Badge tone={isOnline ? "success" : "warning"}>{isOnline ? "Online" : "Offline"}</Badge>
            </div>

            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : isOnline ? "Submit vehicle check" : "Queue vehicle check"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {queued && (
        <p className="mobile-queued-hint">
          Vehicle check queued — will sync when back online. Check <a href="/m/sync">Sync</a>.
        </p>
      )}
      {error && <p className="mobile-queue-item__error">{error}</p>}

      {recent.length > 0 && (
        <>
          <p className="mobile-section-title">Recent checks</p>
          <Card className="mobile-detail-card">
            <CardContent className="mobile-sync-status">
              {recent.map((item) => (
                <div key={item.id} className="mobile-sync-status__row">
                  <span>
                    {item.vehicle_label} · {item.odometer_miles.toLocaleString()} mi
                  </span>
                  <span className="mobile-sync-status__value">
                    {new Date(item.checked_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </MobileModulePage>
  );
}
