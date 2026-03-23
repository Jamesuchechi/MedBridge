/**
 * MedBridge Analytics — Phase 2.6
 * =================================
 * Wraps Posthog with typed event tracking for all Phase 2 features.
 *
 * Setup:
 *   pnpm add posthog-js --filter @medbridge/web
 *
 *   Add to .env:
 *     NEXT_PUBLIC_POSTHOG_KEY=phc_xxxx
 *     NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
 *
 *   Call initAnalytics() once from providers.tsx (see below).
 *
 * Usage:
 *   import { track } from "@/lib/analytics";
 *   track.drugSearch({ query: "paracetamol", resultCount: 12, source: "typesense" });
 */

type Props = Record<string, unknown>;

function ph() {
  if (typeof window === "undefined") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require("posthog-js").default as {
      capture: (event: string, props?: Props) => void;
    }) ?? null;
  } catch {
    return null;
  }
}

function emit(event: string, props?: Props) {
  const client = ph();
  if (client) {
    client.capture(event, props);
  } else if (process.env.NODE_ENV === "development") {
    console.debug("[Analytics]", event, props ?? "");
  }
}

// ─── Event catalogue ──────────────────────────────────────────────────────────
// Every event is typed so callers get autocomplete and catch missing props.

export const track = {

  // ── Drug Search (Phase 2.1–2.3) ────────────────────────────────────────────
  drugSearch: (p: { query: string; resultCount: number; source: "typesense" | "postgres" }) =>
    emit("drug_searched", p),

  drugDetailViewed: (p: { drugId: string; drugName: string }) =>
    emit("drug_detail_viewed", p),

  drugInteractionChecked: (p: { drugCount: number; severity: string }) =>
    emit("drug_interaction_checked", p),

  drugExplanationRequested: (p: { drugName: string }) =>
    emit("drug_explanation_requested", p),

  drugSavedToProfile: (p: { drugName: string }) =>
    emit("drug_saved_to_profile", p),

  // ── Health Profile (Phase 2.4) ──────────────────────────────────────────────
  profileStepCompleted: (p: { step: number; stepName: string }) =>
    emit("profile_step_completed", p),

  profileSaved: (p: { completionPct: number; fieldsFilledCount: number }) =>
    emit("profile_saved", p),

  // ── CommunityRx (Phase 2.5) ──────────────────────────────────────────────────
  pharmacySearched: (p: {
    query?: string;
    state?: string;
    usedGeolocation: boolean;
    resultCount: number;
    source: "overpass" | "nominatim" | "database" | "google" | "google_places";
  }) => emit("pharmacy_searched", p),

  pharmacyDetailViewed: (p: { pharmacyId: string; pharmacyName: string }) =>
    emit("pharmacy_detail_viewed", p),

  pharmacyDirectionsTapped: (p: { pharmacyId: string; pharmacyName: string }) =>
    emit("pharmacy_directions_tapped", p),

  drugAvailabilityReported: (p: {
    pharmacyName: string;
    drugName:     string;
    isInStock:    boolean;
  }) => emit("drug_availability_reported", p),

  drugPriceReported: (p: {
    pharmacyName: string;
    drugName:     string;
    price:        number;
  }) => emit("drug_price_reported", p),

  priceComparisonViewed: (p: {
    drugId:        string;
    drugName:      string;
    pharmacyCount: number;
  }) => emit("drug_price_comparison_viewed", p),

  // ── Symptoms (Phase 1 + 2 enrichment) ─────────────────────────────────────
  symptomCheckStarted: () =>
    emit("symptom_check_started"),

  symptomCheckCompleted: (p: {
    symptomCount:     number;
    urgency:          string;
    conditionCount:   number;
    usedHealthProfile: boolean;
  }) => emit("symptom_check_completed", p),

  symptomCheckEmergency: (p: { symptomCount: number }) =>
    emit("symptom_check_emergency_triggered", p),

  // ── Documents ──────────────────────────────────────────────────────────────
  documentUploaded: (p: { docType: string; fileSizeMb: number }) =>
    emit("document_uploaded", p),

  documentAnalysisViewed: (p: { docType: string; flagCount: number }) =>
    emit("document_analysis_viewed", p),

  // ── General ────────────────────────────────────────────────────────────────
  pageViewed: (p: { page: string }) =>
    emit("$pageview", p),
};

// ─── Initialisation ───────────────────────────────────────────────────────────
/**
 * Call once from apps/web/app/providers.tsx inside a useEffect:
 *
 *   useEffect(() => { initAnalytics(); }, []);
 */
export function initAnalytics() {
  if (typeof window === "undefined") return;

  const key  = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";

  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Analytics] NEXT_PUBLIC_POSTHOG_KEY not set — events logged to console only.");
    }
    return;
  }

  import("posthog-js").then(({ default: posthog }) => {
    posthog.init(key, {
      api_host:         host,
      capture_pageview: false, // We do manual pageviews
      autocapture:      false,
      persistence:      "localStorage",
      loaded: (client) => {
        if (process.env.NODE_ENV !== "production") client.opt_out_capturing();
      },
    });
  }).catch(() => { /* posthog-js not yet installed — silently no-op */ });
}

/** Call after login to tie events to a user. */
export function identifyUser(userId: string, traits?: Props) {
  const client = ph() as Record<string, unknown> | null;
  if (!client) return;
  (client.identify as ((id: string, t?: Props) => void))?.(userId, traits);
}

/** Call on logout. */
export function resetAnalyticsIdentity() {
  const client = ph() as Record<string, unknown> | null;
  if (!client) return;
  (client.reset as (() => void))?.();
}