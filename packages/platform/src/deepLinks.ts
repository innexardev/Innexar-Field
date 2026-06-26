export type DeepLinkRoute = {
  path: string;
  params: Record<string, string>;
  jobId?: string;
};

export type DeepLinkConfig = {
  host: string;
  pathPrefix?: string;
  jobsPath?: string;
};

export const MOBILE_PATH_PREFIX = "/m";
export const JOBS_DEEP_LINK_PATH = "/m/jobs";

function resolvePathname(parsed: URL, config: DeepLinkConfig): string | null {
  const prefix = config.pathPrefix ?? MOBILE_PATH_PREFIX;

  if (parsed.protocol === "https:" || parsed.protocol === "http:") {
    if (parsed.host !== config.host) return null;
    return parsed.pathname;
  }

  if (parsed.host === config.host) {
    return parsed.pathname.startsWith("/") ? parsed.pathname : `/${parsed.pathname}`;
  }

  return `/${parsed.host}${parsed.pathname}`.replace(/\/+/g, "/");
}

/** Extract job id from /m/jobs/:id paths. */
export function parseJobIdFromPath(pathname: string, jobsPath = JOBS_DEEP_LINK_PATH): string | null {
  const prefix = jobsPath.endsWith("/") ? jobsPath.slice(0, -1) : jobsPath;
  const pattern = new RegExp(`^${prefix.replace(/\//g, "\\/")}/([^/?#]+)$`);
  const match = pathname.match(pattern);
  return match?.[1] ?? null;
}

/** Build a universal link to a job detail screen. */
export function buildJobDeepLink(host: string, jobId: string, jobsPath = JOBS_DEEP_LINK_PATH): string {
  const prefix = jobsPath.endsWith("/") ? jobsPath.slice(0, -1) : jobsPath;
  return `https://${host}${prefix}/${jobId}`;
}

/** Parse a deep-link or universal-link URL into an in-app route. */
export function parseDeepLink(url: string, config: DeepLinkConfig): DeepLinkRoute | null {
  try {
    const parsed = new URL(url);
    const pathname = resolvePathname(parsed, config);
    if (!pathname) return null;

    const prefix = config.pathPrefix ?? MOBILE_PATH_PREFIX;
    if (!pathname.startsWith(prefix)) return null;

    const params = Object.fromEntries(parsed.searchParams.entries());
    const jobsPath = config.jobsPath ?? JOBS_DEEP_LINK_PATH;
    const jobId = parseJobIdFromPath(pathname, jobsPath) ?? undefined;

    return { path: pathname, params, ...(jobId ? { jobId } : {}) };
  } catch {
    return null;
  }
}

/** Parse a job deep link (/m/jobs/:id) from a URL. */
export function parseJobDeepLink(url: string, config: DeepLinkConfig): DeepLinkRoute | null {
  const route = parseDeepLink(url, config);
  if (!route?.jobId) return null;
  return route;
}

/** Match an in-app path against the configured deep-link prefix. */
export function matchDeepLinkPath(pathname: string, pathPrefix = MOBILE_PATH_PREFIX): boolean {
  return pathname === pathPrefix || pathname.startsWith(`${pathPrefix}/`);
}

/** True when route targets the jobs list or a job detail screen. */
export function isJobsDeepLink(route: DeepLinkRoute, jobsPath = JOBS_DEEP_LINK_PATH): boolean {
  const prefix = jobsPath.endsWith("/") ? jobsPath.slice(0, -1) : jobsPath;
  return route.path === prefix || route.path.startsWith(`${prefix}/`);
}
