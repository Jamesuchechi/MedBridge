"use strict";
/**
 * OpenStreetMap Pharmacy Service
 * ================================
 * Uses two OSM APIs:
 *
 *  1. Overpass API  — for "find all pharmacies within radius of coords"
 *     (the heavy-duty spatial query API, free, no key needed)
 *
 *  2. Nominatim     — for "find pharmacies matching text query"
 *     (OSM's geocoding/search, free, requires User-Agent header)
 *
 * Rate limits:
 *   Overpass: ~10k req/day on public endpoint; self-host for production
 *   Nominatim: 1 req/s on public endpoint; self-host or use paid tier for prod
 *
 * Both are 100% free and require no API key.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findPharmaciesNearby = findPharmaciesNearby;
exports.searchPharmaciesByName = searchPharmaciesByName;
exports.geocodeLocation = geocodeLocation;
const axios_1 = __importDefault(require("axios"));
const OVERPASS_URL = process.env.OVERPASS_API_URL || "https://overpass-api.de/api/interpreter";
const NOMINATIM_URL = process.env.NOMINATIM_API_URL || "https://nominatim.openstreetmap.org";
// Required by Nominatim ToS
const USER_AGENT = `MedBridge/1.0 (https://medbridge.health; contact@medbridge.health)`;
// ─── Parse OSM tags into our shape ───────────────────────────────────────────
function parseOsmElement(el) {
    const tags = el.tags || {};
    const name = tags["name"] || tags["brand"] || "Pharmacy";
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (!lat || !lon)
        return null;
    // Build address from OSM addr:* tags
    const addrParts = [
        tags["addr:housenumber"],
        tags["addr:street"],
        tags["addr:city"] || tags["addr:town"] || tags["addr:suburb"],
    ].filter(Boolean);
    const address = addrParts.length > 0
        ? addrParts.join(", ")
        : tags["addr:full"] || "Address not available";
    const state = tags["addr:state"] || extractNigerianState(address) || "Nigeria";
    return {
        osmId: String(el.id),
        osmType: el.type,
        name,
        address,
        state,
        lga: tags["addr:suburb"] || tags["addr:quarter"] || null,
        lat,
        lng: lon,
        phone: tags["phone"] || tags["contact:phone"] || null,
        website: tags["website"] || tags["contact:website"] || null,
        openingHours: tags["opening_hours"] || null,
    };
}
function extractNigerianState(text) {
    const STATES = [
        "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
        "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Abuja",
        "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi",
        "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
        "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
    ];
    const lower = text.toLowerCase();
    return STATES.find((s) => lower.includes(s.toLowerCase())) || null;
}
// ─── Overpass: nearby pharmacies by coordinates ───────────────────────────────
/**
 * Finds all pharmacies within `radiusMeters` of the given coordinates.
 * Uses the Overpass QL query language.
 */
async function findPharmaciesNearby(lat, lng, radiusMeters = 5000, limit = 30) {
    // Overpass QL: find nodes/ways/relations tagged as pharmacy within radius
    const query = `
    [out:json][timeout:15];
    (
      node["amenity"="pharmacy"](around:${radiusMeters},${lat},${lng});
      way["amenity"="pharmacy"](around:${radiusMeters},${lat},${lng});
    );
    out center ${limit};
  `;
    try {
        const { data } = await axios_1.default.post(OVERPASS_URL, `data=${encodeURIComponent(query)}`, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            timeout: 18000,
        });
        return data.elements
            .map(parseOsmElement)
            .filter((p) => p !== null)
            .slice(0, limit);
    }
    catch (err) {
        console.error("[OSM Overpass] Error:", err instanceof Error ? err.message : err);
        return [];
    }
}
// ─── Nominatim: text search for pharmacies ────────────────────────────────────
/**
 * Searches for pharmacies matching a text query.
 * Optionally biased toward Nigerian states.
 *
 * Nominatim requires us to respect 1 req/s on the public server.
 * For production, either self-host or use a commercial provider.
 */
async function searchPharmaciesByName(query, countryCode = "ng", // Nigeria
limit = 20) {
    try {
        const params = new URLSearchParams({
            q: `${query} pharmacy`,
            format: "jsonv2",
            addressdetails: "1",
            limit: String(limit),
            countrycodes: countryCode,
            "accept-language": "en",
        });
        const { data } = await axios_1.default.get(`${NOMINATIM_URL}/search?${params}`, {
            headers: { "User-Agent": USER_AGENT },
            timeout: 10000,
        });
        return data
            .filter((r) => r.osm_type && r.lat && r.lon)
            .map((r) => {
            const addr = r.address || {};
            const addrStr = [
                addr.house_number,
                addr.road,
                addr.suburb || addr.neighbourhood,
                addr.city || addr.town || addr.village,
            ].filter(Boolean).join(", ") || r.display_name;
            return {
                osmId: String(r.osm_id),
                osmType: r.osm_type,
                name: r.name || "Pharmacy",
                address: addrStr,
                state: addr.state || extractNigerianState(r.display_name) || "Nigeria",
                lga: addr.county || addr.city_district || null,
                lat: parseFloat(r.lat),
                lng: parseFloat(r.lon),
                phone: null,
                website: null,
                openingHours: null,
            };
        });
    }
    catch (err) {
        console.error("[Nominatim] Error:", err instanceof Error ? err.message : err);
        return [];
    }
}
// ─── Geocode a location string ────────────────────────────────────────────────
/**
 * Converts "Yaba, Lagos" → { lat, lng } so the frontend can
 * search by area name without needing a browser geolocation.
 */
async function geocodeLocation(locationText) {
    try {
        const params = new URLSearchParams({
            q: `${locationText}, Nigeria`,
            format: "jsonv2",
            limit: "1",
            countrycodes: "ng",
            "accept-language": "en",
        });
        const { data } = await axios_1.default.get(`${NOMINATIM_URL}/search?${params}`, { headers: { "User-Agent": USER_AGENT }, timeout: 8000 });
        if (!data.length)
            return null;
        return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            display: data[0].display_name,
        };
    }
    catch {
        return null;
    }
}
