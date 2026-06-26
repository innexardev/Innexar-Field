import type { FieldForgeClient, Job, Property } from "@fieldforge/sdk";

export type DirectionsDestination =
  | { address: string }
  | { lat: number; lng: number };

const DIRECTIONS_BASE = "https://www.google.com/maps/dir/?api=1";

/** Google Maps directions deep link (no API key). */
export function buildDirectionsUrl(destination: DirectionsDestination): string {
  if ("lat" in destination && "lng" in destination) {
    const { lat, lng } = destination;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";
    return `${DIRECTIONS_BASE}&destination=${lat},${lng}`;
  }

  const address = destination.address.trim();
  if (!address) return "";
  return `${DIRECTIONS_BASE}&destination=${encodeURIComponent(address)}`;
}

export function formatPropertyAddress(
  property: Pick<Property, "street" | "city" | "state" | "zip">,
): string {
  return [property.street, property.city, property.state, property.zip].filter(Boolean).join(", ");
}

export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/** Prefer customer primary property; fall back to job title as map search query. */
export async function resolveJobDirectionsUrl(
  client: FieldForgeClient,
  job: Pick<Job, "title" | "customer_id">,
): Promise<string> {
  if (job.customer_id) {
    try {
      const res = await client.listCustomerProperties(job.customer_id);
      const properties = res.data ?? [];
      const primary = properties.find((p) => p.is_primary) ?? properties[0];
      if (primary) {
        const address = formatPropertyAddress(primary);
        if (address) return buildDirectionsUrl({ address });
      }
    } catch {
      // fall through to title
    }
  }
  return buildDirectionsUrl({ address: job.title });
}
