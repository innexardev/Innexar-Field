export type SeoTier = 1 | 2 | 3 | 4;

export interface CityEntry {
  name: string;
  slug: string;
}

export interface StateEntry {
  name: string;
  slug: string;
  abbreviation: string;
  tier: SeoTier;
  marketContext: string;
  intro: string;
  cities: CityEntry[];
}

export function cityToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/'/g, "")
    .replace(/\s+/g, "-");
}

function city(name: string): CityEntry {
  return { name, slug: cityToSlug(name) };
}

const TIER_1_STATES: StateEntry[] = [
  {
    name: "Florida",
    slug: "florida",
    abbreviation: "FL",
    tier: 1,
    marketContext:
      "Florida's cleaning market spans snowbird season turnover, vacation-rental turnovers, and year-round residential demand across coastal and inland metros. Owners juggle humidity-related scheduling shifts, hurricane-season reschedules, and rapid crew growth in fast-expanding suburbs.",
    intro:
      "From Miami-Dade to Jacksonville, Florida cleaning companies face unique seasonal swings and sprawling service areas. Innexar Field helps FL operators dispatch crews, protect margins, and invoice faster — without replacing the tools that already work.",
    cities: [
      city("Miami"),
      city("Miami Beach"),
      city("Fort Lauderdale"),
      city("Boca Raton"),
      city("West Palm Beach"),
      city("Orlando"),
      city("Kissimmee"),
      city("Winter Park"),
      city("Windermere"),
      city("Tampa"),
      city("St. Petersburg"),
      city("Clearwater"),
      city("Sarasota"),
      city("Bradenton"),
      city("Naples"),
      city("Fort Myers"),
      city("Jacksonville"),
      city("Ponte Vedra"),
      city("Gainesville"),
      city("Ocala"),
      city("Melbourne"),
      city("Palm Bay"),
      city("Port St. Lucie"),
      city("Stuart"),
      city("Delray Beach"),
      city("Coral Gables"),
      city("Pembroke Pines"),
      city("Hollywood"),
      city("Miramar"),
      city("Hialeah"),
    ],
  },
  {
    name: "Texas",
    slug: "texas",
    abbreviation: "TX",
    tier: 1,
    marketContext:
      "Texas field service businesses operate across some of the nation's largest metro footprints — Houston sprawl, DFW growth corridors, and Austin's tech-driven residential boom. Route density and crew coordination matter as much as pricing.",
    intro:
      "Texas cleaning and field service companies scale fast — but group texts and spreadsheets break down past a few crews. Innexar Field gives TX operators one platform for scheduling, dispatch, invoicing, and job costing.",
    cities: [
      city("Houston"),
      city("Dallas"),
      city("Fort Worth"),
      city("Austin"),
      city("San Antonio"),
      city("Plano"),
      city("Frisco"),
      city("McKinney"),
      city("Irving"),
      city("Garland"),
      city("Arlington"),
      city("Sugar Land"),
      city("Katy"),
      city("Pearland"),
      city("The Woodlands"),
      city("Conroe"),
      city("Round Rock"),
      city("Georgetown"),
      city("Allen"),
      city("Richardson"),
    ],
  },
  {
    name: "California",
    slug: "california",
    abbreviation: "CA",
    tier: 1,
    marketContext:
      "California operators navigate high labor costs, strict compliance expectations, and customers who demand eco-friendly options and digital self-service. Margins depend on accurate job costing and fewer wasted drive miles.",
    intro:
      "California cleaning businesses need software that respects tight margins and complex operations. Innexar Field connects scheduling, crew mobile apps, invoicing, and QuickBooks export so CA teams run profitably at scale.",
    cities: [
      city("Los Angeles"),
      city("San Diego"),
      city("San Jose"),
      city("San Francisco"),
      city("Sacramento"),
      city("Irvine"),
      city("Anaheim"),
      city("Long Beach"),
      city("Santa Ana"),
      city("Huntington Beach"),
      city("Newport Beach"),
      city("Pasadena"),
      city("Glendale"),
      city("Santa Monica"),
      city("Beverly Hills"),
      city("Riverside"),
      city("Ontario"),
      city("Rancho Cucamonga"),
      city("Fresno"),
      city("Bakersfield"),
    ],
  },
  {
    name: "New York",
    slug: "new-york",
    abbreviation: "NY",
    tier: 1,
    marketContext:
      "New York's cleaning industry mixes dense urban routes, commercial contracts, and affluent suburban recurring residential work. Dispatchers need real-time visibility; owners need invoicing that keeps cash flow steady through seasonal slowdowns.",
    intro:
      "Whether you serve Manhattan high-rises or upstate suburbs, New York cleaning companies need operations software built for real-world complexity. Innexar Field unifies crews, schedules, and billing in one US-hosted platform.",
    cities: [
      city("New York City"),
      city("Brooklyn"),
      city("Queens"),
      city("Bronx"),
      city("Staten Island"),
      city("Buffalo"),
      city("Rochester"),
      city("Syracuse"),
      city("Albany"),
      city("White Plains"),
      city("Yonkers"),
      city("New Rochelle"),
      city("Long Island"),
      city("Hempstead"),
    ],
  },
  {
    name: "Georgia",
    slug: "georgia",
    abbreviation: "GA",
    tier: 1,
    marketContext:
      "Georgia's market centers on Metro Atlanta's rapid suburban expansion plus coastal and secondary metros. Cleaning companies grow from solo operators to multi-crew teams quickly — often before back-office systems catch up.",
    intro:
      "Georgia cleaning and field service businesses deserve software that grows with them. Innexar Field helps GA operators replace chaotic dispatch, late invoices, and spreadsheet job costing with one connected workflow.",
    cities: [
      city("Atlanta"),
      city("Alpharetta"),
      city("Marietta"),
      city("Roswell"),
      city("Sandy Springs"),
      city("Johns Creek"),
      city("Duluth"),
      city("Decatur"),
      city("Savannah"),
      city("Augusta"),
      city("Macon"),
    ],
  },
];

