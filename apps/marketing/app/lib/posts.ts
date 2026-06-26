import type { BlogPostListing } from "./marketing-content";
import { loadMarketingContentFromConfig } from "./marketing-content";

export type BlogSection =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

export type BlogPost = BlogPostListing & {
  sections: BlogSection[];
};

/** Stub CMS — article bodies keyed by slug; listings come from config/marketing-content.yaml */
export const BLOG_POST_SECTIONS: Record<string, BlogSection[]> = {
  "job-costing-for-contractors": [
    {
      type: "paragraph",
      text: "Most contractors lose money on jobs they thought they won. The estimate looked competitive, the client signed quickly, and six weeks later the crew is behind schedule, materials cost more than planned, and change orders are eating what little margin was left. Job costing is how you see that slide coming before it becomes a loss.",
    },
    {
      type: "heading",
      text: "What job costing actually measures",
    },
    {
      type: "paragraph",
      text: "Job costing compares budgeted costs — labor hours, materials, subcontractor fees, equipment, and allocated overhead — against what you actually spend as work progresses. It is not the same as accounting profit and loss, which often lands weeks after the job closes. Real-time job costing tells you whether a project is on track while you can still adjust crew size, renegotiate subs, or document a change order.",
    },
    {
      type: "list",
      items: [
        "Budget at bid time: break the estimate into cost codes (framing, electrical, finishes) instead of one lump sum.",
        "Track actuals daily: crew timesheets, material receipts, and POs posted to the same job and cost code.",
        "Review weekly: compare percent complete to percent of budget spent — if you are 40% done but 55% through budget, investigate immediately.",
        "Close with lessons: capture variance by line item so the next estimate on similar work is sharper.",
      ],
    },
    {
      type: "heading",
      text: "Common mistakes that erode margins",
    },
    {
      type: "paragraph",
      text: "Spreadsheets work until they do not. When foremen text hours, office staff re-key them Friday night, and material invoices sit in a drawer, your job cost report is always stale. Another trap is mixing direct and indirect costs — if you do not allocate a share of truck fuel, insurance, and project management time, every job looks more profitable than it is.",
    },
    {
      type: "paragraph",
      text: "Change orders without a written trail are the silent killer. Verbal approvals for extra scope rarely get billed at full margin. Tie every scope change to a signed amendment and update the job budget the same day.",
    },
    {
      type: "heading",
      text: "How to get started this week",
    },
    {
      type: "list",
      items: [
        "Pick one active job and rebuild its budget in cost codes — even if the original estimate was flat.",
        "Require every field hour and receipt to reference that job number before it is approved.",
        "Hold a 15-minute weekly job review with PM and owner: budget vs. actual, open change orders, forecast to complete.",
        "Use software that connects estimating, time tracking, and AP so you are not reconciling three systems.",
      ],
    },
    {
      type: "paragraph",
      text: "Contractors who know their numbers bid with confidence. They walk away from bad jobs instead of hoping to make it up on volume — and they finish good jobs with margins intact.",
    },
  ],
  "field-service-dispatch-best-practices": [
    {
      type: "paragraph",
      text: "Dispatch is the control tower of a service business. A strong dispatcher turns a pile of work orders into a day where technicians arrive on time, carry the right parts, and leave with a signed ticket and payment. A weak one sends techs across town twice and leaves customers wondering if anyone is coming.",
    },
    {
      type: "heading",
      text: "1. Group jobs by zone, not just by time",
    },
    {
      type: "paragraph",
      text: "Geographic clustering beats a first-in-first-out queue. Batch morning calls in the north territory and afternoon calls in the south. Even 20 minutes saved per tech per day adds a billable visit across a fleet of eight trucks.",
    },
    {
      type: "heading",
      text: "2. Match skill to ticket before you assign",
    },
    {
      type: "paragraph",
      text: "Sending a junior tech to a commercial RTU with a locked-out compressor wastes a trip. Tag work orders with required certifications, equipment type, and estimated duration so dispatch assigns the right person the first time.",
    },
    {
      type: "heading",
      text: "3. Use live status, not phone tag",
    },
    {
      type: "list",
      items: [
        "En route — customer gets an ETA text automatically.",
        "On site — dispatcher sees arrival without calling the truck.",
        "Waiting on parts — job moves to a hold queue instead of blocking the board.",
        "Complete — invoice draft is ready before the tech leaves the driveway.",
      ],
    },
    {
      type: "heading",
      text: "4. Protect capacity for emergencies",
    },
    {
      type: "paragraph",
      text: "Reserve one or two slots per crew for same-day urgent calls. If every hour is booked tight, you either miss high-margin emergency work or blow up the schedule when something breaks.",
    },
    {
      type: "heading",
      text: "5. Standardize the truck stock list",
    },
    {
      type: "paragraph",
      text: "First-time fix rate rises when common consumables and failure-prone parts live on the truck. Review top SKUs quarterly from completed jobs and adjust par levels — dispatch should know which trucks are stocked for which job types.",
    },
    {
      type: "heading",
      text: "6. Measure what matters",
    },
    {
      type: "list",
      items: [
        "Jobs completed per tech per day",
        "Average travel time between stops",
        "First-time fix rate",
        "Customer callback rate within 30 days",
        "Revenue per dispatched hour",
      ],
    },
    {
      type: "heading",
      text: "7. Close the loop with the customer",
    },
    {
      type: "paragraph",
      text: "Automated appointment reminders and post-visit summaries reduce no-shows and build trust. Customers who know when the tech arrives and what was done are far more likely to approve maintenance agreements on the next visit.",
    },
  ],
  "recurring-revenue-for-cleaning-companies": [
    {
      type: "paragraph",
      text: "One-time jobs spike revenue and then disappear. Recurring contracts smooth cash flow, simplify crew planning, and make your business worth more at sale. The shift from chase-and-book to contract-based work is the biggest lever most cleaning companies have — and it starts with how you quote and onboard.",
    },
    {
      type: "heading",
      text: "Price for the relationship, not just the visit",
    },
    {
      type: "paragraph",
      text: "Recurring clients should not pay the same per visit as a one-time deep clean with marketing cost baked in. Offer a modest discount for weekly or biweekly service in exchange for a minimum term and auto-pay. The lifetime value of a 12-month contract far exceeds the margin you give up on visit one.",
    },
    {
      type: "heading",
      text: "Make the scope explicit",
    },
    {
      type: "list",
      items: [
        "Room-by-room checklist attached to the contract",
        "Add-on pricing for ovens, inside windows, and move-out extras",
        "Clear policy for skips, pauses, and access issues",
        "Photo standards for quality checks on the first three visits",
      ],
    },
    {
      type: "paragraph",
      text: "Ambiguous scope creates callbacks and churn. When clients know exactly what every visit includes, disputes drop and crews move faster.",
    },
    {
      type: "heading",
      text: "Automate schedule generation",
    },
    {
      type: "paragraph",
      text: "Manual calendars break at 30+ recurring properties. Use recurring schedule templates that spawn jobs automatically, respect blackout dates, and assign default crews. When a client reschedules through a portal, the change propagates to dispatch without a phone call to the office.",
    },
    {
      type: "heading",
      text: "Reduce churn with proactive communication",
    },
    {
      type: "paragraph",
      text: "Send a reminder before each visit, a thank-you with invoice after, and a quarterly check-in for long-term accounts. Clients who feel invisible cancel when life changes; clients who hear from you stay through vacations and home sales.",
    },
    {
      type: "heading",
      text: "Track the metrics that predict growth",
    },
    {
      type: "list",
      items: [
        "Monthly recurring revenue (MRR) vs. one-time job revenue",
        "Average contract length and renewal rate",
        "Revenue per crew hour on recurring vs. ad-hoc jobs",
        "Client acquisition cost payback period",
      ],
    },
    {
      type: "paragraph",
      text: "Cleaning businesses that treat recurring contracts as a product — with defined packaging, pricing, and delivery — stop competing on whoever answers the phone fastest and start building a company that runs whether the owner is on the schedule or not.",
    },
  ],
};

function attachSections(listing: BlogPostListing): BlogPost {
  return {
    ...listing,
    sections: BLOG_POST_SECTIONS[listing.slug] ?? [],
  };
}

export function getPostsFromConfig(): BlogPost[] {
  const { posts } = loadMarketingContentFromConfig();
  return posts
    .map(attachSections)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export async function getPostBySlug(slug: string): Promise<BlogPost | undefined> {
  const { getBlogPostListing } = await import("./marketing-content");
  const listing = await getBlogPostListing(slug);
  if (!listing) return undefined;
  return attachSections(listing);
}

export async function getAllPosts(): Promise<BlogPost[]> {
  const { getBlogPostListings } = await import("./marketing-content");
  const listings = await getBlogPostListings();
  return listings.map(attachSections);
}
