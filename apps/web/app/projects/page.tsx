"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Project, ChangeOrder } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, IconBuilding } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage, formatCents } from "@/lib/use-app-page";

export default function ProjectsPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.projects");
  const tc = useTranslations("modules.common");
  const [projects, setProjects] = useState<Project[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");

  useEffect(() => {
    if (!token) return;
    client.listProjects().then((r) => setProjects(r.data ?? [])).catch(console.error);
    client.listChangeOrders().then((r) => setChangeOrders(r.data ?? [])).catch(console.error);
  }, [token, client]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p = await client.createProject({ name, budget_cents: Math.round(parseFloat(budget || "0") * 100) });
    setProjects((prev) => [p, ...prev]);
    setName("");
    setBudget("");
  }

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <Card>
        <CardHeader><CardTitle>New project</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[1fr_140px_auto] sm:items-end">
            <div className="form-field">
              <label className="form-label">Project name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Kitchen remodel — Oak St" required />
            </div>
            <div className="form-field">
              <label className="form-label">Budget ($)</label>
              <Input type="number" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} />
            </div>
            <Button type="submit">Create</Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--brand-text-muted)]">Projects</h2>
          <div className="space-y-3">
            {projects.length === 0 ? (
              <div className="empty-state py-10">
                <div className="empty-state-icon"><IconBuilding size={28} className="text-[var(--brand-text-muted)]" /></div>
                <p className="text-sm">No projects yet</p>
              </div>
            ) : (
              projects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <Card className="list-item-card transition hover:border-[var(--brand-accent)]">
                    <CardContent className="flex justify-between py-4">
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-sm text-[var(--brand-text-secondary)]">{formatCents(p.budget_cents)}</div>
                      </div>
                      <Badge>{p.status}</Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--brand-text-muted)]">Change orders</h2>
          <div className="space-y-3">
            {changeOrders.length === 0 ? (
              <p className="text-sm text-[var(--brand-text-muted)]">No change orders</p>
            ) : (
              changeOrders.map((co) => (
                <Card key={co.id} className="list-item-card">
                  <CardContent className="flex justify-between py-4">
                    <div>
                      <div className="font-medium">{co.title}</div>
                      <div className="text-sm text-[var(--brand-text-secondary)]">{formatCents(co.amount_cents)}</div>
                    </div>
                    <Badge tone={co.status === "approved" ? "success" : "default"}>{co.status}</Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>
      </div>
    </ModulePage>
  );
}
