import type { ComponentType } from "react";
import {
  IconCalendar,
  IconCreditCard,
  IconFileText,
  IconShield,
  IconSparkles,
  IconUsers,
  IconWrench,
} from "@fieldforge/ui";

type PortalIcon = ComponentType<{ size?: number; className?: string }>;

export type PortalCustomerRoute = {
  slug: string;
  title: string;
  description: string;
  hint: string;
  icon: PortalIcon;
};

export const PORTAL_CUSTOMER_ROUTES: PortalCustomerRoute[] = [
  {
    slug: "login",
    title: "Customer login",
    description: "Secure accounts so clients can access jobs, documents, and messages.",
    hint: "Magic-link and passwordless sign-in for client accounts.",
    icon: IconShield,
  },
  {
    slug: "bookings",
    title: "Bookings & reschedules",
    description: "Self-service calendar for recurring cleans and service windows.",
    hint: "Clients pick available slots and request schedule changes.",
    icon: IconCalendar,
  },
  {
    slug: "payments",
    title: "Payments & receipts",
    description: "Receipts, lien waivers, and saved payment methods in one place.",
    hint: "Stripe Connect checkout and payment history for portal users.",
    icon: IconCreditCard,
  },
  {
    slug: "documents",
    title: "Documents",
    description: "Contracts, proposals, and signed job paperwork.",
    hint: "Download agreements and completion certificates.",
    icon: IconFileText,
  },
  {
    slug: "messages",
    title: "Messages",
    description: "Threaded conversations with your service team.",
    hint: "In-app messaging tied to jobs and estimates.",
    icon: IconSparkles,
  },
  {
    slug: "profile",
    title: "Profile",
    description: "Contact details, properties, and notification preferences.",
    hint: "Customer profile synced from CRM records.",
    icon: IconUsers,
  },
  {
    slug: "support",
    title: "Support",
    description: "Help requests, FAQs, and service issue reporting.",
    hint: "Open tickets and track resolution status.",
    icon: IconWrench,
  },
];

export function portalHref(slug: string) {
  return `/portal/${slug}`;
}
