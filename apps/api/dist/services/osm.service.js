"use strict";
/**
 * OpenStreetMap Pharmacy Service (Production Ready)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchPharmaciesByName = searchPharmaciesByName;
exports.findNearestPharmacies = findNearestPharmacies;
exports.findPharmaciesNearby = findPharmaciesNearby;
exports.geocodeLocation = geocodeLocation;
const axios_1 = __importDefault(require("axios"));
/* ────────────────────────────────────────────────────────────────────────────
 * CONFIG
 * ──────────────────────────────────────────────────────────────────────────── */
const OVERPASS_INSTANCES = [
    process.env.OVERPASS_API_URL,
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.ru/cgi/interpreter",
].filter(Boolean);
const NOMINATIM_URL = process.env.NOMINATIM_API_URL ||
    "https://nominatim.openstreetmap.org";
const USER_AGENT = "MedBridge/1.0 (https://medbridge.health; contact@medbridge.health)";
/* ────────────────────────────────────────────────────────────────────────────
 * UTILITIES
 * ──────────────────────────────────────────────────────────────────────────── */
// Haversine formula (distance in KM)
function getDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
// Deduplicate by coordinates
function dedupe(arr) {
    const seen = new Set();
    return arr.filter((item) => {
        const key = `${item.lat}-${item.lng}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
// Simple cache
const cache = new Map();
// Rate limiter (Nominatim)
let lastRequest = 0;
async function rateLimit(fn) {
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
async function fetchOverpass(lat, lng, radius) {
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
            const { data } = await axios_1.default.post(url, `data=${encodeURIComponent(query)}`, {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                timeout: 15000,
            });
            return (data.elements || [])
                .map((el) => {
                const latVal = el.lat ?? el.center?.lat;
                const lonVal = el.lon ?? el.center?.lon;
                if (!latVal || !lonVal)
                    return null;
                const tags = el.tags || {};
                return {
                    osmId: String(el.id),
                    osmType: el.type,
                    name: tags.name || tags.brand || "Pharmacy",
                    address: tags["addr:full"] ||
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
        }
        catch {
            continue;
        }
    }
    return [];
}
/* ────────────────────────────────────────────────────────────────────────────
 * NOMINATIM (FALLBACK)
 * ──────────────────────────────────────────────────────────────────────────── */
async function searchPharmaciesByName(query) {
    const params = new URLSearchParams({
        q: query.toLowerCase().includes("pharmacy")
            ? `${query} Nigeria`
            : `${query} pharmacy Nigeria`,
        format: "jsonv2",
        addressdetails: "1",
        limit: "20",
        countrycodes: "ng",
    });
    const { data } = await rateLimit(() => axios_1.default.get(`${NOMINATIM_URL}/search?${params}`, {
        headers: { "User-Agent": USER_AGENT },
        timeout: 10000,
    }));
    return data.map((r) => ({
        osmId: String(r.osm_id),
        osmType: r.osm_type,
        name: r.name || r.display_name.split(",")[0],
        address: r.display_name,
        state: r.address?.state || "Nigeria",
        lga: r.address?.county || null,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        phone: null,
        website: null,
        openingHours: null,
    }));
}
/* ────────────────────────────────────────────────────────────────────────────
 * MAIN: HYBRID SEARCH + DISTANCE SORT
 * ──────────────────────────────────────────────────────────────────────────── */
async function findNearestPharmacies({ lat, lng, radiusMeters = 5000, limit = 20, fallbackQuery, }) {
    const cacheKey = `${lat}-${lng}-${radiusMeters}-${limit}`;
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
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
    results.sort((a, b) => (a.distanceKm - b.distanceKm));
    // 6. Limit
    const finalResults = results.slice(0, limit);
    cache.set(cacheKey, finalResults);
    return finalResults;
}
/**
 * Wraps findNearestPharmacies to match controller's expected signature
 */
async function findPharmaciesNearby(lat, lng, radiusMeters = 5000) {
    return findNearestPharmacies({ lat, lng, radiusMeters });
}
/**
 * General-purpose geocoding (Nominatim)
 */
async function geocodeLocation(query) {
    const params = new URLSearchParams({
        q: query,
        format: "jsonv2",
        addressdetails: "1",
        limit: "1",
        countrycodes: "ng",
    });
    try {
        const { data } = await rateLimit(() => axios_1.default.get(`${NOMINATIM_URL}/search?${params}`, {
            headers: { "User-Agent": USER_AGENT },
            timeout: 10000,
        }));
        if (!data.length)
            return null;
        const r = data[0];
        return {
            lat: parseFloat(r.lat),
            lng: parseFloat(r.lon),
            address: r.display_name,
            state: r.address?.state || "Nigeria",
            lga: r.address?.county || r.address?.suburb || null,
        };
    }
    catch (err) {
        console.error("[GEOCODE ERROR]:", err);
        return null;
    }
}
