// Geoapify provider adapter.
//
// LifeDesk uses Geoapify's Places and Geocoding APIs only. No map tiles are
// rendered, so the spatial desk UI is unaffected. The free tier allows 3,000
// credits per day without a card; every call here counts against it, so the
// caller is responsible for enforcing result limits before invoking these.

export const GEOAPIFY_PROVIDER = "geoapify";

const PLACES_ENDPOINT = "https://api.geoapify.com/v2/places";
const GEOCODE_ENDPOINT = "https://api.geoapify.com/v1/geocode/search";

/**
 * Geoapify category IDs relevant to a freelance web developer or social media
 * manager: local businesses that need a web presence, from beach resorts to
 * dental clinics. Every entry was validated against the live Places API on
 * 2026-09-11 (Geoapify names an unsupported category in its 400 response, so
 * an invalid entry here fails loudly rather than silently). Acting as an
 * allowlist keeps model-suggested categories from reaching the provider
 * verbatim. Parent categories such as `catering` are valid queries in their
 * own right and act as safe fallbacks. Geoapify accepts at most 100 per call.
 */
export const ALLOWED_CATEGORIES = [
  "accommodation",
  "accommodation.apartment",
  "accommodation.chalet",
  "accommodation.guest_house",
  "accommodation.hostel",
  "accommodation.hotel",
  "accommodation.hut",
  "accommodation.motel",
  "activity",
  "activity.community_center",
  "activity.sport_club",
  "beach",
  "beach.beach_resort",
  "catering",
  "catering.bar",
  "catering.cafe",
  "catering.fast_food",
  "catering.food_court",
  "catering.ice_cream",
  "catering.pub",
  "catering.restaurant",
  "childcare",
  "childcare.kindergarten",
  "commercial",
  "commercial.antiques",
  "commercial.art",
  "commercial.baby_goods",
  "commercial.bag",
  "commercial.books",
  "commercial.chemist",
  "commercial.clothing",
  "commercial.convenience",
  "commercial.department_store",
  "commercial.florist",
  "commercial.food_and_drink",
  "commercial.furniture_and_interior",
  "commercial.garden",
  "commercial.gift_and_souvenir",
  "commercial.health_and_beauty",
  "commercial.hobby",
  "commercial.houseware_and_hardware",
  "commercial.jewelry",
  "commercial.marketplace",
  "commercial.outdoor_and_sport",
  "commercial.pet",
  "commercial.second_hand",
  "commercial.shopping_mall",
  "commercial.supermarket",
  "commercial.toy_and_game",
  "commercial.vehicle",
  "commercial.watches",
  "commercial.wedding",
  "education",
  "education.college",
  "education.driving_school",
  "education.language_school",
  "education.music_school",
  "education.school",
  "education.university",
  "entertainment",
  "entertainment.activity_park",
  "entertainment.amusement_arcade",
  "entertainment.aquarium",
  "entertainment.bowling_alley",
  "entertainment.cinema",
  "entertainment.culture",
  "entertainment.escape_game",
  "entertainment.miniature_golf",
  "entertainment.museum",
  "entertainment.theme_park",
  "entertainment.water_park",
  "entertainment.zoo",
  "healthcare",
  "healthcare.clinic_or_praxis",
  "healthcare.dentist",
  "healthcare.hospital",
  "healthcare.pharmacy",
  "leisure",
  "leisure.park",
  "leisure.spa",
  "office",
  "office.accountant",
  "office.advertising_agency",
  "office.architect",
  "office.association",
  "office.charity",
  "office.company",
  "office.consulting",
  "office.coworking",
  "office.employment_agency",
  "office.estate_agent",
  "office.financial",
  "office.insurance",
  "office.it",
  "office.lawyer",
  "office.notary",
  "office.tax_advisor",
  "office.travel_agent",
  "pet",
  "pet.service",
  "pet.shop",
  "pet.veterinary",
  "rental",
  "rental.bicycle",
  "rental.boat",
  "rental.car",
  "rental.storage",
  "service",
  "service.beauty",
  "service.beauty.hairdresser",
  "service.beauty.massage",
  "service.beauty.spa",
  "service.cleaning",
  "service.cleaning.dry_cleaning",
  "service.cleaning.laundry",
  "service.estate_agent",
  "service.financial",
  "service.funeral_directors",
  "service.locksmith",
  "service.tailor",
  "service.taxi",
  "service.travel_agency",
  "service.vehicle",
  "service.vehicle.car_wash",
  "sport",
  "sport.fitness",
  "sport.fitness.fitness_centre",
  "sport.horse_riding",
  "sport.sports_centre",
  "sport.swimming_pool",
  "tourism",
  "tourism.attraction",
  "tourism.sights",
] as const;

export type AllowedCategory = (typeof ALLOWED_CATEGORIES)[number];

const allowedCategorySet = new Set<string>(ALLOWED_CATEGORIES);

