import type { ComponentType, SVGProps } from "react";
import { IconSparkles, IconBuilding, IconWrench } from "@fieldforge/ui";

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

export type IndustryVertical = {
  slug: string;
  packId: string;
  name: string;
  headline: string;
  description: string;
  accent: string;
  Icon: IconComponent;
  highlights: string[];
  workflows: { title: string; description: string }[];
  modules: string[];
};

export const INDUSTRY_VERTICALS: IndustryVertical[] = [
  {
    slug: "cleaning",
    packId: "cleaning",
    name: "House Cleaning",
    headline: "Run recurring cleans without the chaos",
    description:
      "Purpose-built for residential and commercial cleaning companies — from solo operators to multi-crew operations across the US.",
    accent: "industry-cleaning",
    Icon: IconSparkles,
    highlights: [
      "Recurring schedule templates with automatic job generation",
      "Crew assignments with route-friendly daily views",
      "Client portal for bookings, reschedules, and payment",
      "Supply and checklist tracking per property",
    ],
    workflows: [
      {
        title: "Quote to recurring contract",
        description: "Send a professional estimate, collect e-signature, and convert to a recurring schedule in one flow.",
      },
      {
        title: "Daily crew dispatch",
        description: "Assign teams to properties, see drive-time windows, and push updates to the mobile PWA.",
      },
      {
        title: "Invoice and get paid",
        description: "Automated invoicing after each visit with Stripe payments and overdue reminders.",
      },
    ],
    modules: ["CRM", "Estimating", "Scheduling", "Cleaning pack", "Invoicing", "Client portal"],
  },
  {
    slug: "construction",
    packId: "construction",
    name: "Construction",
    headline: "Estimates, job costing, and change orders — built in",
    description:
      "For general contractors and specialty trades who need real margins on every project, not spreadsheet surprises.",
    accent: "industry-construction",
    Icon: IconBuilding,
    highlights: [
      "Detailed estimates with line items and markup controls",
      "Budget vs. actual job costing across labor and materials",
      "Change orders with client approval and audit trail",
      "Progress billing tied to project milestones",
    ],
    workflows: [
      {
        title: "Win the bid",
        description: "Build estimates from templates, add subs and materials, and send for e-signature.",
      },
      {
        title: "Track job costs",
        description: "Log labor hours, material receipts, and POs against the original budget in real time.",
      },
      {
        title: "Bill as you build",
        description: "Issue progress invoices aligned to completion percentages and retainage rules.",
      },
    ],
    modules: ["CRM", "Estimating", "Job costing", "Construction pack", "Expenses", "Invoicing"],
  },
  {
    slug: "field-services",
    packId: "field-services",
    name: "Field Services",
    headline: "Dispatch smarter. Fix faster. Invoice same day.",
    description:
      "For HVAC, plumbing, electrical, and other service trades that live in the truck — mobile-first from day one.",
    accent: "industry-field",
    Icon: IconWrench,
    highlights: [
      "Real-time dispatch board with technician availability",
      "Work orders with checklists, photos, and parts used",
      "Service agreements and preventive maintenance schedules",
      "Mobile PWA with offline support for low-signal job sites",
    ],
    workflows: [
      {
        title: "Intake to dispatch",
        description: "Capture the service request, assign the nearest qualified tech, and notify the customer automatically.",
      },
      {
        title: "Complete on site",
        description: "Technicians complete checklists, capture signatures, and log parts from the mobile app.",
      },
      {
        title: "Invoice from the field",
        description: "Generate and collect payment before leaving the job site with integrated card processing.",
      },
    ],
    modules: ["CRM", "Dispatch", "Work orders", "Scheduling", "Invoicing", "Mobile PWA"],
  },
];

export function getIndustryBySlug(slug: string): IndustryVertical | undefined {
  return INDUSTRY_VERTICALS.find((v) => v.slug === slug);
}
