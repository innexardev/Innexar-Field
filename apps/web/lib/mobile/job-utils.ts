import type { Job } from "@fieldforge/sdk";

export function isToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function filterTodaysJobs(jobs: Job[]): Job[] {
  return jobs.filter((j) => j.status !== "completed" && isToday(j.scheduled_at));
}

export function formatJobTime(dateStr?: string): string {
  if (!dateStr) return "Unscheduled";
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function statusBadgeTone(status: string): "default" | "success" | "warning" {
  switch (status) {
    case "completed":
      return "success";
    case "in_progress":
    case "scheduled":
      return "default";
    default:
      return "warning";
  }
}

export function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