export const DEFAULT_CATEGORIES: AllowedCategory[] = [
  "catering.restaurant",
  "service.beauty",
  "sport.fitness",
];

export const MAX_RESULT_LIMIT = 25;
export const DEFAULT_RESULT_LIMIT = 5;
export const DEFAULT_RADIUS_METERS = 5_000;
export const MAX_RADIUS_METERS = 50_000;

export type DiscoveryFilters = {
  location: string;
  categories: AllowedCategory[];
  radiusMeters: number;
  limit: number;
  nameContains?: string;
};

export class GeoapifyError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GeoapifyError";
    this.status = status;
  }
}

/** Drops any category the model invented, preserving order and de-duplicating. */
export function sanitizeCategories(value: unknown): AllowedCategory[] {
  if (!Array.isArray(value)) return [];
  const kept: AllowedCategory[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const normalized = entry.trim().toLowerCase();
    if (!allowedCategorySet.has(normalized)) continue;
    if (kept.includes(normalized as AllowedCategory)) continue;
    kept.push(normalized as AllowedCategory);
  }
  return kept;
}

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

/**
 * Normalizes an untrusted filter object (from the model or the browser) into
 * the exact shape the Places call needs. Never throws on bad input except for
 * a missing location, which has no safe default.
 */
export function sanitizeFilters(value: unknown): DiscoveryFilters {
  const source = (typeof value === "object" && value !== null ? value : {}) as
    Record<string, unknown>;

  const location = typeof source.location === "string" ? source.location.trim() : "";
  if (!location || location.length > 200) {
    throw new GeoapifyError("A location between 1 and 200 characters is required", 400);
  }

  const categories = sanitizeCategories(source.categories);
  const nameContains =
    typeof source.nameContains === "string" && source.nameContains.trim()
      ? source.nameContains.trim().slice(0, 100)
      : undefined;

  return {
    location,
    categories: categories.length ? categories : DEFAULT_CATEGORIES,
    radiusMeters: clampInteger(
      source.radiusMeters,
      DEFAULT_RADIUS_METERS,
      500,
      MAX_RADIUS_METERS,
    ),
    limit: clampInteger(source.limit, DEFAULT_RESULT_LIMIT, 1, MAX_RESULT_LIMIT),
    nameContains,
  };
}

async function callGeoapify(url: URL, label: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: "application/json" } });
  } catch {
    throw new GeoapifyError(`Could not reach Geoapify (${label})`, 502);
  }

  if (response.status === 401 || response.status === 403) {
    throw new GeoapifyError("The Geoapify API key was rejected", 502);
  }
  if (response.status === 429) {
    throw new GeoapifyError("The Geoapify daily free allowance is exhausted", 429);
  }
  if (!response.ok) {
    throw new GeoapifyError(
      `Geoapify rejected the ${label} request (HTTP ${response.status})`,
      502,
    );
  }

  try {
    return await response.json();
  } catch {
    throw new GeoapifyError(`Geoapify returned an unreadable ${label} response`, 502);
  }
}

export type GeocodedPlace = { lat: number; lon: number; formatted: string };

/** Turns free-text such as "Bukit Timah, Singapore" into a search centre. */
export async function geocodeLocation(
  location: string,
  apiKey: string,
): Promise<GeocodedPlace> {
  const url = new URL(GEOCODE_ENDPOINT);
  url.searchParams.set("text", location);
  url.searchParams.set("limit", "1");
  url.searchParams.set("format", "json");
  url.searchParams.set("apiKey", apiKey);

  const payload = await callGeoapify(url, "geocoding") as {
    results?: Array<{ lat?: unknown; lon?: unknown; formatted?: unknown }>;
  };

  const first = payload.results?.[0];
  const lat = Number(first?.lat);
  const lon = Number(first?.lon);
  if (!first || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new GeoapifyError(`No location matched "${location}"`, 422);
  }

  return {
    lat,
    lon,
    formatted: typeof first.formatted === "string" ? first.formatted : location,
  };
}

export const SOCIAL_NETWORKS = [
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "twitter",
  "linkedin",
] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];
export type Socials = Partial<Record<SocialNetwork, string>>;

export type GeoapifyCandidate = {
  providerPlaceId: string | null;
  name: string;
  category: string;
  location: string;
  phone: string | null;
  website: string | null;
  email: string | null;
  socials: Socials;
  lat: number | null;
  lon: number | null;
};

const SOCIAL_HOSTS: Record<SocialNetwork, RegExp> = {
  facebook: /(^|\.)(facebook\.com|fb\.com|fb\.me)$/i,
  instagram: /(^|\.)instagram\.com$/i,
  tiktok: /(^|\.)tiktok\.com$/i,
  youtube: /(^|\.)(youtube\.com|youtu\.be)$/i,
  twitter: /(^|\.)(twitter\.com|x\.com)$/i,
  linkedin: /(^|\.)linkedin\.com$/i,
};

