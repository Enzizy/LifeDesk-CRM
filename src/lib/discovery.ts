// Browser-side catalogue of Geoapify categories for the filter editor, grouped
// so 100+ options stay scannable. The Edge Function in
// supabase/functions/_shared/geoapify.ts is the source of truth and re-validates
// every request, so a stale entry here can only ever narrow what the UI offers —
// it can never widen what is sent. Every id below was validated against the
// live Places API on 2026-09-11.

export type CategoryGroup = {
  label: string;
  /** Selecting the group header searches the parent category. */
  parent: string;
  items: { id: string; label: string }[];
};

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    label: "Tourism & stays",
    parent: "accommodation",
    items: [
      { id: "beach.beach_resort", label: "Beach resorts" },
      { id: "beach", label: "Beaches" },
      { id: "accommodation.hotel", label: "Hotels" },
      { id: "accommodation.guest_house", label: "Guest houses" },
      { id: "accommodation.hostel", label: "Hostels" },
      { id: "accommodation.apartment", label: "Serviced apartments" },
      { id: "accommodation.motel", label: "Motels" },
      { id: "accommodation.chalet", label: "Chalets & villas" },
      { id: "accommodation.hut", label: "Huts & cottages" },
      { id: "tourism.attraction", label: "Tourist attractions" },
      { id: "tourism.sights", label: "Sights & landmarks" },
      { id: "rental.boat", label: "Boat rentals" },
      { id: "rental.car", label: "Car rentals" },
      { id: "rental.bicycle", label: "Bike rentals" },
      { id: "service.travel_agency", label: "Travel agencies" },
      { id: "office.travel_agent", label: "Travel agents" },
    ],
  },
  {
    label: "Food & drink",
    parent: "catering",
    items: [
      { id: "catering.restaurant", label: "Restaurants" },
      { id: "catering.cafe", label: "Cafés" },
      { id: "catering.bar", label: "Bars" },
      { id: "catering.pub", label: "Pubs" },
      { id: "catering.fast_food", label: "Fast food" },
      { id: "catering.food_court", label: "Food courts" },
      { id: "catering.ice_cream", label: "Ice cream & desserts" },
      { id: "commercial.food_and_drink", label: "Food & drink shops" },
    ],
  },
  {
    label: "Beauty, wellness & fitness",
    parent: "service.beauty",
    items: [
      { id: "service.beauty.hairdresser", label: "Hair salons & barbers" },
      { id: "service.beauty.spa", label: "Spas" },
      { id: "service.beauty.massage", label: "Massage" },
      { id: "leisure.spa", label: "Wellness centres" },
      { id: "commercial.health_and_beauty", label: "Beauty shops" },
      { id: "sport.fitness.fitness_centre", label: "Gyms" },
      { id: "sport.fitness", label: "Fitness studios" },
      { id: "sport.sports_centre", label: "Sports centres" },
      { id: "sport.swimming_pool", label: "Swimming pools" },
      { id: "sport.horse_riding", label: "Horse riding" },
      { id: "activity.sport_club", label: "Sports clubs" },
    ],
  },
  {
    label: "Health",
    parent: "healthcare",
    items: [
      { id: "healthcare.dentist", label: "Dentists" },
      { id: "healthcare.clinic_or_praxis", label: "Clinics" },
      { id: "healthcare.hospital", label: "Hospitals" },
      { id: "healthcare.pharmacy", label: "Pharmacies" },
      { id: "commercial.chemist", label: "Chemists" },
      { id: "pet.veterinary", label: "Vets" },
    ],
  },
  {
    label: "Shops",
    parent: "commercial",
    items: [
      { id: "commercial.clothing", label: "Clothing" },
      { id: "commercial.jewelry", label: "Jewellery" },
      { id: "commercial.watches", label: "Watches" },
      { id: "commercial.bag", label: "Bags" },
      { id: "commercial.florist", label: "Florists" },
      { id: "commercial.gift_and_souvenir", label: "Gifts & souvenirs" },
      { id: "commercial.furniture_and_interior", label: "Furniture & interiors" },
      { id: "commercial.houseware_and_hardware", label: "Homeware & hardware" },
      { id: "commercial.garden", label: "Garden centres" },
      { id: "commercial.art", label: "Art shops & galleries" },
      { id: "commercial.antiques", label: "Antiques" },
      { id: "commercial.books", label: "Bookshops" },
      { id: "commercial.hobby", label: "Hobby & craft" },
      { id: "commercial.toy_and_game", label: "Toys & games" },
      { id: "commercial.baby_goods", label: "Baby goods" },
      { id: "commercial.outdoor_and_sport", label: "Outdoor & sports gear" },
      { id: "commercial.pet", label: "Pet shops" },
      { id: "commercial.wedding", label: "Wedding shops" },
      { id: "commercial.second_hand", label: "Second-hand" },
      { id: "commercial.vehicle", label: "Vehicle dealers" },
      { id: "commercial.convenience", label: "Convenience stores" },
      { id: "commercial.supermarket", label: "Supermarkets" },
      { id: "commercial.marketplace", label: "Markets" },
      { id: "commercial.shopping_mall", label: "Shopping malls" },
      { id: "commercial.department_store", label: "Department stores" },
    ],
  },
  {
    label: "Services",
    parent: "service",
    items: [
      { id: "service.cleaning.laundry", label: "Laundries" },
      { id: "service.cleaning.dry_cleaning", label: "Dry cleaners" },
      { id: "service.cleaning", label: "Cleaning services" },
      { id: "service.tailor", label: "Tailors" },
      { id: "service.locksmith", label: "Locksmiths" },
      { id: "service.vehicle.car_wash", label: "Car washes" },
      { id: "service.vehicle", label: "Vehicle services" },
      { id: "service.taxi", label: "Taxi services" },
      { id: "service.funeral_directors", label: "Funeral directors" },
      { id: "pet.service", label: "Pet services & grooming" },
      { id: "pet.shop", label: "Pet stores" },
      { id: "rental.storage", label: "Storage rentals" },
    ],
  },
  {
    label: "Professional & offices",
    parent: "office",
    items: [
      { id: "office.lawyer", label: "Law firms" },
      { id: "office.notary", label: "Notaries" },
      { id: "office.accountant", label: "Accountants" },
      { id: "office.tax_advisor", label: "Tax advisors" },
      { id: "office.financial", label: "Financial services" },
      { id: "service.financial", label: "Financial offices" },
      { id: "office.insurance", label: "Insurance" },
      { id: "office.estate_agent", label: "Estate agents" },
      { id: "service.estate_agent", label: "Property services" },
      { id: "office.architect", label: "Architects" },
      { id: "office.consulting", label: "Consultancies" },
      { id: "office.advertising_agency", label: "Ad agencies" },
      { id: "office.employment_agency", label: "Recruitment agencies" },
      { id: "office.it", label: "IT companies" },
      { id: "office.coworking", label: "Coworking spaces" },
      { id: "office.company", label: "Company offices" },
      { id: "office.association", label: "Associations" },
      { id: "office.charity", label: "Charities" },
    ],
  },
  {
    label: "Education & childcare",
    parent: "education",
    items: [
      { id: "education.school", label: "Schools" },
      { id: "education.college", label: "Colleges" },
      { id: "education.university", label: "Universities" },
      { id: "education.language_school", label: "Language schools" },
      { id: "education.music_school", label: "Music schools" },
      { id: "education.driving_school", label: "Driving schools" },
      { id: "childcare.kindergarten", label: "Kindergartens & daycare" },
      { id: "childcare", label: "Childcare" },
    ],
  },
  {
    label: "Entertainment & leisure",
    parent: "entertainment",
    items: [
      { id: "entertainment.cinema", label: "Cinemas" },
      { id: "entertainment.museum", label: "Museums" },
      { id: "entertainment.culture", label: "Cultural venues" },
      { id: "entertainment.theme_park", label: "Theme parks" },
      { id: "entertainment.water_park", label: "Water parks" },
      { id: "entertainment.zoo", label: "Zoos" },
      { id: "entertainment.aquarium", label: "Aquariums" },
      { id: "entertainment.escape_game", label: "Escape rooms" },
      { id: "entertainment.bowling_alley", label: "Bowling" },
      { id: "entertainment.miniature_golf", label: "Mini golf" },
      { id: "entertainment.amusement_arcade", label: "Arcades" },
      { id: "entertainment.activity_park", label: "Activity parks" },
      { id: "leisure.park", label: "Parks" },
      { id: "activity.community_center", label: "Community centres" },
    ],
  },
];

