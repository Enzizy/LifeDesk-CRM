// Google Places API (New) adapter — enrichment only.
//
// Discovery stays on Geoapify (free, broad). This module runs once per
// approved candidate to fetch the contact details Google holds from the
// business's own profile. Requesting phone or website makes the call an
// Enterprise-tier SKU: 1,000 free per month, then $35 per 1,000. Keep it to
// one call per approval and never call it in a loop over search results.

const TEXT_SEARCH_ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

// Every field requested is billed at the highest tier it belongs to, so this
// mask is the cost ceiling. Add fields deliberately.
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.rating",
  "places.userRatingCount",
  "places.businessStatus",
  "places.primaryTypeDisplayName",
].join(",");

export const GOOGLE_PROVIDER = "google_places";

export type GoogleEnrichment = {
  placeId: string;
  matchedName: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  mapsUri: string | null;
  rating: number | null;
  ratingCount: number | null;
  businessStatus: string | null;
  primaryType: string | null;
  enrichedAt: string;
};

export class GooglePlacesError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GooglePlacesError";
    this.status = status;
  }
}

type TextSearchPlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  primaryTypeDisplayName?: { text?: string };
};

const tokens = (value: string) =>
  new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2),
  );

/**
 * Text search returns the closest thing Google can find, which for a vague
 * name can be a different business entirely. Require that the returned name
 * shares at least one meaningful word with what we asked for, so a bad match
 * is rejected rather than silently attached to the wrong prospect.
 */
export function namesPlausiblyMatch(requested: string, returned: string): boolean {
  const a = tokens(requested);
  const b = tokens(returned);
  if (!a.size || !b.size) return false;
  for (const token of a) if (b.has(token)) return true;
  return false;
}

export async function enrichBusiness(
  business: { name: string; location: string; lat: number | null; lon: number | null },
  apiKey: string,
): Promise<GoogleEnrichment | null> {
  const body: Record<string, unknown> = {
    textQuery: business.location ? `${business.name}, ${business.location}` : business.name,
    maxResultCount: 1,
  };
  // Bias toward where Geoapify placed it, so a chain with many branches
  // resolves to the branch we actually found.
  if (business.lat !== null && business.lon !== null) {
    body.locationBias = {
      circle: { center: { latitude: business.lat, longitude: business.lon }, radius: 2_000 },
    };
  }

  let response: Response;
  try {
    response = await fetch(TEXT_SEARCH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new GooglePlacesError("Could not reach Google Places", 502);
  }

  if (response.status === 403 || response.status === 401) {
    throw new GooglePlacesError("The Google Places key was rejected or is not enabled for Places API (New)", 502);
  }
  if (response.status === 429) {
    throw new GooglePlacesError("Google Places quota exhausted for now", 429);
  }
  if (!response.ok) {
    throw new GooglePlacesError(`Google Places rejected the request (HTTP ${response.status})`, 502);
  }

  const payload = (await response.json()) as { places?: TextSearchPlace[] };
  const place = payload.places?.[0];
  if (!place?.id) return null;

  const matchedName = place.displayName?.text ?? "";
  if (!namesPlausiblyMatch(business.name, matchedName)) return null;

  return {
    placeId: place.id,
    matchedName,
    address: place.formattedAddress ?? null,
    phone: place.nationalPhoneNumber ?? place.internationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
    mapsUri: place.googleMapsUri ?? null,
    rating: typeof place.rating === "number" ? place.rating : null,
    ratingCount: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
    businessStatus: place.businessStatus ?? null,
    primaryType: place.primaryTypeDisplayName?.text ?? null,
    enrichedAt: new Date().toISOString(),
  };
}
