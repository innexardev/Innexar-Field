import type { ComponentType, SVGProps } from "react";
import {
  IconCalendar,
  IconCreditCard,
  IconLayoutDashboard,
  IconSparkles,
  IconUsers,
} from "@fieldforge/ui";

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

export type SolutionFaq = { question: string; answer: string };
export type SolutionProblem = { title: string; description: string };
export type SolutionOutcome = { title: string; description: string };
export type SolutionFeature = { title: string; description: string };
export type SolutionLink = { href: string; label: string };

export type SolutionPage = {
  slug: string;
  name: string;
  headline: string;
  subheadline: string;
  problemTitle: string;
  outcomeTitle: string;
  featureTitle: string;
  Icon: IconComponent;
  problems: SolutionProblem[];
  outcomes: SolutionOutcome[];
  features: SolutionFeature[];
  faq: SolutionFaq[];
  relatedSlugs: string[];
  internalLinks: SolutionLink[];
  signupQuery?: string;
};

export const SOLUTION_PAGES: SolutionPage[] = [
  {
    slug: "scheduling-dispatch",
    name: "Scheduling & Dispatch",
    headline: "Stop double-booking crews and losing jobs to scheduling chaos",
    subheadline:
      "When your whiteboard, group text, and spreadsheet disagree, customers get the wrong arrival window and crews show up at the wrong address.",
    problemTitle: "If this sounds like your Monday morning",
    outcomeTitle: "What changes when dispatch lives in one place",
    featureTitle: "How scheduling and dispatch work in the platform",
    Icon: IconCalendar,
    problems: [
      {
        title: "Double bookings slip through",
        description: "A recurring clean and a one-off estimate both land at 9 AM because nothing syncs.",
      },
      {
        title: "Last-minute changes never reach the field",
        description: "The office reschedules a job but the crew still drives to the old address.",
      },
      {
        title: "No real-time view of who is where",
        description: "Dispatchers guess at availability instead of seeing open slots on one board.",
      },
    ],
    outcomes: [
      {
        title: "One dispatch board for the whole day",
        description: "See every job, crew, and drive window in a single view.",
      },
      {
        title: "Instant updates to the mobile PWA",
        description: "Reschedule from the office and field teams get the new stop order immediately.",
      },
      {
        title: "Recurring schedules that generate themselves",
        description: "Set the pattern once; jobs appear on the calendar automatically.",
      },
    ],
    features: [
      {
        title: "Drag-and-drop dispatch board",
        description: "Assign crews, reorder routes, and spot conflicts before anyone loads the van.",
      },
      {
        title: "Recurring job templates",
        description: "Weekly, bi-weekly, or custom cadences with automatic job generation.",
      },
      {
        title: "Mobile-first field app",
        description: "Technicians see today's route and checklists on the PWA.",
      },
    ],
    faq: [
      {
        question: "Can I move jobs between crews on the fly?",
        answer: "Yes. Drag jobs to another crew or day on the dispatch board.",
      },
      {
        question: "Does scheduling support recurring residential cleans?",
        answer: "Recurring templates are built for cleaning workflows with automatic job generation.",
      },
      {
        question: "How does scheduling connect to invoicing?",
        answer: "Completed jobs can trigger invoicing automatically — no re-keying.",
      },
    ],
    relatedSlugs: ["crew-management", "scale-cleaning-business", "client-portal"],
    internalLinks: [
      { href: "/solutions", label: "All solutions" },
      { href: "/features", label: "All platform modules" },
      { href: "/industries/cleaning", label: "House cleaning workflows" },
    ],
    signupQuery: "?module=scheduling",
  },
  {
    slug: "invoicing-payments",
    name: "Invoicing & Payments",
    headline: "Stop chasing checks and wondering which jobs actually made money",
    subheadline:
      "When invoicing happens in a separate tool from your jobs, payments arrive late and cash flow becomes a guessing game.",
    problemTitle: "The billing problems that kill cash flow",
    outcomeTitle: "Get paid faster with less admin",
    featureTitle: "Invoicing and payments built into every job",
    Icon: IconCreditCard,
    problems: [
      {
        title: "Invoices go out days after the job",
        description: "Technicians finish work Friday but billing waits until Monday.",
      },
      {
        title: "Payments are disconnected from jobs",
        description: "Stripe, QuickBooks, and your job tracker never agree on what was billed.",
      },
      {
        title: "Chasing overdue accounts eats your week",
        description: "Without automated reminders, owners spend hours on follow-up calls.",
      },
    ],
    outcomes: [
      {
        title: "Invoice from the job, not a spreadsheet",
        description: "Line items and job details carry over — send a professional invoice in minutes.",
      },
      {
        title: "Customers pay online the same day",
        description: "Stripe-powered payments and a client portal shorten days-sales-outstanding.",
      },
      {
        title: "Real-time view of outstanding balance",
        description: "See what is paid, pending, and overdue per customer without exporting reports.",
      },
    ],
    features: [
      {
        title: "Job-linked invoices",
        description: "Pull labor, materials, and quote lines into an invoice with one click.",
      },
      {
        title: "Stripe payments",
        description: "Accept cards on invoices and through the client portal.",
      },
      {
        title: "QuickBooks export",
        description: "Push invoices to QuickBooks Online when you are ready for the books.",
      },
    ],
    faq: [
      {
        question: "Can customers pay through the client portal?",
        answer: "Yes. Open invoices appear in the branded portal with secure card checkout.",
      },
      {
        question: "Are invoices tied to job costing?",
        answer: "Invoices link to jobs so you can compare billed amounts against labor and material costs.",
      },
    ],
    relatedSlugs: ["client-portal", "scheduling-dispatch", "scale-cleaning-business"],
    internalLinks: [
      { href: "/solutions", label: "All solutions" },
      { href: "/pricing", label: "See plan pricing" },
      { href: "/industries/field-services", label: "Field service billing workflows" },
    ],
    signupQuery: "?module=invoicing",
  },
  {
    slug: "crew-management",
    name: "Crew Management",
    headline: "Stop guessing who is available and hoping overtime does not blow the job",
    subheadline:
      "When crew assignments live in texts and paper timesheets, coverage gaps and accountability problems follow every busy week.",
    problemTitle: "Crew chaos costs you margin",
    outcomeTitle: "Run teams with clarity, not guesswork",
    featureTitle: "Crew management that connects to dispatch and costing",
    Icon: IconUsers,
    problems: [
      {
        title: "Nobody knows who is actually free",
        description: "Dispatchers text three people to cover a sick call because availability is not visible.",
      },
      {
        title: "Overtime surprises hit after payroll",
        description: "Hours pile up across jobs without live totals.",
      },
      {
        title: "No proof of who did what on site",
        description: "When a customer disputes quality, you cannot tie the visit to a specific crew.",
      },
    ],
    outcomes: [
      {
        title: "Assign the right crew to every job",
        description: "Match skills, zones, and availability when building the day.",
      },
      {
        title: "Labor hours tied to jobs in real time",
        description: "Clock-ins feed job costing so you see labor burn before the job closes.",
      },
      {
        title: "Scale headcount without losing control",
        description: "Standard roles and mobile workflows help new crews perform faster.",
      },
    ],
    features: [
      {
        title: "Crew profiles and roles",
        description: "Define teams, default assignments, and permissions.",
      },
      {
        title: "Assignment on the dispatch board",
        description: "Attach crew members to a job with visibility into daily load.",
      },
      {
        title: "Labor roll-up for job costing",
        description: "Hours flow into budget vs. actual views on each job.",
      },
    ],
    faq: [
      {
        question: "Can one job have multiple crew members?",
        answer: "Yes. Assign a lead and helpers on the same visit.",
      },
      {
        question: "Do crews only see their own jobs?",
        answer: "Role-based access controls what each user sees on mobile and web.",
      },
    ],
    relatedSlugs: ["scheduling-dispatch", "scale-cleaning-business", "invoicing-payments"],
    internalLinks: [
      { href: "/solutions/scheduling-dispatch", label: "Scheduling and dispatch" },
      { href: "/industries/cleaning", label: "Cleaning crew workflows" },
      { href: "/pricing", label: "User limits by plan" },
    ],
    signupQuery: "?module=dispatch",
  },
  {
    slug: "client-portal",
    name: "Client Portal",
    headline: "Stop answering the same status calls and reschedule requests all day",
    subheadline:
      "When customers cannot self-serve, your office becomes a call center — and every interruption pulls dispatchers away from running the board.",
    problemTitle: "Customers expect more than phone tag",
    outcomeTitle: "Give clients a branded front door",
    featureTitle: "A client portal that reduces inbound noise",
    Icon: IconLayoutDashboard,
    problems: [
      {
        title: "Where is my cleaner? rings nonstop",
        description: "Without a live status view, staff repeat the same answers.",
      },
      {
        title: "Reschedules require a phone call",
        description: "Customers who could pick a new slot online call during your busiest hour.",
      },
      {
        title: "Quotes and invoices sit in email threads",
        description: "Proposals get buried and payments wait because nothing lives in one place.",
      },
    ],
    outcomes: [
      {
        title: "Customers check status on their own",
        description: "Upcoming visits, history, and messages live in a branded portal.",
      },
      {
        title: "Self-service booking and reschedule requests",
        description: "Let clients propose new times within your rules.",
      },
      {
        title: "Quotes, signatures, and payments in one place",
        description: "Customers review, sign, and pay without printing or scanning.",
      },
    ],
    features: [
      {
        title: "Branded customer portal",
        description: "Your logo and colors from central brand settings.",
      },
      {
        title: "Job history and upcoming visits",
        description: "Customers see what was done and what is scheduled next.",
      },
      {
        title: "Invoice viewing and card payment",
        description: "Open balances with secure Stripe checkout.",
      },
    ],
    faq: [
      {
        question: "Do customers need an app to use the portal?",
        answer: "No. The portal is web-based and works on any device.",
      },
      {
        question: "Can customers request schedule changes themselves?",
        answer: "You control which self-service actions are enabled per tenant.",
      },
    ],
    relatedSlugs: ["invoicing-payments", "scheduling-dispatch", "scale-cleaning-business"],
    internalLinks: [
      { href: "/solutions/invoicing-payments", label: "Invoicing and payments" },
      { href: "/industries/cleaning", label: "Cleaning customer experience" },
      { href: "/features", label: "CRM and portal modules" },
    ],
    signupQuery: "?module=portal",
  },
  {
    slug: "scale-cleaning-business",
    name: "Scale Your Cleaning Business",
    headline: "Stop outgrowing spreadsheets the moment you add a second crew",
    subheadline:
      "Solo operators can wing it. Multi-crew cleaning companies need recurring schedules, supply tracking, and dispatch that does not break when you hire crew number six.",
    problemTitle: "Growth breaks informal systems",
    outcomeTitle: "Operate like a company, not a side hustle",
    featureTitle: "The cleaning pack — purpose-built to scale",
    Icon: IconSparkles,
    problems: [
      {
        title: "Recurring clients slip through the cracks",
        description: "Adding properties multiplies the chance someone misses a visit.",
      },
      {
        title: "Each crew runs on different checklists",
        description: "Quality varies because standards live in text messages.",
      },
      {
        title: "Owner stays trapped in daily dispatch",
        description: "You hired leads to grow revenue, but you still rearrange routes every morning.",
      },
    ],
    outcomes: [
      {
        title: "Recurring revenue on autopilot",
        description: "Templates generate visits and surface exceptions before customers notice.",
      },
      {
        title: "Consistent quality at every property",
        description: "Checklists and photos per job give leads a standard to enforce.",
      },
      {
        title: "Know which accounts deserve a price increase",
        description: "Labor and supply costs roll up per property so you protect margin.",
      },
    ],
    features: [
      {
        title: "Cleaning industry pack",
        description: "Recurring schedules, property profiles, and QC checklists out of the box.",
      },
      {
        title: "Multi-crew dispatch and routes",
        description: "Daily views optimized for residential routes.",
      },
      {
        title: "Client portal for bookings and payments",
        description: "Reduce phone volume with self-service for residential clients.",
      },
    ],
    faq: [
      {
        question: "Is this only for residential cleaning?",
        answer: "The cleaning pack supports residential and commercial workflows.",
      },
      {
        question: "Can I run multiple crews on different schedules?",
        answer: "Yes. Assign crews to zones and manage all teams from one dispatch board.",
      },
    ],
    relatedSlugs: ["scheduling-dispatch", "crew-management", "client-portal"],
    internalLinks: [
      { href: "/industries/cleaning", label: "House cleaning industry page" },
      { href: "/solutions/scheduling-dispatch", label: "Scheduling and dispatch" },
      { href: "/pricing", label: "Compare plans" },
    ],
    signupQuery: "?pack=cleaning",
  },
];

export function getSolutionBySlug(slug: string): SolutionPage | undefined {
  return SOLUTION_PAGES.find((page) => page.slug === slug);
}

export function getRelatedSolutions(slugs: string[]): SolutionPage[] {
  return slugs
    .map((slug) => getSolutionBySlug(slug))
    .filter((page): page is SolutionPage => page != null);
}

export const SOLUTION_PROBLEM_SUMMARIES = SOLUTION_PAGES.map((page) => ({
  slug: page.slug,
  title: page.name,
  description: page.subheadline,
}));
