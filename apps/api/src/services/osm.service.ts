/**
 * OpenStreetMap Pharmacy Service (Production Ready)
 */

import axios from "axios";

/* ────────────────────────────────────────────────────────────────────────────
 * CONFIG
 * ──────────────────────────────────────────────────────────────────────────── */

const OVERPASS_INSTANCES = [
  process.env.OVERPASS_API_URL,
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/cgi/interpreter",
].filter(Boolean) as string[];

const NOMINATIM_URL =
  process.env.NOMINATIM_API_URL ||
  "https://nominatim.openstreetmap.org";

const USER_AGENT =
  "MedBridge/1.0 (https://medbridge.health; contact@medbridge.health)";

/* ────────────────────────────────────────────────────────────────────────────
 * TYPES
 * ──────────────────────────────────────────────────────────────────────────── */

export interface OsmPharmacy {
  osmId: string;
  osmType: "node" | "way" | "relation";
  name: string;
  address: string;
  state: string;
  lga: string | null;
  lat: number;
  lng: number;
  distanceKm?: number;
  phone: string | null;
  website: string | null;
  openingHours: string | null;
}

interface OverpassElement {
  id: number;
  type: "node" | "way" | "relation";
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface NominatimResult {
  osm_id: number | string;
  osm_type: string;
  name?: string;
  display_name: string;
  address?: {
    state?: string;
    county?: string;
    suburb?: string;
    city?: string;
    road?: string;
  };
  lat: string;
  lon: string;
}

/* ────────────────────────────────────────────────────────────────────────────
 * UTILITIES
 * ──────────────────────────────────────────────────────────────────────────── */

// Haversine formula (distance in KM)
function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Deduplicate by coordinates
function dedupe<T extends { lat: number; lng: number }>(arr: T[]): T[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    const key = `${item.lat}-${item.lng}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Simple caches
const nearbyCache = new Map<string, OsmPharmacy[]>();
const searchCache = new Map<string, OsmPharmacy[]>();
const geocodeCache = new Map<string, any>();

// Rate limiter (Nominatim)
let lastRequest = 0;
async function rateLimit<T>(fn: () => Promise<T>): Promise<T> {
  const diff = Date.now() - lastRequest;
  if (diff < 1000) {
    await new Promise((r) => setTimeout(r, 1000 - diff));
  }
  lastRequest = Date.now();
  return fn();
}

/* ────────────────────────────────────────────────────────────────────────────
 * OVERPASS (PRIMARY)
 * ──────────────────────────────────────────────────────────────────────────── */

async function fetchOverpass(
  lat: number,
  lng: number,
  radius: number
): Promise<OsmPharmacy[]> {
  const query = `
    [out:json][timeout:15];
    (
      node["amenity"="pharmacy"](around:${radius},${lat},${lng});
      way["amenity"="pharmacy"](around:${radius},${lat},${lng});
    );
    out center;
  `;

  for (const url of OVERPASS_INSTANCES) {
    try {
      const { data } = await axios.post(
        url,
        `data=${encodeURIComponent(query)}`,
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 15000,
        }
      );

      return (data.elements || [])
        .map((el: OverpassElement) => {
          const latVal = el.lat ?? el.center?.lat;
          const lonVal = el.lon ?? el.center?.lon;
          if (!latVal || !lonVal) return null;

          const tags = el.tags || {};

          return {
            osmId: String(el.id),
            osmType: el.type,
            name: tags.name || tags.brand || "Pharmacy",
            address:
              tags["addr:full"] ||
              [tags["addr:street"], tags["addr:city"]]
                .filter(Boolean)
                .join(", ") ||
              "Address not available",
            state: tags["addr:state"] || "Nigeria",
            lga: tags["addr:suburb"] || null,
            lat: latVal,
            lng: lonVal,
            phone: tags.phone || null,
            website: tags.website || null,
            openingHours: tags.opening_hours || null,
          };
        })
        .filter(Boolean);
    } catch {
      continue;
    }
  }

  return [];
}

/* ────────────────────────────────────────────────────────────────────────────
 * NOMINATIM (FALLBACK)
 * ──────────────────────────────────────────────────────────────────────────── */

export async function searchPharmaciesByName(query: string): Promise<OsmPharmacy[]> {
  const params = new URLSearchParams({
    q: query.toLowerCase().includes("pharmacy")
      ? `${query} Nigeria`
      : `${query} pharmacy Nigeria`,
    format: "jsonv2",
    addressdetails: "1",
    limit: "20",
    countrycodes: "ng",
  });

  const cacheKey = query.toLowerCase().trim();
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }

  try {
    const { data } = await rateLimit(() =>
      axios.get(`${NOMINATIM_URL}/search?${params}`, {
        headers: { "User-Agent": USER_AGENT },
        timeout: 12000, // Increased
      })
    );

    if (!Array.isArray(data)) {
      console.warn("[OSM SERVICE]: Nominatim returned non-array data:", data);
      return [];
    }

    const results = data.map((r: NominatimResult) => ({
      osmId: String(r.osm_id),
      osmType: r.osm_type as "node" | "way" | "relation",
      name: r.name || r.display_name.split(",")[0] || "Pharmacy",
      address: r.display_name,
      state: r.address?.state || "Nigeria",
      lga: r.address?.county || r.address?.suburb || null,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      phone: null,
      website: null,
      openingHours: null,
    }));

    // Cache the successful results
    searchCache.set(cacheKey, results);
    return results;
  } catch (err) {
    console.error("[OSM SERVICE]: searchPharmaciesByName error:", err);

    // Fallback: if we have a stale cache, use it on error
    if (searchCache.has(cacheKey)) {
      console.log("[OSM SERVICE]: Returning stale results from cache after error.");
      return searchCache.get(cacheKey)!;
    }
    return [];
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * MAIN: HYBRID SEARCH + DISTANCE SORT
 * ──────────────────────────────────────────────────────────────────────────── */

export async function findNearestPharmacies({
  lat,
  lng,
  radiusMeters = 5000,
  limit = 20,
  fallbackQuery,
}: {
  lat: number;
  lng: number;
  radiusMeters?: number;
  limit?: number;
  fallbackQuery?: string;
}): Promise<OsmPharmacy[]> {
  const cacheKey = `${lat}-${lng}-${radiusMeters}-${limit}`;

  if (nearbyCache.has(cacheKey)) {
    return nearbyCache.get(cacheKey)!;
  }

  // 1. Try Overpass first
  let results = await fetchOverpass(lat, lng, radiusMeters);

  // 2. Fallback to Nominatim if empty
  if (results.length === 0 && fallbackQuery) {
    results = await searchPharmaciesByName(fallbackQuery);
  }

  // 3. Deduplicate
  results = dedupe(results);

  // 4. Add distance
  results = results.map((p) => ({
    ...p,
    distanceKm: getDistanceKm(lat, lng, p.lat, p.lng),
  }));

  // 5. Sort by nearest
  results.sort((a, b) => (a.distanceKm! - b.distanceKm!));

  // 6. Limit
  const finalResults = results.slice(0, limit);

  nearbyCache.set(cacheKey, finalResults);

  return finalResults;
}

/**
 * Wraps findNearestPharmacies to match controller's expected signature
 */
export async function findPharmaciesNearby(
  lat: number,
  lng: number,
  radiusMeters: number = 5000
): Promise<OsmPharmacy[]> {
  return findNearestPharmacies({ lat, lng, radiusMeters });
}

/**
 * General-purpose geocoding (Nominatim)
 */
export async function geocodeLocation(query: string) {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    limit: "1",
    countrycodes: "ng",
  });

  const cacheKey = query.toLowerCase().trim();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  try {
    const { data } = await rateLimit(() =>
      axios.get(`${NOMINATIM_URL}/search?${params}`, {
        headers: { "User-Agent": USER_AGENT },
        timeout: 12000, // Increased
      })
    );

    if (!data.length) return null;
    const r = data[0] as NominatimResult;

    const result = {
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      address: r.display_name,
      state: r.address?.state || "Nigeria",
      lga: r.address?.county || r.address?.suburb || null,
    };

    geocodeCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.error("[GEOCODE ERROR]:", err);
    return geocodeCache.get(cacheKey) || null;
  }
}