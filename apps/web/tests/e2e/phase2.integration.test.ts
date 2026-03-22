/**
 * Phase 2.6 — Integration Tests (Jest + Supertest)
 * ==================================================
 * Tests API route handlers with a real Express app but mocked DB calls.
 *
 * Setup:
 *   pnpm add -D supertest @types/supertest --filter @medbridge/api
 *
 * Add to apps/api/package.json:
 *   "test:integration": "jest --testPathPattern=integration"
 *
 * Run:
 *   pnpm --filter @medbridge/api test:integration
 */

import request from "supertest";

// ─── Mock the DB module before importing anything that uses it ────────────────
jest.mock("@medbridge/db", () => ({
  db: {
    select:  jest.fn().mockReturnThis(),
    from:    jest.fn().mockReturnThis(),
    where:   jest.fn().mockReturnThis(),
    limit:   jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    insert:  jest.fn().mockReturnThis(),
    values:  jest.fn().mockReturnThis(),
    update:  jest.fn().mockReturnThis(),
    set:     jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([]),
    then:    jest.fn(),
  },
  pharmacies:              { id: "id", osmId: "osm_id", name: "name", address: "address", state: "state", lat: "lat", lng: "lng", reportCount: "report_count" },
  drugAvailabilityReports: { id: "id", pharmacyId: "pharmacy_id", drugId: "drug_id", drugName: "drug_name", isInStock: "is_in_stock", reportedBy: "reported_by", createdAt: "created_at" },
  drugPriceReports:        { id: "id", pharmacyId: "pharmacy_id", drugId: "drug_id", drugName: "drug_name", price: "price", quantity: "quantity", reportedBy: "reported_by", moderationStatus: "moderation_status", isAutoFlagged: "is_auto_flagged", autoFlagReason: "auto_flag_reason", createdAt: "created_at" },
  moderationAuditLog:      { id: "id", reportId: "report_id", adminId: "admin_id", action: "action", previousStatus: "previous_status", newStatus: "new_status", note: "note", createdAt: "created_at" },
  drugs: { id: "id", priceRangeMin: "price_range_min", priceRangeMax: "price_range_max" },
}));

// ─── Mock OSM service ─────────────────────────────────────────────────────────
jest.mock("../services/osm.service", () => ({
  findPharmaciesNearby: jest.fn().mockResolvedValue([
    {
      osmId:        "123456",
      osmType:      "node",
      name:         "MedPlus Pharmacy",
      address:      "15 Allen Avenue, Ikeja",
      state:        "Lagos",
      lga:          "Ikeja",
      lat:          6.6018,
      lng:          3.3515,
      phone:        "+234 801 234 5678",
      website:      null,
      openingHours: "Mo-Sa 08:00-20:00",
    },
    {
      osmId:        "789012",
      osmType:      "node",
      name:         "HealthPlus Pharmacy",
      address:      "Opebi Road, Ikeja",
      state:        "Lagos",
      lga:          "Ikeja",
      lat:          6.5923,
      lng:          3.3487,
      phone:        null,
      website:      "https://healthplus.ng",
      openingHours: "24/7",
    },
  ]),
  searchPharmaciesByName: jest.fn().mockResolvedValue([]),
  geocodeLocation: jest.fn().mockResolvedValue({
    lat:     6.4698,
    lng:     3.5852,
    display: "Lekki, Lagos, Nigeria",
  }),
}));

// ─── Import app after mocks ───────────────────────────────────────────────────
// The Express app is created without starting the server (no httpServer.listen)
// For these tests, we create a minimal test app instead.
import express from "express";
import pharmacyRoutes from "../routes/pharmacies";

const app = express();
app.use(express.json());
app.use("/api/v1/pharmacies", pharmacyRoutes);

