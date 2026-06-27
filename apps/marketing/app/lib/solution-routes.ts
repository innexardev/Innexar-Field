import {
  getCityBySlug,
  getStateBySlug,
  getTier1States,
  LOCAL_SEO_STATES,
  type CityEntry,
  type StateEntry,
} from "../../lib/local-seo-data";
import { CITY_PROBLEM_PAGES, type CityProblemPage } from "./city-problems";

export function solutionsHubPath(): string {
  return "/solutions";
}

export function stateHubPath(stateSlug: string): string {
  return `/solutions/${stateSlug}`;
}

export function cityPagePath(stateSlug: string, citySlug: string): string {
  return `/solutions/${stateSlug}/${citySlug}`;
}

export function cityProblemPagePath(
  stateSlug: string,
  citySlug: string,
  problemSlug: string,
): string {
  return `/solutions/${stateSlug}/${citySlug}/${problemSlug}`;
}

export function nationalProblemPath(problemSlug: string): string {
  return `/solutions/${problemSlug}`;
}

export function isStateSlug(slug: string): boolean {
  return getStateBySlug(slug) != null;
}

export type LocalPageRoute = {
  stateSlug: string;
  stateName: string;
  stateAbbr: string;
  citySlug: string;
  cityName: string;
  path: string;
};

export function getAllLocalPageRoutes(): LocalPageRoute[] {
  return LOCAL_SEO_STATES.flatMap((state) =>
    state.cities.map((city) => ({
      stateSlug: state.slug,
      stateName: state.name,
      stateAbbr: state.abbreviation,
      citySlug: city.slug,
      cityName: city.name,
      path: cityPagePath(state.slug, city.slug),
    })),
  );
}

export function getLocalPageRoute(
  stateSlug: string,
  citySlug: string,
): LocalPageRoute | undefined {
  const state = getStateBySlug(stateSlug);
  const city = getCityBySlug(stateSlug, citySlug);
  if (!state || !city) return undefined;

  return {
    stateSlug: state.slug,
    stateName: state.name,
    stateAbbr: state.abbreviation,
    citySlug: city.slug,
    cityName: city.name,
    path: cityPagePath(state.slug, city.slug),
  };
}

export function getSiblingCities(
  stateSlug: string,
  citySlug: string,
  count = 3,
): { city: CityEntry; path: string }[] {
  const state = getStateBySlug(stateSlug);
  if (!state) return [];

  const index = state.cities.findIndex((entry) => entry.slug === citySlug);
  if (index < 0) return [];

  const siblings: { city: CityEntry; path: string }[] = [];
  for (let offset = 1; offset <= state.cities.length && siblings.length < count; offset++) {
    const candidate = state.cities[(index + offset) % state.cities.length];
    if (candidate.slug === citySlug) continue;
    siblings.push({
      city: candidate,
      path: cityPagePath(state.slug, candidate.slug),
    });
  }
  return siblings;
}

export function getAllCityProblemRoutes(): {
  stateSlug: string;
  citySlug: string;
  problemSlug: string;
  path: string;
}[] {
  return getAllLocalPageRoutes().flatMap((page) =>
    CITY_PROBLEM_PAGES.map((problem) => ({
      stateSlug: page.stateSlug,
      citySlug: page.citySlug,
      problemSlug: problem.slug,
      path: cityProblemPagePath(page.stateSlug, page.citySlug, problem.slug),
    })),
  );
}

export function getCityProblemRoute(
  stateSlug: string,
  citySlug: string,
  problemSlug: string,
): (LocalPageRoute & { problem: CityProblemPage }) | undefined {
  const page = getLocalPageRoute(stateSlug, citySlug);
  const problem = CITY_PROBLEM_PAGES.find((entry) => entry.slug === problemSlug);
  if (!page || !problem) return undefined;
  return { ...page, problem };
}

export function getTier1StateHubs(): StateEntry[] {
  return getTier1States();
}
