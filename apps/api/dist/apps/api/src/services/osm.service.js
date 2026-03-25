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
exports.getSearchIntentFromAi = getSearchIntentFromAi;
const axios_1 = __importDefault(require("axios"));
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
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
const NOMINATIM_URL = process.env.NOMINATIM_API_URL || "https://nominatim.openstreetmap.org";
const USER_AGENT = "MedBridge/1.0 (https://medbridge.health; contact@medbridge.health)";
/**
 * Dedicated axios instance with IPv4 forced at the instance level.
 * follow-redirects (used internally by axios) only reads agents from the
 * instance config — per-request httpAgent/httpsAgent spreads are ignored.
 */
const osmClient = axios_1.default.create({
    timeout: 12000,
    httpAgent: new http_1.default.Agent({ family: 4 }),
    httpsAgent: new https_1.default.Agent({ family: 4 }),
    headers: {
        "User-Agent": USER_AGENT,
        "Accept-Encoding": "gzip, compress, deflate, br",
    },
});
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
// Simple caches
const nearbyCache = new Map();
const searchCache = new Map();
const geocodeCache = new Map();
// Rate limiter (Nominatim: max 1 req/sec)
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
    console.log(`[OSM]: Fetching Overpass for ${lat},${lng} radius ${radius}`);
    for (const url of OVERPASS_INSTANCES) {
        try {
            const { data } = await osmClient.post(url, `data=${encodeURIComponent(query)}`, {
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
async function searchPharmaciesByName(query, state) {
    const cacheKey = `${query}-${state}`.toLowerCase().trim();
    if (searchCache.has(cacheKey)) {
        return searchCache.get(cacheKey);
    }
    // Variations of queries to try
    const queries = [
        query.toLowerCase().includes("pharmacy") ? query : `${query} pharmacy`,
        `pharmacies in ${query}`,
    ];
    if (state && !query.toLowerCase().includes(state.toLowerCase())) {
        queries.unshift(`${query} ${state}`);
    }
    for (let i = 0; i < queries.length; i++) {
        const qStr = queries[i];
        // Nominatim requirement: 1 request per second
        if (i > 0) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
        }
        const params = new URLSearchParams({
            q: qStr,
            format: "jsonv2",
            addressdetails: "1",
            limit: "20",
            countrycodes: "ng",
        });
        console.log(`[OSM]: Searching Nominatim: ${qStr}`);
        try {
            const { data } = await rateLimit(() => osmClient.get(`${NOMINATIM_URL}/search?${params}`));
            if (Array.isArray(data) && data.length > 0) {
                const results = data.map((r) => ({
                    osmId: String(r.osm_id),
                    osmType: r.osm_type,
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
                searchCache.set(cacheKey, results);
                return results;
            }
        }
        catch (err) {
            if (axios_1.default.isAxiosError(err)) {
                if (err.response?.status === 429) {
                    console.error("[OSM SERVICE]: Nominatim rate limit hit (429). Stopping retries.");
                    break;
                }
                console.error(`[OSM SERVICE]: searchPharmaciesByName error for query "${qStr}":`, err.message);
            }
            else {
                console.error(`[OSM SERVICE]: searchPharmaciesByName error for query "${qStr}":`, err instanceof Error ? err.message : "An unknown error occurred");
            }
        }
    }
    return [];
}
/* ────────────────────────────────────────────────────────────────────────────
 * MAIN: HYBRID SEARCH + DISTANCE SORT
 * ──────────────────────────────────────────────────────────────────────────── */
async function findNearestPharmacies({ lat, lng, radiusMeters = 5000, limit = 20, fallbackQuery, }) {
    const cacheKey = `${lat}-${lng}-${radiusMeters}-${limit}`;
    if (nearbyCache.has(cacheKey)) {
        return nearbyCache.get(cacheKey);
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
    results.sort((a, b) => a.distanceKm - b.distanceKm);
    // 6. Limit
    const finalResults = results.slice(0, limit);
    nearbyCache.set(cacheKey, finalResults);
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
    const cacheKey = query.toLowerCase().trim();
    if (geocodeCache.has(cacheKey)) {
        return geocodeCache.get(cacheKey) || null;
    }
    try {
        const { data } = await rateLimit(() => osmClient.get(`${NOMINATIM_URL}/search?${params}`));
        if (!data.length)
            return null;
        const r = data[0];
        const result = {
            lat: parseFloat(r.lat),
            lng: parseFloat(r.lon),
            address: r.display_name,
            state: r.address?.state || "Nigeria",
            lga: r.address?.county || r.address?.suburb || null,
        };
        geocodeCache.set(cacheKey, result);
        return result;
    }
    catch (err) {
        console.error("[GEOCODE ERROR]:", err);
        return geocodeCache.get(cacheKey) || null;
    }
}
/**
 * AI-powered search intent analysis
 */
async function getSearchIntentFromAi(query, state) {
    const aiUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    try {
        const { data } = await axios_1.default.post(`${aiUrl}/internal/pharmacy/search-intent`, {
            query,
            state
        }, { timeout: 8000 });
        return data;
    }
    catch (err) {
        console.error("[AI SEARCH INTENT ERROR]:", err);
        return null;
    }
}
