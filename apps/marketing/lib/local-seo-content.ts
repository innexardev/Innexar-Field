import type { CityEntry, StateEntry } from "./local-seo-data";

export interface PainPoint {
  title: string;
  problem: string;
  solution: string;
  feature: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface CityPageContent {
  heroTitle: string;
  heroSubtitle: string;
  localIntro: string;
  painPoints: PainPoint[];
  features: { title: string; description: string }[];
  faqs: FaqItem[];
}

function citySeed(stateSlug: string, citySlug: string): number {
  const key = `${stateSlug}:${citySlug}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pick<T>(items: T[], seed: number, count: number): T[] {
  const result: T[] = [];
  const used = new Set<number>();
  for (let i = 0; i < count && i < items.length; i++) {
    const idx = (seed + i * 7) % items.length;
    if (used.has(idx)) {
      const alt = (idx + 3) % items.length;
      used.add(alt);
      result.push(items[alt]);
    } else {
      used.add(idx);
      result.push(items[idx]);
    }
  }
  return result;
}

const HERO_TEMPLATES = [
  "Stop losing jobs to scheduling chaos in {city}",
  "Run your {city} cleaning crews without the group-text nightmare",
  "Scheduling, crews, and invoicing for {city} field service teams",
  "How {city} cleaning companies scale past solo-operator limits",
  "Get paid faster — operations software for {city} cleaners",
  "Dispatch {city} crews with confidence, not guesswork",
];

const LOCAL_INTRO_TEMPLATES = [
  "Cleaning and field service companies in {city}, {stateAbbr} compete on reliability and response time. When dispatch lives in texts and invoices wait until Friday, margins suffer. {brand} gives {city} operators one place to schedule jobs, assign crews, and bill clients — built for US field businesses.",
  "{city} owners often grow from referrals faster than their back office can keep up. Recurring residential routes, one-off deep cleans, and commercial contracts each need different workflows. {brand} connects scheduling, mobile checklists, and invoicing so your {city} team stays aligned.",
  "Whether you run two vans or twenty across {city} and neighboring areas, visibility matters. {brand} replaces scattered tools with dispatch boards, job costing, and client portals — so {city} customers get professional service and you keep real margins.",
  "Field service businesses in {city}, {stateAbbr} face the same bottleneck: the owner is still the dispatcher. {brand} automates recurring schedules, crew assignments, and invoice generation so you can focus on growth in the {city} market.",
];

const PAIN_POINT_POOL: Omit<PainPoint, "title">[] = [
  {
    problem:
      "Crew assignments scatter across group texts and voicemails, so jobs get missed or double-booked.",
    solution:
      "A live dispatch board shows who is on which job, with drag-and-drop rescheduling when plans change.",
    feature: "Dispatch board & crew calendar",
  },
  {
    problem:
      "Recurring residential routes are tracked in spreadsheets that nobody updates after the first week.",
    solution:
      "Recurring job rules auto-generate visits and sync to crew calendars — including route changes.",
    feature: "Recurring scheduling",
  },
  {
    problem:
      "Invoices go out days after jobs finish, slowing cash flow and creating awkward client follow-ups.",
    solution:
      "Completed jobs flow straight to invoices with your price book rates — send and collect online.",
    feature: "Job-to-invoice automation",
  },
  {
    problem:
      "You are busy every week but cannot tell which job types or crews actually make money.",
    solution:
      "Job costing ties labor, supplies, and drive time to each visit so you see margin per route.",
    feature: "Job costing & reporting",
  },
  {
    problem:
      "Clients call and text for schedule changes, ETA updates, and payment status — interrupting your day.",
    solution:
      "A branded client portal lets customers approve quotes, reschedule, and pay without phone tag.",
    feature: "Client self-service portal",
  },
  {
    problem:
      "New hires show up unprepared because checklists and SOPs live in someone's personal notes.",
    solution:
      "Mobile checklists on every job ensure consistent quality and faster onboarding for new cleaners.",
    feature: "Mobile QC checklists",
  },
  {
    problem:
      "Commercial contracts with multiple properties per client are hard to track without a real CRM.",
    solution:
      "Link properties, contacts, and contracts to recurring work orders with SLA priorities.",
    feature: "CRM & property management",
  },
  {
    problem:
      "Month-end means re-typing invoices into QuickBooks and hoping the numbers match.",
    solution:
      "Export invoices to QuickBooks Online with OAuth — one source of truth from job to books.",
    feature: "QuickBooks integration",
  },
];

const PAIN_TITLES = [
  "Crew coordination breaks down",
  "Recurring routes slip through cracks",
  "Invoices lag behind completed work",
  "Margins stay invisible",
  "Clients drain your phone line",
  "Quality varies by crew",
  "Commercial accounts get messy",
  "Accounting eats your evenings",
];

const FEATURE_BULLETS = [
  {
    title: "Dispatch board",
    description:
      "See every crew and job on one screen — reschedule in seconds when {city} traffic or weather shifts plans.",
  },
  {
    title: "Mobile app for crews",
    description:
      "Technicians clock in, complete checklists, and upload photos from the field — even on spotty connections.",
  },
  {
    title: "Recurring job engine",
    description:
      "Set weekly, biweekly, or custom cadences once; {brand} generates the schedule and reminders automatically.",
  },
  {
    title: "Estimates & proposals",
    description:
      "Send professional quotes from your price book; clients approve online and jobs land on the calendar.",
  },
  {
    title: "Invoicing & payments",
    description:
      "Bill from completed work, accept cards via Stripe, and reduce days-sales-outstanding for {city} accounts.",
  },
  {
    title: "Client portal",
    description:
      "Let {city} customers book, reschedule, and pay without calling your office during route hours.",
  },
  {
    title: "Job costing",
    description:
      "Know which routes and service types profit in {stateAbbr} — adjust pricing before margins erode.",
  },
  {
    title: "Cleaning checklists",
    description:
      "Standardize deep cleans, move-outs, and commercial specs so every crew delivers the same quality.",
  },
];

const FAQ_POOL: Omit<FaqItem, "question">[] = [
  {
    answer:
      "Most {city} operators are live within a day. Import customers, set your price book, and build your first recurring routes. Our onboarding wizard walks you through crew setup and mobile access — no IT team required.",
  },
  {
    answer:
      "Yes. {brand} supports multiple crews with role-based permissions — dispatchers see the full board while technicians only access their assigned jobs and checklists in {city} and surrounding areas.",
  },
  {
    answer:
      "Completed jobs convert to invoices with one click. You can send via email, enable online card payments, and export to QuickBooks Online. Many {city} teams cut invoice lag from days to same-day.",
  },
  {
    answer:
      "Absolutely. Link multiple properties per commercial client, attach contracts, and generate recurring work orders with SLA tracking — common for {city} office and retail accounts.",
  },
  {
    answer:
      "The mobile PWA works on iOS and Android browsers. Crews in {city} clock in, view job details, complete QC checklists, and capture photos without installing a separate app store build.",
  },
  {
    answer:
      "Job costing ties labor hours, supply costs, and drive time to each visit. You will see which {city} routes and service types hit target margin — and which need repricing or route density improvements.",
  },
  {
    answer:
      "Recurring rules handle weekly, biweekly, monthly, and custom cadences. When a {city} client pauses service, one change updates future visits without rebuilding the whole schedule.",
  },
  {
    answer:
      "We offer a {trialDays}-day free trial with no credit card required. Most {city} cleaning companies validate dispatch and invoicing workflows within the first week.",
  },
];

const FAQ_QUESTIONS = [
  "How fast can a {city} cleaning company get started with {brand}?",
  "Does {brand} work for multi-crew operations in {city}?",
  "Can I invoice clients automatically after jobs in {city}?",
  "Is {brand} suitable for commercial cleaning contracts in {city}?",
  "Do my {city} crews need a special mobile app?",
  "How does {brand} help me understand profit per job in {city}?",
  "What about recurring residential cleaning in {city}?",
  "Is there a free trial for {city} field service businesses?",
];

const STATE_FAQ_ANGLES: Record<string, string> = {
  florida:
    "Florida's snowbird and vacation-rental seasons create scheduling spikes — {brand} handles bulk reschedules without losing recurring client history.",
  texas:
    "Across sprawling TX metros, route density matters — dispatch and map views help you cluster {city} jobs and cut windshield time.",
  california:
    "California operators face tight labor margins — job costing shows which {city} routes are worth keeping before you raise prices.",
  "new-york":
    "Dense {city} routes and commercial contracts need tight dispatch — {brand} keeps crews on schedule without constant phone coordination.",
  georgia:
    "Metro Atlanta growth means rapid hiring — mobile checklists help new {city} crews deliver consistent quality from week one.",
  "north-carolina":
    "Research Triangle and Charlotte growth mean rapid crew hiring — {brand} helps {city} operators onboard cleaners with mobile checklists and dispatch boards.",
  "south-carolina":
    "Coastal tourism and inland suburbs create mixed demand in SC — {brand} handles recurring routes and turnover spikes for {city} teams.",
  "new-jersey":
    "Dense NJ routes between NYC and Philadelphia need tight scheduling — {brand} keeps {city} crews on time without constant phone coordination.",
  virginia:
    "DC-adjacent commercial accounts and Hampton Roads residential routes need multi-property CRM — {brand} fits {city} operators scaling past spreadsheets.",
  maryland:
    "Baltimore density and DC-suburb affluence demand reliable dispatch — {brand} gives {city} teams one board for every crew and job.",
  arizona:
    "Heat and snowbird season swing demand in AZ — {brand} helps {city} operators plan crew capacity and reschedule without losing history.",
  tennessee:
    "Nashville-area growth outpaces informal dispatch — {brand} helps {city} cleaning companies delegate scheduling and protect margins.",
  washington:
    "Seattle-area clients expect digital self-service — {brand} delivers portals and mobile crews for {city} operators facing weather delays.",
  colorado:
    "Front Range sprawl and mountain-town tourism mix routes — {brand} helps {city} teams cluster jobs and cut drive time.",
  pennsylvania:
    "Philly density and Pittsburgh commercial accounts need flexible scheduling — {brand} supports {city} operators with recurring rules and job costing.",
  illinois:
    "Chicagoland winters and dense routes demand reschedule agility — {brand} keeps {city} dispatch boards current when plans change hourly.",
  nevada:
    "Las Vegas convention peaks and steady residential routes need capacity planning — {brand} helps {city} operators fill slots and invoice same-day.",
  massachusetts:
    "High labor costs in MA make margin visibility essential — {brand} shows {city} operators which routes actually profit.",
  ohio:
    "Columbus growth and Cleveland commercial work need multi-crew dispatch — {brand} scales {city} teams past the spreadsheet ceiling.",
  michigan:
    "Detroit commercial contracts and suburban residential routes need unified CRM — {brand} connects properties, jobs, and invoices for {city} teams.",
  minnesota:
    "Twin Cities seasonality and medical-corridor demand need reliable recurring jobs — {brand} automates {city} schedules through weather shifts.",
  oregon:
    "Portland-area clients value consistency and eco-conscious service — {brand} standardizes {city} crew quality with mobile checklists.",
  indiana:
    "Indianapolis suburban growth rewards operators who dispatch professionally — {brand} helps {city} teams scale without owner bottlenecks.",
  missouri:
    "St. Louis and Kansas City sprawl make route visibility critical — {brand} gives {city} operators one dispatch board across the metro.",
  wisconsin:
    "Milwaukee urban routes and Madison residential demand need winter-ready scheduling — {brand} buffers {city} plans when weather shifts.",
  alabama:
    "Birmingham and Huntsville growth corridors need faster crew onboarding — {brand} helps {city} operators train with documented mobile SOPs.",
  louisiana:
    "New Orleans tourism and hurricane-season reschedules need flexible calendars — {brand} protects {city} recurring history through bulk changes.",
  oklahoma:
    "OKC and Tulsa operators scale through referrals — {brand} connects {city} scheduling, dispatch, and invoicing before spreadsheets break.",
  kentucky:
    "Louisville and Lexington premium residential routes need consistent quoting — {brand} aligns {city} estimates with your price book margins.",
  utah:
    "Utah's family-heavy suburbs create dense recurring routes — {brand} helps {city} operators grow crews without losing dispatch control.",
};

function fill(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template,
  );
}

export function buildCityPageContent(
  state: StateEntry,
  city: CityEntry,
  brandName: string,
  trialDays: number,
): CityPageContent {
  const seed = citySeed(state.slug, city.slug);
  const vars = {
    city: city.name,
    state: state.name,
    stateAbbr: state.abbreviation,
    brand: brandName,
    trialDays: String(trialDays),
  };

  const heroTitle = fill(HERO_TEMPLATES[seed % HERO_TEMPLATES.length], vars);
  const heroSubtitle = fill(
    "Manage crews, scheduling, and invoicing for {city} cleaning and field service businesses — without spreadsheets or group texts.",
    vars,
  );
  const localIntro = fill(LOCAL_INTRO_TEMPLATES[seed % LOCAL_INTRO_TEMPLATES.length], vars);

  const painIndices = pick(
    PAIN_POINT_POOL.map((_, i) => i),
    seed,
    4,
  );
  const painPoints: PainPoint[] = painIndices.map((idx) => ({
    title: PAIN_TITLES[idx],
    ...PAIN_POINT_POOL[idx],
    problem: fill(PAIN_POINT_POOL[idx].problem, vars),
    solution: fill(PAIN_POINT_POOL[idx].solution, vars),
  }));

  const features = pick(FEATURE_BULLETS, seed + 11, 4).map((f) => ({
    title: f.title,
    description: fill(f.description, vars),
  }));

  const faqCount = 3 + (seed % 3);
  const faqIndices = pick(
    FAQ_POOL.map((_, i) => i),
    seed + 23,
    faqCount,
  );
  const faqs: FaqItem[] = faqIndices.map((idx) => ({
    question: fill(FAQ_QUESTIONS[idx], vars),
    answer: fill(FAQ_POOL[idx].answer, vars),
  }));

  const stateAngle = STATE_FAQ_ANGLES[state.slug];
  if (stateAngle && faqs.length > 0) {
    faqs[faqs.length - 1] = {
      question: `What makes ${brandName} a fit for ${city.name}, ${state.abbreviation}?`,
      answer: fill(stateAngle, vars),
    };
  }

  return {
    heroTitle,
    heroSubtitle,
    localIntro,
    painPoints,
    features,
    faqs,
  };
}

export const SOLUTION_PROBLEMS = [
  {
    slug: "scheduling-dispatch",
    title: "Scheduling & dispatch",
    description: "Stop double-bookings, missed jobs, and dispatch chaos across your crews.",
    pains: ["Double-booked crews", "No live dispatch view", "Last-minute reschedules"],
  },
  {
    slug: "invoicing-payments",
    title: "Invoicing & payments",
    description: "Bill from completed jobs, get paid faster, and export to QuickBooks.",
    pains: ["Late invoices", "Manual data entry", "Chasing payments"],
  },
  {
    slug: "crew-management",
    title: "Crew management",
    description: "Onboard cleaners, track performance, and standardize quality in the field.",
    pains: ["Inconsistent quality", "Training gaps", "No mobile checklists"],
  },
  {
    slug: "client-portal",
    title: "Client portal",
    description: "Let customers reschedule, approve quotes, and pay without phone tag.",
    pains: ["Constant status calls", "Payment delays", "Manual scheduling requests"],
  },
  {
    slug: "scale-cleaning-business",
    title: "Scale your cleaning business",
    description: "Grow from solo operator to multi-crew without outgrowing your software.",
    pains: ["Owner still dispatching", "Spreadsheet limits", "Invisible margins"],
  },
] as const;
