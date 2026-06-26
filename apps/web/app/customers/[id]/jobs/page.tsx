"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Customer, Job } from "@fieldforge/sdk";
import { Badge, Card, CardContent, IconCalendar } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

export default function CustomerJobsPage() {
  const params = useParams<{ id: string }>();
  const { client, token } = useAppPage();
  const t = useTranslations("modules.customerJobs");
  const tc = useTranslations("modules.common");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !params.id) return;
    const id = params.id;
    Promise.all([client.getCustomer(id), client.listJobs()])
      .then(([c, jobsRes]) => {
        setCustomer(c);
        setJobs(jobsRes.data.filter((j) => j.customer_id === id));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, client, params.id]);

  if (loading) {
    return (
      <ModulePage title={tc("job")} subtitle={tc("loadingServiceHistory")}>
        <p className="text-sm text-[var(--brand-text-muted)]">{tc("loading")}</p>
      </ModulePage>
    );
  }

  if (!customer) {
    return (
      <ModulePage title={tc("job")} subtitle={tc("customerNotFound")}>
        <Link href="/customers" className="text-sm text-[var(--brand-accent)] hover:underline">
          {tc("backToCustomers")}
        </Link>
      </ModulePage>
    );
  }

  return (
    <ModulePage title={tc("titleWithSuffix", { name: customer.name, suffix: t("suffix") })} subtitle={t("subtitle")}>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link href={`/customers/${customer.id}`} className="text-sm text-[var(--brand-accent)] hover:underline">
          {tc("customerProfile")}
        </Link>
        <Link
          href="/jobs"
          className="inline-flex items-center rounded-lg bg-[var(--brand-accent)] px-3 py-1.5 text-xs font-medium text-[var(--brand-accent-foreground)]"
        >
          Schedule job
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <IconCalendar size={28} className="text-[var(--brand-text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold">No jobs yet</h3>
          <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">
            Schedule field work for this customer or convert an accepted estimate.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job, i) => (
            <Card key={job.id} className="list-item-card stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div>
                  <div className="font-medium">{job.title}</div>
                  {job.scheduled_at && (
                    <div className="text-sm text-[var(--brand-text-secondary)]">
                      {new Date(job.scheduled_at).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </div>
                  )}
                </div>
                <Badge tone={job.status === "completed" ? "success" : "default"}>{job.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ModulePage>
  );
}
