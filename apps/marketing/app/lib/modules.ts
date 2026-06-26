import type { ComponentType, SVGProps } from "react";
import {
  IconUsers,
  IconFileText,
  IconCalendar,
  IconCreditCard,
  IconChart,
  IconShield,
  IconTruck,
  IconReceipt,
  IconSparkles,
  IconBuilding,
  IconWrench,
  IconLayoutDashboard,
} from "@fieldforge/ui";

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

export type ModuleFeature = {
  Icon: IconComponent;
  title: string;
  description: string;
};

export type ModuleGroup = {
  name: string;
  description: string;
  modules: ModuleFeature[];
};

export const MODULE_GROUPS: ModuleGroup[] = [
  {
    name: "Core Platform",
    description: "Foundation for every field service business — secure, multitenant, and US-ready.",
    modules: [
      {
        Icon: IconLayoutDashboard,
        title: "Dashboard & Analytics",
        description: "Real-time KPIs across jobs, revenue, and crew utilization from a single command center.",
      },
      {
        Icon: IconShield,
        title: "Security & Compliance",
        description: "PostgreSQL row-level security, RBAC, audit logs, and tenant isolation by default.",
      },
    ],
  },
  {
    name: "Sales & CRM",
    description: "Win more work and keep customers coming back.",
    modules: [
      {
        Icon: IconUsers,
        title: "CRM & Customers",
        description: "Leads, properties, contact history, and a branded client portal for self-service.",
      },
      {
        Icon: IconFileText,
        title: "Estimating & Quotes",
        description: "Professional quotes with line items, templates, e-signature, and version tracking.",
      },
    ],
  },
  {
    name: "Operations",
    description: "Schedule crews, dispatch jobs, and run the field from anywhere.",
    modules: [
      {
        Icon: IconCalendar,
        title: "Scheduling",
        description: "Recurring jobs, crew calendars, conflict detection, and automated reminders.",
      },
      {
        Icon: IconTruck,
        title: "Dispatch",
        description: "Assign technicians, optimize routes, and track job status in real time.",
      },
      {
        Icon: IconWrench,
        title: "Work Orders",
        description: "Mobile-first PWA for field teams — checklists, photos, and offline-ready workflows.",
      },
    ],
  },
  {
    name: "Finance",
    description: "Protect margins from estimate to final payment.",
    modules: [
      {
        Icon: IconChart,
        title: "Job Costing",
        description: "Budget vs. actual on labor, materials, and subs — know your margins on every job.",
      },
      {
        Icon: IconReceipt,
        title: "Expenses & POs",
        description: "Track receipts, purchase orders, and vendor bills tied directly to jobs.",
      },
      {
        Icon: IconCreditCard,
        title: "Invoicing & Payments",
        description: "Stripe-powered billing, automated reminders, and idempotent payment processing.",
      },
    ],
  },
  {
    name: "Industry Packs",
    description: "Purpose-built workflows for cleaning, construction, and field services.",
    modules: [
      {
        Icon: IconSparkles,
        title: "House Cleaning",
        description: "Recurring cleans, crew management, supply tracking, and client portal for bookings.",
      },
      {
        Icon: IconBuilding,
        title: "Construction",
        description: "Estimates, change orders, progress billing, and subcontractor coordination.",
      },
      {
        Icon: IconWrench,
        title: "Field Services",
        description: "Dispatch, service agreements, parts inventory, and technician mobile workflows.",
      },
    ],
  },
];
