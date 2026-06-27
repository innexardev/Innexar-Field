/** Tier 1 local keyword templates — see docs/marketing/keyword-matrix.md */
export type CityProblemPage = {
  slug: string;
  title: string;
  headlineTemplate: string;
  introTemplate: string;
  nationalSolutionSlug: string;
};

export const CITY_PROBLEM_PAGES: readonly CityProblemPage[] = [
  {
    slug: "cleaning-business-software",
    title: "Cleaning business software",
    headlineTemplate: "Cleaning business software for {city}, {stateAbbr}",
    introTemplate:
      "Operators in {city} need scheduling, crew dispatch, and invoicing in one place — not a patchwork of spreadsheets and group texts.",
    nationalSolutionSlug: "scale-cleaning-business",
  },
  {
    slug: "house-cleaning-scheduling",
    title: "House cleaning scheduling",
    headlineTemplate: "House cleaning scheduling software in {city}",
    introTemplate:
      "Recurring residential routes in {city} break down when calendars live in three different tools. One schedule should drive dispatch and client updates.",
    nationalSolutionSlug: "scheduling-dispatch",
  },
  {
    slug: "commercial-cleaning-software",
    title: "Commercial cleaning software",
    headlineTemplate: "Commercial cleaning management for {city}, {stateAbbr}",
    introTemplate:
      "Multi-site commercial accounts in {city} need contracts, properties, and SLA-aware work orders — not one-off job tickets.",
    nationalSolutionSlug: "scale-cleaning-business",
  },
  {
    slug: "scheduling-invoicing",
    title: "Scheduling & invoicing",
    headlineTemplate: "Field service scheduling and invoicing in {city}",
    introTemplate:
      "When {city} teams finish jobs Friday but invoice Monday, cash flow suffers. Connect completed work to billing the same day.",
    nationalSolutionSlug: "invoicing-payments",
  },
  {
    slug: "crew-dispatch",
    title: "Crew dispatch",
    headlineTemplate: "Cleaning crew dispatch software for {city}",
    introTemplate:
      "Dispatching {city} crews from group texts leads to missed stops and double bookings. A live board keeps everyone aligned.",
    nationalSolutionSlug: "crew-management",
  },
  {
    slug: "maid-service-software",
    title: "Maid service software",
    headlineTemplate: "Maid service business software in {city}, {stateAbbr}",
    introTemplate:
      "Maid service owners in {city} scale on referrals — but recurring schedules and client portals determine whether growth feels manageable.",
    nationalSolutionSlug: "scale-cleaning-business",
  },
  {
    slug: "field-service-management",
    title: "Field service management",
    headlineTemplate: "Field service management software for {city}, {stateAbbr}",
    introTemplate:
      "Field service teams across {city} need dispatch visibility, mobile checklists, and job costing — not another generic CRM.",
    nationalSolutionSlug: "scheduling-dispatch",
  },
] as const;

export function getCityProblemBySlug(slug: string): CityProblemPage | undefined {
  return CITY_PROBLEM_PAGES.find((page) => page.slug === slug);
}

export function fillCityProblemTemplate(
  template: string,
  vars: { city: string; state: string; stateAbbr: string; brand: string },
): string {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template,
  );
}
