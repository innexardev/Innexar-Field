"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { Timesheet } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, IconCalendar } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

const STATUS_TONES: Record<string, "default" | "warning" | "success"> = {
  draft: "default",
  open: "default",
  submitted: "warning",
  approved: "success",
};

export default function TimesheetsPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.timesheets");
  const tc = useTranslations("modules.common");
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    if (token) client.listTimesheets().then((r) => setTimesheets(r.data ?? [])).catch(console.error);
  }, [token, client]);

  function updateSheet(sheet: Timesheet) {
    setTimesheets((prev) => prev.map((t) => (t.id === sheet.id ? sheet : t)));
  }

  async function onSubmit(id: string) {
    setActingId(id);
    try {
      const sheet = await client.submitTimesheet(id);
      updateSheet(sheet);
    } finally {
      setActingId(null);
    }
  }

  async function onApprove(id: string) {
    setActingId(id);
    try {
      const sheet = await client.approveTimesheet(id);
      updateSheet(sheet);
    } finally {
      setActingId(null);
    }
  }

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      {timesheets.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <IconCalendar size={28} className="text-[var(--brand-text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
          <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {timesheets.map((sheet, i) => (
            <Card key={sheet.id} className="list-item-card stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div>
                  <div className="font-medium">{sheet.work_date}</div>
                  <div className="text-sm text-[var(--brand-text-secondary)]">
                    {sheet.hours} hrs
                    {sheet.job_id ? ` · Job ${sheet.job_id.slice(0, 8)}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={STATUS_TONES[sheet.status] ?? "default"}>{sheet.status}</Badge>
                  {(sheet.status === "draft" || sheet.status === "open") && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={actingId === sheet.id}
                      onClick={() => onSubmit(sheet.id)}
                    >
                      {actingId === sheet.id ? "Submitting…" : "Submit"}
                    </Button>
                  )}
                  {sheet.status === "submitted" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={actingId === sheet.id}
                      onClick={() => onApprove(sheet.id)}
                    >
                      {actingId === sheet.id ? "Approving…" : "Approve"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ModulePage>
  );
}