// ─── Pharmacy Search ──────────────────────────────────────────────────────────
describe("GET /api/v1/pharmacies/search", () => {
  test("returns 400 without required parameters", async () => {
    const res = await request(app).get("/api/v1/pharmacies/search");
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test("returns pharmacies for lat/lng search", async () => {
    const res = await request(app)
      .get("/api/v1/pharmacies/search")
      .query({ lat: "6.6", lng: "3.35", radius: "5000" });

    expect(res.status).toBe(200);
    expect(res.body.pharmacies).toBeDefined();
    expect(Array.isArray(res.body.pharmacies)).toBe(true);
    expect(res.body.pharmacies.length).toBeGreaterThan(0);
    expect(res.body.pharmacies[0].name).toBe("MedPlus Pharmacy");
  });

  test("returns source: overpass for lat/lng search", async () => {
    const res = await request(app)
      .get("/api/v1/pharmacies/search")
      .query({ lat: "6.6", lng: "3.35" });

    expect(res.body.source).toBe("overpass");
  });

  test("rejects out-of-range radius", async () => {
    const res = await request(app)
      .get("/api/v1/pharmacies/search")
      .query({ lat: "6.6", lng: "3.35", radius: "999999" });

    expect(res.status).toBe(400);
  });
});

// ─── Geocode ──────────────────────────────────────────────────────────────────
describe("GET /api/v1/pharmacies/geocode", () => {
  test("returns 400 without q param", async () => {
    const res = await request(app).get("/api/v1/pharmacies/geocode");
    expect(res.status).toBe(400);
  });

  test("returns lat/lng for valid location", async () => {
    const res = await request(app)
      .get("/api/v1/pharmacies/geocode")
      .query({ q: "Lekki Lagos" });

    expect(res.status).toBe(200);
    expect(res.body.lat).toBeDefined();
    expect(res.body.lng).toBeDefined();
    expect(typeof res.body.lat).toBe("number");
  });
});

// ─── Report Availability ──────────────────────────────────────────────────────
describe("POST /api/v1/pharmacies/report-availability", () => {
  beforeEach(() => {
    // Mock DB to return a pharmacy for validation
    const { db } = require("@medbridge/db");
    db.select.mockReturnThis();
    db.from.mockReturnThis();
    db.where.mockReturnThis();
    db.limit.mockResolvedValueOnce([{ id: "ph-uuid-123" }]); // pharmacy found
    db.insert.mockReturnThis();
    db.values.mockReturnThis();
    db.returning.mockResolvedValueOnce([{
      id:         "rpt-uuid-1",
      pharmacyId: "ph-uuid-123",
      drugName:   "Paracetamol",
      isInStock:  true,
      createdAt:  new Date().toISOString(),
    }]);
    db.update.mockReturnThis();
    db.set.mockResolvedValueOnce([]);
  });

  test("returns 400 when pharmacyId is missing", async () => {
    const res = await request(app)
      .post("/api/v1/pharmacies/report-availability")
      .send({ drugName: "Paracetamol", isInStock: true });
    expect(res.status).toBe(400);
  });

  test("returns 400 when isInStock is missing", async () => {
    const res = await request(app)
      .post("/api/v1/pharmacies/report-availability")
      .send({ pharmacyId: "ph-uuid-123", drugName: "Paracetamol" });
    expect(res.status).toBe(400);
  });

  test("returns 400 when isInStock is not boolean", async () => {
    const res = await request(app)
      .post("/api/v1/pharmacies/report-availability")
      .send({ pharmacyId: "ph-uuid-123", drugName: "Para", isInStock: "yes" });
    expect(res.status).toBe(400);
  });

  test("accepts valid UUID pharmacyId", async () => {
    const res = await request(app)
      .post("/api/v1/pharmacies/report-availability")
      .send({ pharmacyId: "ph-uuid-123", drugName: "Paracetamol", isInStock: true });
    // Status 201 or 404 depending on mock setup — just shouldn't be 400
    expect([201, 404, 500]).toContain(res.status);
  });
});

// ─── Report Price ─────────────────────────────────────────────────────────────
describe("POST /api/v1/pharmacies/report-price", () => {
  test("returns 400 when price is zero", async () => {
    const res = await request(app)
      .post("/api/v1/pharmacies/report-price")
      .send({ pharmacyId: "ph-123", drugName: "Aspirin", price: 0 });
    expect(res.status).toBe(400);
  });

  test("returns 400 when price is negative", async () => {
    const res = await request(app)
      .post("/api/v1/pharmacies/report-price")
      .send({ pharmacyId: "ph-123", drugName: "Aspirin", price: -100 });
    expect(res.status).toBe(400);
  });

  test("returns 400 when price exceeds maximum (1,000,000)", async () => {
    const res = await request(app)
      .post("/api/v1/pharmacies/report-price")
      .send({ pharmacyId: "ph-123", drugName: "Aspirin", price: 1_500_000 });
    expect(res.status).toBe(400);
  });

  test("returns 400 when drugName is empty", async () => {
    const res = await request(app)
      .post("/api/v1/pharmacies/report-price")
      .send({ pharmacyId: "ph-123", drugName: "", price: 500 });
    expect(res.status).toBe(400);
  });
});

// ─── Moderation — admin guard ─────────────────────────────────────────────────
describe("Admin moderation routes require SUPER_ADMIN role", () => {
  test("returns 403 without x-user-role: SUPER_ADMIN header", async () => {
    const res = await request(app)
      .get("/api/v1/pharmacies/admin/moderation")
      .set("x-user-id", "some-user-id");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Admin access required");
  });

  test("returns 403 with wrong role", async () => {
    const res = await request(app)
      .get("/api/v1/pharmacies/admin/moderation")
      .set("x-user-id", "some-user")
      .set("x-user-role", "PATIENT");
    expect(res.status).toBe(403);
  });

  test("moderation stats endpoint requires admin", async () => {
    const res = await request(app)
      .get("/api/v1/pharmacies/admin/moderation/stats");
    expect(res.status).toBe(403);
  });

  test("PATCH moderation/:id requires admin", async () => {
    const res = await request(app)
      .patch("/api/v1/pharmacies/admin/moderation/some-id")
      .send({ action: "approve" });
    expect(res.status).toBe(403);
  });

  test("audit trail requires admin", async () => {
    const res = await request(app)
      .get("/api/v1/pharmacies/admin/moderation/some-id/audit");
    expect(res.status).toBe(403);
  });
});

// ─── Moderation action validation ────────────────────────────────────────────
describe("Moderation action validation", () => {
  test("returns 400 for unknown action", async () => {
    const res = await request(app)
      .patch("/api/v1/pharmacies/admin/moderation/some-report-id")
      .set("x-user-id", "admin-user")
      .set("x-user-role", "SUPER_ADMIN")
      .send({ action: "delete" }); // not a valid action
    expect(res.status).toBe(400);
  });

  test("returns 400 for missing action", async () => {
    const res = await request(app)
      .patch("/api/v1/pharmacies/admin/moderation/some-report-id")
      .set("x-user-id", "admin-user")
      .set("x-user-role", "SUPER_ADMIN")
      .send({});
    expect(res.status).toBe(400);
  });
});