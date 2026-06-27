#!/usr/bin/env node
/**
 * Appends Tier 2–4 states to lib/local-seo-data.ts
 * Run: node scripts/generate-local-seo-data.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const STATES = {
  "north-carolina": { name: "North Carolina", abbreviation: "NC", tier: 2 },
  "south-carolina": { name: "South Carolina", abbreviation: "SC", tier: 2 },
  "new-jersey": { name: "New Jersey", abbreviation: "NJ", tier: 2 },
  virginia: { name: "Virginia", abbreviation: "VA", tier: 2 },
  maryland: { name: "Maryland", abbreviation: "MD", tier: 2 },
  arizona: { name: "Arizona", abbreviation: "AZ", tier: 2 },
  tennessee: { name: "Tennessee", abbreviation: "TN", tier: 2 },
  washington: { name: "Washington", abbreviation: "WA", tier: 3 },
  colorado: { name: "Colorado", abbreviation: "CO", tier: 3 },
  pennsylvania: { name: "Pennsylvania", abbreviation: "PA", tier: 3 },
  illinois: { name: "Illinois", abbreviation: "IL", tier: 3 },
  nevada: { name: "Nevada", abbreviation: "NV", tier: 3 },
  massachusetts: { name: "Massachusetts", abbreviation: "MA", tier: 3 },
  ohio: { name: "Ohio", abbreviation: "OH", tier: 3 },
  michigan: { name: "Michigan", abbreviation: "MI", tier: 3 },
  minnesota: { name: "Minnesota", abbreviation: "MN", tier: 3 },
  oregon: { name: "Oregon", abbreviation: "OR", tier: 3 },
  indiana: { name: "Indiana", abbreviation: "IN", tier: 4 },
  missouri: { name: "Missouri", abbreviation: "MO", tier: 4 },
  wisconsin: { name: "Wisconsin", abbreviation: "WI", tier: 4 },
  alabama: { name: "Alabama", abbreviation: "AL", tier: 4 },
  louisiana: { name: "Louisiana", abbreviation: "LA", tier: 4 },
  oklahoma: { name: "Oklahoma", abbreviation: "OK", tier: 4 },
  kentucky: { name: "Kentucky", abbreviation: "KY", tier: 4 },
  utah: { name: "Utah", abbreviation: "UT", tier: 4 },
};

const CITIES_BY_STATE = {
  "north-carolina": ["Charlotte", "Raleigh", "Durham", "Cary", "Greensboro", "Winston-Salem", "Asheville", "Wilmington", "Concord", "Chapel Hill"],
  "south-carolina": ["Charleston", "Columbia", "Greenville", "Myrtle Beach", "Rock Hill", "Hilton Head"],
  "new-jersey": ["Newark", "Jersey City", "Hoboken", "Elizabeth", "Edison", "Princeton", "Cherry Hill", "Clifton", "Paterson", "Morristown", "Paramus"],
  virginia: ["Virginia Beach", "Richmond", "Arlington", "Alexandria", "Fairfax", "Norfolk", "Chesapeake"],
  maryland: ["Baltimore", "Rockville", "Bethesda", "Columbia", "Silver Spring", "Frederick"],
  arizona: ["Phoenix", "Scottsdale", "Mesa", "Chandler", "Gilbert", "Tempe", "Peoria", "Glendale"],
  tennessee: ["Nashville", "Franklin", "Brentwood", "Knoxville", "Chattanooga", "Memphis"],
  washington: ["Seattle", "Bellevue", "Tacoma", "Redmond", "Kirkland", "Spokane"],
  colorado: ["Denver", "Aurora", "Boulder", "Fort Collins", "Colorado Springs"],
  pennsylvania: ["Philadelphia", "Pittsburgh", "Allentown", "Reading", "Lancaster", "Harrisburg"],
  illinois: ["Chicago", "Naperville", "Schaumburg", "Evanston", "Aurora", "Rockford"],
  nevada: ["Las Vegas", "Henderson", "Summerlin", "North Las Vegas", "Reno"],
  massachusetts: ["Boston", "Cambridge", "Quincy", "Worcester", "Newton", "Brookline"],
  ohio: ["Columbus", "Cleveland", "Cincinnati", "Dublin", "Toledo", "Dayton"],
  michigan: ["Detroit", "Ann Arbor", "Grand Rapids", "Lansing", "Troy"],
  minnesota: ["Minneapolis", "St. Paul", "Bloomington", "Rochester"],
  oregon: ["Portland", "Beaverton", "Hillsboro", "Eugene", "Salem"],
  indiana: ["Indianapolis", "Carmel", "Fishers", "Fort Wayne"],
  missouri: ["St. Louis", "Kansas City", "Springfield", "Columbia"],
  wisconsin: ["Milwaukee", "Madison", "Green Bay", "Kenosha"],
  alabama: ["Birmingham", "Huntsville", "Montgomery", "Mobile"],
  louisiana: ["New Orleans", "Baton Rouge", "Lafayette", "Metairie"],
  oklahoma: ["Oklahoma City", "Tulsa", "Norman"],
  kentucky: ["Louisville", "Lexington", "Bowling Green"],
  utah: ["Salt Lake City", "Provo", "Sandy", "West Jordan"],
};

const STATE_MARKET_CONTEXT = {
  "north-carolina": "North Carolina's Research Triangle and Charlotte corridor drive rapid residential growth — cleaning companies scale from solo operators to multi-crew teams faster than back-office systems can keep up.",
  "south-carolina": "South Carolina blends coastal tourism turnovers with fast-growing inland suburbs. Owners in Charleston, Columbia, and Greenville juggle seasonal demand spikes and year-round recurring routes.",
  "new-jersey": "New Jersey operators serve dense urban routes and affluent suburbs across the NYC and Philadelphia metros. Commercial contracts and recurring residential work demand tight dispatch and reliable invoicing.",
  "virginia": "Virginia's mix of DC-adjacent commercial accounts and Hampton Roads residential routes creates scheduling complexity. Multi-property clients and government-adjacent compliance expectations raise the bar for operations software.",
  maryland: "Maryland cleaning companies navigate Baltimore urban density and DC-suburb affluence. Crew coordination across counties and reliable cash flow from invoicing are top owner priorities.",
  arizona: "Arizona's heat, snowbird season, and explosive suburban growth keep cleaning demand high in Phoenix and Tucson metros. Route density and crew retention matter as much as pricing.",
  tennessee: "Tennessee's Nashville boom and Memphis commercial base create diverse field service needs. Music City operators scale fast — often before dispatch and job costing catch up.",
  washington: "Washington operators balance Seattle tech-corridor affluence with seasonal weather delays. Clients expect digital self-service; margins depend on efficient routing across spread-out metros.",
  colorado: "Colorado's mountain-town tourism and Front Range growth create mixed residential and short-term-rental demand. Altitude, weather, and long drive times make dispatch visibility critical.",
  pennsylvania: "Pennsylvania spans Philadelphia density, Pittsburgh industry, and growing Lehigh Valley suburbs. Cleaning companies need software that handles both urban routes and multi-site commercial contracts.",
  illinois: "Illinois field service teams — especially in Chicagoland — face harsh winters, dense routes, and demanding commercial clients. Cash flow and crew visibility separate growing operators from stagnant ones.",
  nevada: "Nevada's Las Vegas tourism economy and Reno growth corridor mean high turnover cleans alongside steady residential routes. Scheduling spikes around conventions and events need flexible crew capacity.",
  massachusetts: "Massachusetts operators serve Boston's dense urban market and affluent suburbs. High labor costs make job costing essential — busy weeks must actually be profitable.",
  ohio: "Ohio's Columbus growth, Cleveland commercial base, and Cincinnati suburbs create varied cleaning demand. Multi-crew dispatch and QuickBooks-ready invoicing help owners scale past spreadsheet limits.",
  michigan: "Michigan operators navigate Detroit commercial contracts, Ann Arbor residential affluence, and seasonal weather impacts. Unified scheduling and mobile checklists reduce quality variance across crews.",
  minnesota: "Minnesota's Twin Cities metro and Rochester medical corridor demand reliable recurring service. Winter weather buffers and summer peak seasons require capacity planning in software, not guesswork.",
  oregon: "Oregon cleaning companies serve Portland's eco-conscious residential market and growing suburban corridors. Clients value online booking and consistent quality across rotating crews.",
  indiana: "Indiana's Indianapolis suburbs and Fort Wayne growth create opportunities for multi-crew cleaning companies — if operations software keeps pace with hiring.",
  missouri: "Missouri spans St. Louis and Kansas City metros with distinct route patterns. Owners scaling past eight crews need dispatch boards and job costing, not group texts.",
  wisconsin: "Wisconsin operators face Milwaukee urban density and Madison's steady residential demand. Cold-season scheduling shifts and commercial accounts need flexible recurring job rules.",
  alabama: "Alabama's Birmingham and Huntsville growth corridors attract new residential cleaning demand. Labor turnover makes mobile checklists and documented QC essential.",
  louisiana: "Louisiana operators handle New Orleans tourism turnovers, Baton Rouge commercial accounts, and hurricane-season reschedules. Reliable dispatch and client communication protect revenue.",
  oklahoma: "Oklahoma City and Tulsa operators grow through referrals and commercial contracts. Spreadsheet ceilings hit fast when crews multiply across sprawling metros.",
  kentucky: "Kentucky's Louisville and Lexington markets blend horse-country estates with urban residential routes. Consistent quoting and margin visibility help owners price premium service correctly.",
  utah: "Utah's family-heavy suburbs and tech-driven growth create dense recurring residential routes. Provo and Salt Lake operators scale quickly — operations software becomes the bottleneck.",
};

const STATE_INTROS = {
  "north-carolina": "North Carolina cleaning and field service companies deserve software built for growth markets. Innexar Field helps NC operators dispatch crews, protect margins, and invoice faster across the Triangle, Charlotte, and beyond.",
  "south-carolina": "From Charleston coast to Upstate growth corridors, South Carolina cleaning companies need connected scheduling and billing. Innexar Field replaces group-text dispatch with one platform for SC field teams.",
  "new-jersey": "New Jersey's competitive cleaning market demands professional operations. Innexar Field gives NJ operators scheduling, crew mobile apps, invoicing, and job costing in one US-hosted platform.",
  virginia: "Virginia field service businesses need visibility across sprawling metros and multi-site commercial accounts. Innexar Field unifies dispatch, recurring jobs, and client portals for VA operators.",
  maryland: "Maryland cleaning companies scale best with software that matches their ambition. Innexar Field helps MD teams run profitable routes from Baltimore to the DC suburbs.",
  arizona: "Arizona cleaning operators face heat, seasonality, and suburban sprawl. Innexar Field connects scheduling, dispatch, invoicing, and margins for AZ field service teams.",
  tennessee: "Tennessee's booming metros need operations software that keeps up. Innexar Field helps TN cleaning companies replace chaotic dispatch and late invoices with one connected workflow.",
  washington: "Washington field service teams compete on reliability and digital experience. Innexar Field gives WA operators dispatch boards, mobile checklists, and client self-service.",
  colorado: "Colorado cleaning businesses navigate weather, tourism, and Front Range growth. Innexar Field helps CO operators schedule smarter and invoice the same day jobs complete.",
  pennsylvania: "Pennsylvania cleaning companies span urban density and suburban sprawl. Innexar Field unifies crews, schedules, and billing for PA field service operators.",
  illinois: "Illinois operators — especially in Chicagoland — need software that survives winter reschedules and dense routes. Innexar Field delivers dispatch, job costing, and QuickBooks-ready invoicing.",
  nevada: "Nevada cleaning companies ride tourism peaks and steady residential demand. Innexar Field helps NV operators manage crew capacity and cash flow in one platform.",
  massachusetts: "Massachusetts field service businesses face high expectations and tight margins. Innexar Field connects scheduling, crew management, and job costing for MA operators.",
  ohio: "Ohio cleaning companies grow through referrals — until spreadsheets break. Innexar Field gives OH operators one system for dispatch, recurring routes, and invoicing.",
  michigan: "Michigan field service teams need software built for weather, commercial contracts, and multi-crew scale. Innexar Field delivers for operators across Detroit, Ann Arbor, and Grand Rapids.",
  minnesota: "Minnesota cleaning operators plan around seasons and dense Twin Cities routes. Innexar Field helps MN teams dispatch confidently and protect margins per job.",
  oregon: "Oregon cleaning companies win on consistency and eco-conscious service. Innexar Field helps OR operators standardize quality with mobile checklists and recurring job automation.",
  indiana: "Indiana field service businesses scaling past solo-operator limits need real dispatch and job costing. Innexar Field helps IN operators grow without operational chaos.",
  missouri: "Missouri cleaning companies across St. Louis and Kansas City need connected operations. Innexar Field replaces fragmented tools with scheduling, dispatch, and invoicing.",
  wisconsin: "Wisconsin operators deserve software that handles seasonal shifts and multi-crew growth. Innexar Field helps WI cleaning teams run profitable routes year-round.",
  alabama: "Alabama cleaning companies growing in Birmingham and Huntsville need operations that scale. Innexar Field delivers dispatch, checklists, and invoicing for AL field teams.",
  louisiana: "Louisiana field service operators navigate tourism, weather, and commercial contracts. Innexar Field helps LA teams stay organized through peak seasons and reschedules.",
  oklahoma: "Oklahoma cleaning businesses scaling in OKC and Tulsa need software past the spreadsheet ceiling. Innexar Field connects crews, schedules, and billing in one platform.",
  kentucky: "Kentucky operators in Louisville and Lexington need margin visibility and reliable dispatch. Innexar Field helps KY cleaning companies grow with confidence.",
  utah: "Utah's fast-growing suburbs demand operations software that keeps pace. Innexar Field helps UT cleaning operators dispatch crews and invoice without admin bottlenecks.",
};

function cityToSlug(name) {
  return name
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/'/g, "")
    .replace(/\s+/g, "-");
}

function city(name) {
  return `{ name: ${JSON.stringify(name)}, slug: ${JSON.stringify(cityToSlug(name))} }`;
}

const tierStates = Object.entries(CITIES_BY_STATE).map(([slug, cities]) => {
  const meta = STATES[slug];
  const citiesTs = cities.map((c) => `      ${city(c)},`).join("\n");
  return `  {
    name: ${JSON.stringify(meta.name)},
    slug: ${JSON.stringify(slug)},
    abbreviation: ${JSON.stringify(meta.abbreviation)},
    tier: ${meta.tier},
    marketContext: ${JSON.stringify(STATE_MARKET_CONTEXT[slug])},
    intro: ${JSON.stringify(STATE_INTROS[slug])},
    cities: [
${citiesTs}
    ],
  },`;
});

const cityCount = Object.values(CITIES_BY_STATE).reduce((n, c) => n + c.length, 0);

const dataPath = join(__dirname, "../lib/local-seo-data.ts");
let source = readFileSync(dataPath, "utf8");

const tierBlock = `const TIER_2_4_STATES: StateEntry[] = [\n${tierStates.join("\n")}\n];`;

if (source.includes("TIER_2_4_STATES")) {
  source = source.replace(
    /const TIER_2_4_STATES: StateEntry\[\] = \[[\s\S]*?\];/,
    tierBlock,
  );
} else {
  source = source.replace(
    "export const LOCAL_SEO_STATES: StateEntry[] = TIER_1_STATES;",
    `${tierBlock}\n\nexport const LOCAL_SEO_STATES: StateEntry[] = [...TIER_1_STATES, ...TIER_2_4_STATES];`,
  );
}

if (!source.includes("getStatesByTier")) {
  source = source.replace(
    "export function getTier1States(): StateEntry[] {",
    `export function getStatesByTier(tier: SeoTier): StateEntry[] {
  return LOCAL_SEO_STATES.filter((s) => s.tier === tier);
}

export function getTier1States(): StateEntry[] {`,
  );
}

writeFileSync(dataPath, source, "utf8");
console.log(`Updated ${dataPath} with ${cityCount} cities across ${Object.keys(STATES).length} Tier 2–4 states`);
