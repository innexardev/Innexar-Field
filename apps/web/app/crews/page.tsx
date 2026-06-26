"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { Crew } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, IconUsers } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

export default function CrewsPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.crews");
  const tc = useTranslations("modules.common");
  const [crews, setCrews] = useState<Crew[]>([]);
  const [name, setName] = useState("");
  const [leadName, setLeadName] = useState("");
  const [memberCount, setMemberCount] = useState("3");
  const [skills, setSkills] = useState("");

  useEffect(() => {
    if (token) client.listCrews().then((r) => setCrews(r.data ?? [])).catch(console.error);
  }, [token, client]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const crew = await client.createCrew({
      name,
      lead_name: leadName || undefined,
      member_count: Number(memberCount) || 1,
      skills: skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
    setCrews((prev) => [...prev, crew].sort((a, b) => a.name.localeCompare(b.name)));
    setName("");
    setLeadName("");
    setMemberCount("3");
    setSkills("");
  }

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <Card>
        <CardHeader>
          <CardTitle>Add crew</CardTitle>
          <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">
            Define teams for dispatch, routes, and recurring service assignments.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <div className="form-field">
              <label className="form-label" htmlFor="crew-name">Name</label>
              <Input id="crew-name" placeholder="Alpha Team" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="crew-lead">Lead</label>
              <Input id="crew-lead" placeholder="Jordan Lee" value={leadName} onChange={(e) => setLeadName(e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="crew-size">Members</label>
              <Input id="crew-size" type="number" min={1} value={memberCount} onChange={(e) => setMemberCount(e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="crew-skills">Skills</label>
              <Input id="crew-skills" placeholder="cleaning, HVAC" value={skills} onChange={(e) => setSkills(e.target.value)} />
            </div>
            <Button type="submit" className="lg:col-span-4 lg:w-fit">Create crew</Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 space-y-3">
        {crews.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <IconUsers size={28} className="text-[var(--brand-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
            <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
          </div>
        ) : (
          crews.map((crew, i) => (
            <Card key={crew.id} className="list-item-card stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-info-subtle)] text-sm font-semibold text-[var(--brand-accent)]">
                    {crew.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium text-[var(--brand-text-primary)]">{crew.name}</div>
                    {crew.lead_name && (
                      <div className="text-sm text-[var(--brand-text-secondary)]">Lead: {crew.lead_name}</div>
                    )}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {crew.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-md bg-[var(--brand-surface-elevated)] px-2 py-0.5 text-xs text-[var(--brand-text-muted)]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <span className="text-sm text-[var(--brand-text-muted)]">
                    {crew.member_count} member{crew.member_count !== 1 ? "s" : ""}
                  </span>
                  <Badge tone={crew.status === "active" ? "success" : "default"}>{crew.status.replace(/_/g, " ")}</Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </ModulePage>
  );
}