/** Flat lookup used by the filter summary and by any older stored filters. */
export const DISCOVERY_CATEGORIES: { id: string; label: string }[] = CATEGORY_GROUPS.flatMap(
  (group) => group.items,
);

const labelById = new Map(DISCOVERY_CATEGORIES.map((entry) => [entry.id, entry.label]));
for (const group of CATEGORY_GROUPS) labelById.set(group.parent, `All ${group.label.toLowerCase()}`);

/**
 * Human label for a category id. Unknown ids (Geoapify returns the narrowest
 * one it has, which may not be in our curated list) are humanized from their
 * last segment: "healthcare.clinic_or_praxis" → "Clinic or praxis".
 */
export const categoryLabel = (id: string): string => {
  const known = labelById.get(id);
  if (known) return known;
  const leaf = id.split(".").pop() ?? id;
  const words = leaf.replace(/_/g, " ").trim();
  return words ? words[0].toUpperCase() + words.slice(1) : "Uncategorised";
};

export const DEFAULT_RESULT_LIMIT = 5;
export const MAX_RESULT_LIMIT = 25;
export const DEFAULT_RADIUS_METERS = 5_000;
export const MAX_RADIUS_METERS = 50_000;

export type DiscoveryFilters = {
  location: string;
  categories: string[];
  radiusMeters: number;
  limit: number;
  nameContains?: string;
};

export const emptyFilters = (location = "", limit = DEFAULT_RESULT_LIMIT): DiscoveryFilters => ({
  location,
  categories: [],
  radiusMeters: DEFAULT_RADIUS_METERS,
  limit,
});

export function describeFilters(filters: DiscoveryFilters): string {
  const labels = filters.categories.map(categoryLabel);
  const what = labels.length
    ? labels.length > 4
      ? `${labels.slice(0, 3).join(", ")} and ${labels.length - 3} more`
      : labels.join(", ")
    : "businesses";
  const radiusKm = (filters.radiusMeters / 1000).toFixed(1).replace(/\.0$/, "");
  return `${filters.limit} × ${what} within ${radiusKm} km of ${filters.location || "an unset location"}`;
}