/** Which network a URL belongs to, or null for an ordinary website. */
export function classifySocialUrl(url: string): SocialNetwork | null {
  try {
    const host = new URL(url.includes("://") ? url : `https://${url}`).hostname;
    for (const network of SOCIAL_NETWORKS) {
      if (SOCIAL_HOSTS[network].test(host)) return network;
    }
  } catch {
    // Not a URL; treat as a bare handle below.
  }
  return null;
}

/**
 * OSM stores socials as `contact:facebook` etc., holding either a full URL or a
 * bare handle. Many small businesses also list a Facebook page as their only
 * `website`; that is reclassified as a social so "no website" stays accurate.
 */
function readSocials(properties: PlaceFeature["properties"]): {
  socials: Socials;
  website: string | null;
} {
  const raw = properties?.datasource?.raw ?? {};
  const contact = properties?.contact ?? {};
  const socials: Socials = {};

  for (const network of SOCIAL_NETWORKS) {
    const value =
      readString(contact[network]) ??
      readString(raw[`contact:${network}`]) ??
      readString(raw[network]);
    if (!value) continue;
    socials[network] = value.includes("://") || value.includes(".")
      ? value
      : `https://${network === "twitter" ? "x" : network}.com/${value.replace(/^@/, "")}`;
  }

  let website = readContact(properties, "website", "url");
  if (website) {
    const network = classifySocialUrl(website);
    if (network) {
      socials[network] ??= website;
      website = null;
    }
  }

  return { socials, website };
}

type PlaceFeature = {
  properties?: Record<string, unknown> & {
    datasource?: { raw?: Record<string, unknown> };
    contact?: Record<string, unknown>;
  };
};

const readString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 500) : null;
};

/**
 * Geoapify surfaces contact details inconsistently: sometimes as a top-level
 * property, sometimes under `contact`, and sometimes only in the raw
 * OpenStreetMap tags. Check all three rather than assuming one shape.
 */
function readContact(
  properties: PlaceFeature["properties"],
  ...keys: string[]
): string | null {
  const raw = properties?.datasource?.raw ?? {};
  const contact = properties?.contact ?? {};
  for (const key of keys) {
    const found =
      readString(properties?.[key]) ??
      readString(contact[key]) ??
      readString(raw[key]) ??
      readString(raw[`contact:${key}`]);
    if (found) return found;
  }
  return null;
}

export function normalizePlace(feature: PlaceFeature): GeoapifyCandidate | null {
  const properties = feature.properties;
  if (!properties) return null;

  const name = readString(properties.name);
  if (!name) return null; // Unnamed POIs are not prospects.

  const categories = Array.isArray(properties.categories)
    ? properties.categories.filter((entry): entry is string => typeof entry === "string")
    : [];

  const { socials, website } = readSocials(properties);
  const lat = Number(properties.lat);
  const lon = Number(properties.lon);

  return {
    providerPlaceId: readString(properties.place_id),
    name: name.slice(0, 200),
    // Prefer the most specific category; Geoapify orders broad to narrow.
    category: categories.at(-1) ?? "",
    location:
      readString(properties.formatted) ??
      readString(properties.address_line2) ??
      "",
    phone: readContact(properties, "phone", "mobile"),
    website,
    email: readContact(properties, "email"),
    socials,
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
  };
}

export async function searchPlaces(
  filters: DiscoveryFilters,
  centre: GeocodedPlace,
  apiKey: string,
): Promise<GeoapifyCandidate[]> {
  const url = new URL(PLACES_ENDPOINT);
  url.searchParams.set("categories", filters.categories.join(","));
  url.searchParams.set(
    "filter",
    `circle:${centre.lon},${centre.lat},${filters.radiusMeters}`,
  );
  url.searchParams.set("bias", `proximity:${centre.lon},${centre.lat}`);
  // Over-fetch modestly so unnamed and duplicate places can be dropped while
  // still returning the requested count. One Places call costs one credit
  // regardless of limit.
  url.searchParams.set("limit", String(Math.min(MAX_RESULT_LIMIT * 2, filters.limit * 3)));
  if (filters.nameContains) url.searchParams.set("name", filters.nameContains);
  url.searchParams.set("apiKey", apiKey);

  const payload = await callGeoapify(url, "places") as { features?: unknown };
  const features = Array.isArray(payload.features) ? payload.features : [];

  const seen = new Set<string>();
  const candidates: GeoapifyCandidate[] = [];
  for (const feature of features) {
    const candidate = normalizePlace(feature as PlaceFeature);
    if (!candidate) continue;
    // Deduplicate within the run before the database's cross-run unique index
    // sees them, so a repeated place never consumes a result slot twice.
    const key = candidate.providerPlaceId ?? `${candidate.name}|${candidate.location}`;
    if (seen.has(key.toLowerCase())) continue;
    seen.add(key.toLowerCase());
    candidates.push(candidate);
    if (candidates.length >= filters.limit) break;
  }
  return candidates;
}
