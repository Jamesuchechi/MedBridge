/**
 * Unit Tests for Web Analytics
 * ================================
 */

describe("Analytics — graceful degradation without posthog", () => {
  // Use let to capture the track utility after imports
  let track: any;
  let identifyUser: any;
  let resetAnalyticsIdentity: any;
  
  const consoleSpy = jest.spyOn(console, "debug").mockImplementation(() => {});

  beforeEach(() => {
    jest.resetModules();
    // Lazy load the analytics module to ensure mocks/env are applied
    const analytics = require("@/lib/analytics");
    track = analytics.track;
    identifyUser = analytics.identifyUser;
    resetAnalyticsIdentity = analytics.resetAnalyticsIdentity;
  });

  afterEach(() => {
    consoleSpy.mockClear();
  });

  test("track.drugSearch does not throw when posthog unavailable", () => {
    expect(() =>
      track.drugSearch({ query: "paracetamol", resultCount: 5, source: "typesense" })
    ).not.toThrow();
  });

  test("track.pharmacySearched does not throw", () => {
    expect(() =>
      track.pharmacySearched({ usedGeolocation: true, resultCount: 3, source: "overpass" })
    ).not.toThrow();
  });

  test("identifyUser does not throw when posthog unavailable", () => {
    expect(() => identifyUser("user-123", { email: "test@test.com" })).not.toThrow();
  });

  test("resetAnalyticsIdentity does not throw", () => {
    expect(() => resetAnalyticsIdentity()).not.toThrow();
  });
});
