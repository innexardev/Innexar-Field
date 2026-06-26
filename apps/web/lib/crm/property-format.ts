import type { Property } from "@fieldforge/sdk";

export function formatPropertyAddress(p: Pick<Property, "street" | "city" | "state" | "zip">, noAddress: string) {
  const parts = [p.street, p.city, p.state, p.zip].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : noAddress;
}

export function formatPropertyBedsBaths(
  p: Pick<Property, "bedrooms" | "bathrooms">,
  t: (key: "propertyBedsBaths", values: { beds: number; baths: number }) => string,
) {
  const beds = p.bedrooms ?? 0;
  const baths = p.bathrooms ?? 0;
  if (beds === 0 && baths === 0) return "";
  return t("propertyBedsBaths", { beds, baths });
}

export function formatPropertyOptionLabel(
  p: Property,
  t: (key: "noAddress" | "propertyBedsBaths", values?: { beds: number; baths: number }) => string,
) {
  const noAddress = t("noAddress");
  const address = formatPropertyAddress(p, noAddress);
  const location = [p.label, address !== noAddress ? address : ""].filter(Boolean).join(" — ");
  const bedsBaths = formatPropertyBedsBaths(p, (key, values) => t(key, values));
  return bedsBaths ? `${location} · ${bedsBaths}` : location;
}

export function propertyHasRoomCounts(p: Pick<Property, "bedrooms" | "bathrooms">) {
  const beds = p.bedrooms ?? 0;
  const baths = p.bathrooms ?? 0;
  return beds > 0 && baths > 0;
}
