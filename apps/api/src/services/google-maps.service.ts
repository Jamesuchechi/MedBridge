
import axios from "axios";
import { OsmPharmacy, GeocodeResult } from "./osm.service";

/**
 * Google Maps Pharmacy Service
 */

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!GOOGLE_MAPS_API_KEY) {
  console.warn("[GOOGLE MAPS]: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set in .env");
}

const googleClient = axios.create({
  timeout: 10000,
});

interface GooglePlaceResult {
  place_id: string;
  name?: string;
  formatted_address?: string;
  vicinity?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  opening_hours?: {
    open_now?: boolean;
  };
}

/**
 * Search for pharmacies nearby given coordinates
 */
export async function searchPharmaciesNearby(
  lat: number,
  lng: number,
  radiusMeters: number = 5000
): Promise<OsmPharmacy[]> {
  if (!GOOGLE_MAPS_API_KEY) return [];

  try {
    const response = await googleClient.get(
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
      {
        params: {
          location: `${lat},${lng}`,
          radius: radiusMeters,
          type: "pharmacy",
          key: GOOGLE_MAPS_API_KEY,
        },
      }
    );

    const { results, status } = response.data;

    if (status !== "OK" && status !== "ZERO_RESULTS") {
      console.error(`[GOOGLE MAPS]: Nearby search failed with status: ${status}`, response.data.error_message);
      return [];
    }

    return (results || []).map((place: GooglePlaceResult) => transformGooglePlace(place));
  } catch (err: unknown) {
    console.error("[GOOGLE MAPS]: Nearby search error:", err);
    return [];
  }
}

/**
 * Search for pharmacies by name or query
 */
export async function searchPharmaciesByName(
  query: string,
  state?: string
): Promise<OsmPharmacy[]> {
  if (!GOOGLE_MAPS_API_KEY) return [];

  const fullQuery = state ? `${query} pharmacy in ${state}, Nigeria` : `${query} pharmacy, Nigeria`;

  try {
    const response = await googleClient.get(
      "https://maps.googleapis.com/maps/api/place/textsearch/json",
      {
        params: {
          query: fullQuery,
          key: GOOGLE_MAPS_API_KEY,
        },
      }
    );

    const { results, status } = response.data;

    if (status !== "OK" && status !== "ZERO_RESULTS") {
      console.error(`[GOOGLE MAPS]: Text search failed with status: ${status}`, response.data.error_message);
      return [];
    }

    return (results || []).map((place: GooglePlaceResult) => transformGooglePlace(place));
  } catch (err: unknown) {
    console.error("[GOOGLE MAPS]: Text search error:", err);
    return [];
  }
}

/**
 * Geocode a location string into coordinates
 */
export async function geocodeLocation(
  query: string
): Promise<GeocodeResult | null> {
  if (!GOOGLE_MAPS_API_KEY) return null;

  try {
    const response = await googleClient.get(
      "https://maps.googleapis.com/maps/api/geocode/json",
      {
        params: {
          address: query.includes("Nigeria") ? query : `${query}, Nigeria`,
          key: GOOGLE_MAPS_API_KEY,
        },
      }
    );

    const { results, status } = response.data;

    if (status !== "OK" || !results.length) {
      if (status !== "ZERO_RESULTS") {
        console.error(`[GOOGLE MAPS]: Geocoding failed with status: ${status}`, response.data.error_message);
      }
      return null;
    }

    const result = results[0];
    const { lat, lng } = result.geometry.location;

    // Extract state and LGA from address components
    let state = "Nigeria";
    let lga = null;

    for (const component of result.address_components) {
      if (component.types.includes("administrative_area_level_1")) {
        state = component.long_name;
      }
      if (component.types.includes("administrative_area_level_2")) {
        lga = component.long_name;
      }
    }

    return {
      lat,
      lng,
      address: result.formatted_address,
      state,
      lga,
    };
  } catch (err: unknown) {
    console.error("[GOOGLE MAPS]: Geocoding error:", err);
    return null;
  }
}

/**
 * Transform a Google Place result into the OsmPharmacy format
 */
function transformGooglePlace(place: GooglePlaceResult): OsmPharmacy {
  // Extract state if possible from address
  const addressParts = place.formatted_address?.split(",") || [];
  const state = addressParts.length > 2 ? addressParts[addressParts.length - 2].trim() : "Nigeria";

  return {
    osmId: `goog_${place.place_id}`, // Prefix to distinguish from OSM
    osmType: "node", // Default for Google Places
    name: place.name || "Pharmacy",
    address: place.formatted_address || place.vicinity || "Address not available",
    state: state,
    lga: null, // Google Places API doesn't easily provide LGA in search results
    lat: place.geometry.location.lat,
    lng: place.geometry.location.lng,
    phone: null, // Basic search doesn't always provide phone, would need Place Details
    website: null,
    openingHours: place.opening_hours?.open_now ? "Open Now" : null,
  };
}
