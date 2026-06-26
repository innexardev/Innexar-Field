"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { TakeoffMeasurement, TakeoffRoom } from "@fieldforge/sdk";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  IconFileText,
} from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

const CLEANING_ROOM_PRESETS = [
  "Living room",
  "Kitchen",
  "Bathroom",
  "Bedroom",
  "Hallway",
  "Office",
];

export default function TakeoffPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.takeoff");
  const tc = useTranslations("modules.common");
  const [measurements, setMeasurements] = useState<TakeoffMeasurement[]>([]);
  const [label, setLabel] = useState("");
  const [rooms, setRooms] = useState<TakeoffRoom[]>([
    { name: "Living room", sqft: 0 },
    { name: "Kitchen", sqft: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (token) client.listTakeoffMeasurements().then((r) => setMeasurements(r.data ?? [])).catch(console.error);
  }, [token, client]);

  const totalSqft = rooms.reduce((sum, r) => sum + (r.sqft || 0), 0);

  function updateRoom(index: number, patch: Partial<TakeoffRoom>) {
    setRooms((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addRoom() {
    const unused = CLEANING_ROOM_PRESETS.find((name) => !rooms.some((r) => r.name === name));
    setRooms((prev) => [...prev, { name: unused ?? "Room", sqft: 0 }]);
  }

  function removeRoom(index: number) {
    setRooms((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSave() {
    if (!label.trim()) return;
    setSaving(true);
    try {
      const saved = await client.createTakeoffMeasurement({
        label: label.trim(),
        rooms: rooms.filter((r) => r.sqft > 0),
      });
      setMeasurements((prev) => [saved, ...prev]);
      setLabel("");
      setRooms([
        { name: "Living room", sqft: 0 },
        { name: "Kitchen", sqft: 0 },
      ]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <CardTitle>{t("newMeasurement")}</CardTitle>
              <Badge tone="warning">{tc("cleaning")}</Badge>
            </div>
            <p className="text-sm text-[var(--brand-text-secondary)]">{t("newDescription")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="form-field">
              <label className="form-label" htmlFor="takeoff-label">{t("propertyLabel")}</label>
              <Input
                id="takeoff-label"
                placeholder={t("propertyPlaceholder")}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">{tc("rooms")}</p>
              {rooms.map((room, index) => (
                <div key={index} className="grid grid-cols-[1fr_100px_auto] gap-2">
                  <Input
                    value={room.name}
                    onChange={(e) => updateRoom(index, { name: e.target.value })}
                    aria-label={t("roomNameAria", { index: index + 1 })}
                  />
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder={tc("sqft")}
                    value={room.sqft || ""}
                    onChange={(e) => updateRoom(index, { sqft: parseFloat(e.target.value) || 0 })}
                    aria-label={t("roomSqftAria", { index: index + 1 })}
                  />
                  <Button type="button" variant="secondary" onClick={() => removeRoom(index)}>
                    {tc("remove")}
                  </Button>
                </div>
              ))}
              <Button type="button" variant="secondary" onClick={addRoom}>
                {tc("addRoom")}
              </Button>
            </div>

            <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] p-4 text-sm">
              <div className="flex justify-between font-semibold">
                <span>{tc("totalSqft")}</span>
                <span>{totalSqft.toLocaleString()} {tc("sqFt")}</span>
              </div>
              <p className="mt-2 text-xs text-[var(--brand-text-muted)]">{t("floorPlanNote")}</p>
            </div>

            <Button onClick={() => void onSave()} disabled={saving || !label.trim() || totalSqft <= 0}>
              {saving ? tc("saving") : t("saveMeasurement")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("savedMeasurements")}</CardTitle>
          </CardHeader>
          <CardContent>
            {measurements.length === 0 ? (
              <div className="empty-state py-10">
                <div className="empty-state-icon">
                  <IconFileText size={24} className="text-[var(--brand-text-muted)]" />
                </div>
                <p className="text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {measurements.map((m) => (
                  <li key={m.id} className="rounded-lg border border-[var(--brand-border)] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{m.label}</span>
                      <Badge>{m.total_sqft.toLocaleString()} {tc("sqFt")}</Badge>
                    </div>
                    {m.rooms.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs text-[var(--brand-text-secondary)]">
                        {m.rooms.map((r, i) => (
                          <li key={i}>{t("roomLine", { name: r.name, sqft: r.sqft })}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </ModulePage>
  );
}
