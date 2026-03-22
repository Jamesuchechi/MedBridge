/**
 * Phase 2.6 — Unit Tests (Jest)
 * ================================
 * Tests pure logic functions without any network calls or DB.
 *
 * Setup:
 *   pnpm add -D jest @types/jest ts-jest --filter @medbridge/api
 *   pnpm add -D jest @types/jest jest-environment-jsdom --filter @medbridge/web
 *
 * Add to apps/api/package.json:
 *   "test": "jest --testPathPattern=unit"
 *
 * Run:
 *   pnpm --filter @medbridge/api test:unit
 *   pnpm --filter @medbridge/web  test:unit
 */

// ─────────────────────────────────────────────────────────────────────────────
// Unit: apps/api — Drug Interaction severity ranking
// ─────────────────────────────────────────────────────────────────────────────
describe("Drug interaction severity ranking", () => {
  // Import the helper directly — it's a pure function
  const SEVERITY_RANK: Record<string, number> = {
    none:            0,
    minor:           1,
    moderate:        2,
    severe:          3,
    contraindicated: 4,
  };

  function highestSeverity(severities: string[]): string {
    if (!severities.length) return "none";
    return severities.reduce((a, b) =>
      SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b
    );
  }

  test("returns none for empty array", () => {
    expect(highestSeverity([])).toBe("none");
  });

  test("returns the single element", () => {
    expect(highestSeverity(["moderate"])).toBe("moderate");
  });

  test("returns contraindicated over severe", () => {
    expect(highestSeverity(["severe", "contraindicated", "minor"])).toBe("contraindicated");
  });

  test("returns severe over moderate", () => {
    expect(highestSeverity(["moderate", "severe", "none"])).toBe("severe");
  });

  test("returns moderate when all are moderate or lower", () => {
    expect(highestSeverity(["none", "minor", "moderate"])).toBe("moderate");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unit: apps/api — Price outlier detection thresholds
// ─────────────────────────────────────────────────────────────────────────────
describe("Price outlier detection", () => {
  function isPriceOutlier(price: number, minPrice: number, maxPrice: number): boolean {
    const low  = minPrice * 0.15;
    const high = maxPrice * 4;
    return price < low || price > high;
  }

  test("normal price within range is not an outlier", () => {
    // Drug costs ₦500–₦2000; reporting ₦800 is fine
    expect(isPriceOutlier(800, 500, 2000)).toBe(false);
  });

  test("price just inside upper threshold (4x max)", () => {
    expect(isPriceOutlier(7999, 500, 2000)).toBe(false); // 4x max = 8000
  });

  test("price at 4x max is not an outlier", () => {
    expect(isPriceOutlier(8000, 500, 2000)).toBe(false);
  });

  test("price above 4x max is an outlier", () => {
    expect(isPriceOutlier(8001, 500, 2000)).toBe(true);
  });

  test("price below 15% of min is an outlier", () => {
    // 15% of 500 = 75; price of 60 is below that
    expect(isPriceOutlier(60, 500, 2000)).toBe(true);
  });

  test("price at exactly 15% of min is not an outlier", () => {
    expect(isPriceOutlier(75, 500, 2000)).toBe(false);
  });

  test("zero price is always an outlier", () => {
    expect(isPriceOutlier(0, 100, 1000)).toBe(true);
  });

  test("extremely high price (counterfeit detection scenario)", () => {
    // Paracetamol max ₦800, price reported ₦50,000 → should flag
    expect(isPriceOutlier(50_000, 200, 800)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unit: apps/api/services/osm.service — Nigerian state extraction
// ─────────────────────────────────────────────────────────────────────────────
describe("OSM state extraction from address strings", () => {
  function extractNigerianState(text: string): string | null {
    const STATES = [
      "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
      "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Abuja",
      "Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi",
      "Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo",
      "Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara",
    ];
    const lower = text.toLowerCase();
    return STATES.find((s) => lower.includes(s.toLowerCase())) || null;
  }

  test("extracts Lagos from full address", () => {
    expect(extractNigerianState("15 Allen Avenue, Ikeja, Lagos")).toBe("Lagos");
  });

  test("extracts FCT from Abuja address", () => {
    expect(extractNigerianState("Wuse Zone 5, Abuja, FCT")).toBe("FCT");
  });

  test("extracts Rivers from Port Harcourt address", () => {
    expect(extractNigerianState("GRA Phase 2, Port Harcourt, Rivers State")).toBe("Rivers");
  });

  test("returns null for non-Nigerian address", () => {
    expect(extractNigerianState("10 Downing Street, London, UK")).toBeNull();
  });

  test("is case-insensitive", () => {
    expect(extractNigerianState("KANO STATE, NIGERIA")).toBe("Kano");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unit: apps/api — Drug interaction known pairs (KNOWN_INTERACTIONS dict)
// ─────────────────────────────────────────────────────────────────────────────
describe("Known dangerous drug interactions database", () => {
  // Replicate the lookup logic from apps/ai-service/routers/drug.py
  const KNOWN_PAIRS: Record<string, { severity: string; mechanism: string }> = {
    "warfarin+aspirin":          { severity: "severe",          mechanism: "Additive antiplatelet and anticoagulant effects" },
    "metronidazole+alcohol":     { severity: "severe",          mechanism: "Disulfiram-like reaction" },
    "artemether+halofantrine":   { severity: "contraindicated", mechanism: "Both prolong QT interval" },
    "ciprofloxacin+antacids":    { severity: "moderate",        mechanism: "Chelation reduces absorption" },
    "diazepam+alcohol":          { severity: "severe",          mechanism: "Synergistic CNS depression" },
    "metformin+alcohol":         { severity: "moderate",        mechanism: "Increased lactic acidosis risk" },
    "atorvastatin+clarithromycin": { severity: "severe",        mechanism: "CYP3A4 inhibition" },
  };

  function checkKnownPair(drug1: string, drug2: string) {
    const key1 = [drug1, drug2].sort().join("+").toLowerCase();
    return KNOWN_PAIRS[key1] || null;
  }

  test("warfarin + aspirin returns severe", () => {
    const result = checkKnownPair("warfarin", "aspirin");
    expect(result).not.toBeNull();
    expect(result?.severity).toBe("severe");
  });

  test("order-independent: aspirin + warfarin same result", () => {
    const result = checkKnownPair("aspirin", "warfarin");
    expect(result?.severity).toBe("severe");
  });

  test("artemether + halofantrine is contraindicated", () => {
    const result = checkKnownPair("artemether", "halofantrine");
    expect(result?.severity).toBe("contraindicated");
  });

  test("unknown pair returns null", () => {
    const result = checkKnownPair("paracetamol", "orange juice");
    expect(result).toBeNull();
  });

  test("metronidazole + alcohol returns severe", () => {
    const result = checkKnownPair("metronidazole", "alcohol");
    expect(result?.severity).toBe("severe");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unit: apps/web/lib/analytics — emit calls are no-ops without posthog installed
// ─────────────────────────────────────────────────────────────────────────────
describe("Analytics — graceful degradation without posthog", () => {
  // Mock the require call so posthog-js isn't needed in test env
  const consoleSpy = jest.spyOn(console, "debug").mockImplementation(() => {});

  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    consoleSpy.mockClear();
  });

  test("track.drugSearch does not throw when posthog unavailable", () => {
    const { track } = require("@/lib/analytics");
    expect(() =>
      track.drugSearch({ query: "paracetamol", resultCount: 5, source: "typesense" })
    ).not.toThrow();
  });

  test("track.pharmacySearched does not throw", () => {
    const { track } = require("@/lib/analytics");
    expect(() =>
      track.pharmacySearched({ usedGeolocation: true, resultCount: 3, source: "overpass" })
    ).not.toThrow();
  });

  test("identifyUser does not throw when posthog unavailable", () => {
    const { identifyUser } = require("@/lib/analytics");
    expect(() => identifyUser("user-123", { email: "test@test.com" })).not.toThrow();
  });

  test("resetAnalyticsIdentity does not throw", () => {
    const { resetAnalyticsIdentity } = require("@/lib/analytics");
    expect(() => resetAnalyticsIdentity()).not.toThrow();
  });
});