const TIER_2_4_STATES: StateEntry[] = [
  {
    name: "North Carolina",
    slug: "north-carolina",
    abbreviation: "NC",
    tier: 2,
    marketContext: "North Carolina's Research Triangle and Charlotte corridor drive rapid residential growth — cleaning companies scale from solo operators to multi-crew teams faster than back-office systems can keep up.",
    intro: "North Carolina cleaning and field service companies deserve software built for growth markets. Innexar Field helps NC operators dispatch crews, protect margins, and invoice faster across the Triangle, Charlotte, and beyond.",
    cities: [
      { name: "Charlotte", slug: "charlotte" },
      { name: "Raleigh", slug: "raleigh" },
      { name: "Durham", slug: "durham" },
      { name: "Cary", slug: "cary" },
      { name: "Greensboro", slug: "greensboro" },
      { name: "Winston-Salem", slug: "winston-salem" },
      { name: "Asheville", slug: "asheville" },
      { name: "Wilmington", slug: "wilmington" },
      { name: "Concord", slug: "concord" },
      { name: "Chapel Hill", slug: "chapel-hill" },
    ],
  },
  {
    name: "South Carolina",
    slug: "south-carolina",
    abbreviation: "SC",
    tier: 2,
    marketContext: "South Carolina blends coastal tourism turnovers with fast-growing inland suburbs. Owners in Charleston, Columbia, and Greenville juggle seasonal demand spikes and year-round recurring routes.",
    intro: "From Charleston coast to Upstate growth corridors, South Carolina cleaning companies need connected scheduling and billing. Innexar Field replaces group-text dispatch with one platform for SC field teams.",
    cities: [
      { name: "Charleston", slug: "charleston" },
      { name: "Columbia", slug: "columbia" },
      { name: "Greenville", slug: "greenville" },
      { name: "Myrtle Beach", slug: "myrtle-beach" },
      { name: "Rock Hill", slug: "rock-hill" },
      { name: "Hilton Head", slug: "hilton-head" },
    ],
  },
  {
    name: "New Jersey",
    slug: "new-jersey",
    abbreviation: "NJ",
    tier: 2,
    marketContext: "New Jersey operators serve dense urban routes and affluent suburbs across the NYC and Philadelphia metros. Commercial contracts and recurring residential work demand tight dispatch and reliable invoicing.",
    intro: "New Jersey's competitive cleaning market demands professional operations. Innexar Field gives NJ operators scheduling, crew mobile apps, invoicing, and job costing in one US-hosted platform.",
    cities: [
      { name: "Newark", slug: "newark" },
      { name: "Jersey City", slug: "jersey-city" },
      { name: "Hoboken", slug: "hoboken" },
      { name: "Elizabeth", slug: "elizabeth" },
      { name: "Edison", slug: "edison" },
      { name: "Princeton", slug: "princeton" },
      { name: "Cherry Hill", slug: "cherry-hill" },
      { name: "Clifton", slug: "clifton" },
      { name: "Paterson", slug: "paterson" },
      { name: "Morristown", slug: "morristown" },
      { name: "Paramus", slug: "paramus" },
    ],
  },
  {
    name: "Virginia",
    slug: "virginia",
    abbreviation: "VA",
    tier: 2,
    marketContext: "Virginia's mix of DC-adjacent commercial accounts and Hampton Roads residential routes creates scheduling complexity. Multi-property clients and government-adjacent compliance expectations raise the bar for operations software.",
    intro: "Virginia field service businesses need visibility across sprawling metros and multi-site commercial accounts. Innexar Field unifies dispatch, recurring jobs, and client portals for VA operators.",
    cities: [
      { name: "Virginia Beach", slug: "virginia-beach" },
      { name: "Richmond", slug: "richmond" },
      { name: "Arlington", slug: "arlington" },
      { name: "Alexandria", slug: "alexandria" },
      { name: "Fairfax", slug: "fairfax" },
      { name: "Norfolk", slug: "norfolk" },
      { name: "Chesapeake", slug: "chesapeake" },
    ],
  },
  {
    name: "Maryland",
    slug: "maryland",
    abbreviation: "MD",
    tier: 2,
    marketContext: "Maryland cleaning companies navigate Baltimore urban density and DC-suburb affluence. Crew coordination across counties and reliable cash flow from invoicing are top owner priorities.",
    intro: "Maryland cleaning companies scale best with software that matches their ambition. Innexar Field helps MD teams run profitable routes from Baltimore to the DC suburbs.",
    cities: [
      { name: "Baltimore", slug: "baltimore" },
      { name: "Rockville", slug: "rockville" },
      { name: "Bethesda", slug: "bethesda" },
      { name: "Columbia", slug: "columbia" },
      { name: "Silver Spring", slug: "silver-spring" },
      { name: "Frederick", slug: "frederick" },
    ],
  },
  {
    name: "Arizona",
    slug: "arizona",
    abbreviation: "AZ",
    tier: 2,
    marketContext: "Arizona's heat, snowbird season, and explosive suburban growth keep cleaning demand high in Phoenix and Tucson metros. Route density and crew retention matter as much as pricing.",
    intro: "Arizona cleaning operators face heat, seasonality, and suburban sprawl. Innexar Field connects scheduling, dispatch, invoicing, and margins for AZ field service teams.",
    cities: [
      { name: "Phoenix", slug: "phoenix" },
      { name: "Scottsdale", slug: "scottsdale" },
      { name: "Mesa", slug: "mesa" },
      { name: "Chandler", slug: "chandler" },
      { name: "Gilbert", slug: "gilbert" },
      { name: "Tempe", slug: "tempe" },
      { name: "Peoria", slug: "peoria" },
      { name: "Glendale", slug: "glendale" },
    ],
  },
  {
    name: "Tennessee",
    slug: "tennessee",
    abbreviation: "TN",
    tier: 2,
    marketContext: "Tennessee's Nashville boom and Memphis commercial base create diverse field service needs. Music City operators scale fast — often before dispatch and job costing catch up.",
    intro: "Tennessee's booming metros need operations software that keeps up. Innexar Field helps TN cleaning companies replace chaotic dispatch and late invoices with one connected workflow.",
    cities: [
      { name: "Nashville", slug: "nashville" },
      { name: "Franklin", slug: "franklin" },
      { name: "Brentwood", slug: "brentwood" },
      { name: "Knoxville", slug: "knoxville" },
      { name: "Chattanooga", slug: "chattanooga" },
      { name: "Memphis", slug: "memphis" },
    ],
  },
  {
    name: "Washington",
    slug: "washington",
    abbreviation: "WA",
    tier: 3,
    marketContext: "Washington operators balance Seattle tech-corridor affluence with seasonal weather delays. Clients expect digital self-service; margins depend on efficient routing across spread-out metros.",
    intro: "Washington field service teams compete on reliability and digital experience. Innexar Field gives WA operators dispatch boards, mobile checklists, and client self-service.",
    cities: [
      { name: "Seattle", slug: "seattle" },
      { name: "Bellevue", slug: "bellevue" },
      { name: "Tacoma", slug: "tacoma" },
      { name: "Redmond", slug: "redmond" },
      { name: "Kirkland", slug: "kirkland" },
      { name: "Spokane", slug: "spokane" },
    ],
  },
  {
    name: "Colorado",
    slug: "colorado",
    abbreviation: "CO",
    tier: 3,
    marketContext: "Colorado's mountain-town tourism and Front Range growth create mixed residential and short-term-rental demand. Altitude, weather, and long drive times make dispatch visibility critical.",
    intro: "Colorado cleaning businesses navigate weather, tourism, and Front Range growth. Innexar Field helps CO operators schedule smarter and invoice the same day jobs complete.",
    cities: [
      { name: "Denver", slug: "denver" },
      { name: "Aurora", slug: "aurora" },
      { name: "Boulder", slug: "boulder" },
      { name: "Fort Collins", slug: "fort-collins" },
      { name: "Colorado Springs", slug: "colorado-springs" },
    ],
  },
  {
    name: "Pennsylvania",
    slug: "pennsylvania",
    abbreviation: "PA",
    tier: 3,
    marketContext: "Pennsylvania spans Philadelphia density, Pittsburgh industry, and growing Lehigh Valley suburbs. Cleaning companies need software that handles both urban routes and multi-site commercial contracts.",
    intro: "Pennsylvania cleaning companies span urban density and suburban sprawl. Innexar Field unifies crews, schedules, and billing for PA field service operators.",
    cities: [
      { name: "Philadelphia", slug: "philadelphia" },
      { name: "Pittsburgh", slug: "pittsburgh" },
      { name: "Allentown", slug: "allentown" },
      { name: "Reading", slug: "reading" },
      { name: "Lancaster", slug: "lancaster" },
      { name: "Harrisburg", slug: "harrisburg" },
    ],
  },
  {
    name: "Illinois",
    slug: "illinois",
    abbreviation: "IL",
    tier: 3,
    marketContext: "Illinois field service teams — especially in Chicagoland — face harsh winters, dense routes, and demanding commercial clients. Cash flow and crew visibility separate growing operators from stagnant ones.",
    intro: "Illinois operators — especially in Chicagoland — need software that survives winter reschedules and dense routes. Innexar Field delivers dispatch, job costing, and QuickBooks-ready invoicing.",
    cities: [
      { name: "Chicago", slug: "chicago" },
      { name: "Naperville", slug: "naperville" },
      { name: "Schaumburg", slug: "schaumburg" },
      { name: "Evanston", slug: "evanston" },
      { name: "Aurora", slug: "aurora" },
      { name: "Rockford", slug: "rockford" },
    ],
  },
  {
    name: "Nevada",
    slug: "nevada",
    abbreviation: "NV",
    tier: 3,
    marketContext: "Nevada's Las Vegas tourism economy and Reno growth corridor mean high turnover cleans alongside steady residential routes. Scheduling spikes around conventions and events need flexible crew capacity.",
    intro: "Nevada cleaning companies ride tourism peaks and steady residential demand. Innexar Field helps NV operators manage crew capacity and cash flow in one platform.",
    cities: [
      { name: "Las Vegas", slug: "las-vegas" },
      { name: "Henderson", slug: "henderson" },
      { name: "Summerlin", slug: "summerlin" },
      { name: "North Las Vegas", slug: "north-las-vegas" },
      { name: "Reno", slug: "reno" },
    ],
  },
  {
    name: "Massachusetts",
    slug: "massachusetts",
    abbreviation: "MA",
    tier: 3,
    marketContext: "Massachusetts operators serve Boston's dense urban market and affluent suburbs. High labor costs make job costing essential — busy weeks must actually be profitable.",
    intro: "Massachusetts field service businesses face high expectations and tight margins. Innexar Field connects scheduling, crew management, and job costing for MA operators.",
    cities: [
      { name: "Boston", slug: "boston" },
      { name: "Cambridge", slug: "cambridge" },
      { name: "Quincy", slug: "quincy" },
      { name: "Worcester", slug: "worcester" },
      { name: "Newton", slug: "newton" },
      { name: "Brookline", slug: "brookline" },
    ],
  },
  {
    name: "Ohio",
    slug: "ohio",
    abbreviation: "OH",
    tier: 3,
    marketContext: "Ohio's Columbus growth, Cleveland commercial base, and Cincinnati suburbs create varied cleaning demand. Multi-crew dispatch and QuickBooks-ready invoicing help owners scale past spreadsheet limits.",
    intro: "Ohio cleaning companies grow through referrals — until spreadsheets break. Innexar Field gives OH operators one system for dispatch, recurring routes, and invoicing.",
    cities: [
      { name: "Columbus", slug: "columbus" },
      { name: "Cleveland", slug: "cleveland" },
      { name: "Cincinnati", slug: "cincinnati" },
      { name: "Dublin", slug: "dublin" },
      { name: "Toledo", slug: "toledo" },
      { name: "Dayton", slug: "dayton" },
    ],
  },
  {
    name: "Michigan",
    slug: "michigan",
    abbreviation: "MI",
    tier: 3,
    marketContext: "Michigan operators navigate Detroit commercial contracts, Ann Arbor residential affluence, and seasonal weather impacts. Unified scheduling and mobile checklists reduce quality variance across crews.",
    intro: "Michigan field service teams need software built for weather, commercial contracts, and multi-crew scale. Innexar Field delivers for operators across Detroit, Ann Arbor, and Grand Rapids.",
    cities: [
      { name: "Detroit", slug: "detroit" },
      { name: "Ann Arbor", slug: "ann-arbor" },
      { name: "Grand Rapids", slug: "grand-rapids" },
      { name: "Lansing", slug: "lansing" },
      { name: "Troy", slug: "troy" },
    ],
  },
  {
    name: "Minnesota",
    slug: "minnesota",
    abbreviation: "MN",
    tier: 3,
    marketContext: "Minnesota's Twin Cities metro and Rochester medical corridor demand reliable recurring service. Winter weather buffers and summer peak seasons require capacity planning in software, not guesswork.",
    intro: "Minnesota cleaning operators plan around seasons and dense Twin Cities routes. Innexar Field helps MN teams dispatch confidently and protect margins per job.",
    cities: [
      { name: "Minneapolis", slug: "minneapolis" },
      { name: "St. Paul", slug: "st-paul" },
      { name: "Bloomington", slug: "bloomington" },
      { name: "Rochester", slug: "rochester" },
    ],
  },
  {
    name: "Oregon",
    slug: "oregon",
    abbreviation: "OR",
    tier: 3,
    marketContext: "Oregon cleaning companies serve Portland's eco-conscious residential market and growing suburban corridors. Clients value online booking and consistent quality across rotating crews.",
    intro: "Oregon cleaning companies win on consistency and eco-conscious service. Innexar Field helps OR operators standardize quality with mobile checklists and recurring job automation.",
    cities: [
      { name: "Portland", slug: "portland" },
      { name: "Beaverton", slug: "beaverton" },
      { name: "Hillsboro", slug: "hillsboro" },
      { name: "Eugene", slug: "eugene" },
      { name: "Salem", slug: "salem" },
    ],
  },
  {
    name: "Indiana",
    slug: "indiana",
    abbreviation: "IN",
    tier: 4,
    marketContext: "Indiana's Indianapolis suburbs and Fort Wayne growth create opportunities for multi-crew cleaning companies — if operations software keeps pace with hiring.",
    intro: "Indiana field service businesses scaling past solo-operator limits need real dispatch and job costing. Innexar Field helps IN operators grow without operational chaos.",
    cities: [
      { name: "Indianapolis", slug: "indianapolis" },
      { name: "Carmel", slug: "carmel" },
      { name: "Fishers", slug: "fishers" },
      { name: "Fort Wayne", slug: "fort-wayne" },
    ],
  },
  {
    name: "Missouri",
    slug: "missouri",
    abbreviation: "MO",
    tier: 4,
    marketContext: "Missouri spans St. Louis and Kansas City metros with distinct route patterns. Owners scaling past eight crews need dispatch boards and job costing, not group texts.",
    intro: "Missouri cleaning companies across St. Louis and Kansas City need connected operations. Innexar Field replaces fragmented tools with scheduling, dispatch, and invoicing.",
    cities: [
      { name: "St. Louis", slug: "st-louis" },
      { name: "Kansas City", slug: "kansas-city" },
      { name: "Springfield", slug: "springfield" },
      { name: "Columbia", slug: "columbia" },
    ],
  },
  {
    name: "Wisconsin",
    slug: "wisconsin",
    abbreviation: "WI",
    tier: 4,
    marketContext: "Wisconsin operators face Milwaukee urban density and Madison's steady residential demand. Cold-season scheduling shifts and commercial accounts need flexible recurring job rules.",
    intro: "Wisconsin operators deserve software that handles seasonal shifts and multi-crew growth. Innexar Field helps WI cleaning teams run profitable routes year-round.",
    cities: [
      { name: "Milwaukee", slug: "milwaukee" },
      { name: "Madison", slug: "madison" },
      { name: "Green Bay", slug: "green-bay" },
      { name: "Kenosha", slug: "kenosha" },
    ],
  },
  {
    name: "Alabama",
    slug: "alabama",
    abbreviation: "AL",
    tier: 4,
    marketContext: "Alabama's Birmingham and Huntsville growth corridors attract new residential cleaning demand. Labor turnover makes mobile checklists and documented QC essential.",
    intro: "Alabama cleaning companies growing in Birmingham and Huntsville need operations that scale. Innexar Field delivers dispatch, checklists, and invoicing for AL field teams.",
    cities: [
      { name: "Birmingham", slug: "birmingham" },
      { name: "Huntsville", slug: "huntsville" },
      { name: "Montgomery", slug: "montgomery" },
      { name: "Mobile", slug: "mobile" },
    ],
  },
  {
    name: "Louisiana",
    slug: "louisiana",
    abbreviation: "LA",
    tier: 4,
    marketContext: "Louisiana operators handle New Orleans tourism turnovers, Baton Rouge commercial accounts, and hurricane-season reschedules. Reliable dispatch and client communication protect revenue.",
    intro: "Louisiana field service operators navigate tourism, weather, and commercial contracts. Innexar Field helps LA teams stay organized through peak seasons and reschedules.",
    cities: [
      { name: "New Orleans", slug: "new-orleans" },
      { name: "Baton Rouge", slug: "baton-rouge" },
      { name: "Lafayette", slug: "lafayette" },
      { name: "Metairie", slug: "metairie" },
    ],
  },
  {
    name: "Oklahoma",
    slug: "oklahoma",
    abbreviation: "OK",
    tier: 4,
    marketContext: "Oklahoma City and Tulsa operators grow through referrals and commercial contracts. Spreadsheet ceilings hit fast when crews multiply across sprawling metros.",
    intro: "Oklahoma cleaning businesses scaling in OKC and Tulsa need software past the spreadsheet ceiling. Innexar Field connects crews, schedules, and billing in one platform.",
    cities: [
      { name: "Oklahoma City", slug: "oklahoma-city" },
      { name: "Tulsa", slug: "tulsa" },
      { name: "Norman", slug: "norman" },
    ],
  },
  {
    name: "Kentucky",
    slug: "kentucky",
    abbreviation: "KY",
    tier: 4,
    marketContext: "Kentucky's Louisville and Lexington markets blend horse-country estates with urban residential routes. Consistent quoting and margin visibility help owners price premium service correctly.",
    intro: "Kentucky operators in Louisville and Lexington need margin visibility and reliable dispatch. Innexar Field helps KY cleaning companies grow with confidence.",
    cities: [
      { name: "Louisville", slug: "louisville" },
      { name: "Lexington", slug: "lexington" },
      { name: "Bowling Green", slug: "bowling-green" },
    ],
  },
  {
    name: "Utah",
    slug: "utah",
    abbreviation: "UT",
    tier: 4,
    marketContext: "Utah's family-heavy suburbs and tech-driven growth create dense recurring residential routes. Provo and Salt Lake operators scale quickly — operations software becomes the bottleneck.",
    intro: "Utah's fast-growing suburbs demand operations software that keeps pace. Innexar Field helps UT cleaning operators dispatch crews and invoice without admin bottlenecks.",
    cities: [
      { name: "Salt Lake City", slug: "salt-lake-city" },
      { name: "Provo", slug: "provo" },
      { name: "Sandy", slug: "sandy" },
      { name: "West Jordan", slug: "west-jordan" },
    ],
  },
];

export const LOCAL_SEO_STATES: StateEntry[] = [...TIER_1_STATES, ...TIER_2_4_STATES];

export function getStateBySlug(slug: string): StateEntry | undefined {
  return LOCAL_SEO_STATES.find((s) => s.slug === slug);
}

export function getCityBySlug(stateSlug: string, citySlug: string): CityEntry | undefined {
  const state = getStateBySlug(stateSlug);
  return state?.cities.find((c) => c.slug === citySlug);
}

export function getStatesByTier(tier: SeoTier): StateEntry[] {
  return LOCAL_SEO_STATES.filter((s) => s.tier === tier);
}

export function getTier1States(): StateEntry[] {
  return LOCAL_SEO_STATES.filter((s) => s.tier === 1);
}

export function getAllCityRoutes(): { state: string; city: string }[] {
  return LOCAL_SEO_STATES.flatMap((state) =>
    state.cities.map((c) => ({ state: state.slug, city: c.slug })),
  );
}
