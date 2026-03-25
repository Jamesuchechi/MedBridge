import request from "supertest";
import express from "express";
import clinicRoutes from "../../routes/clinics";
import * as dbModule from "@medbridge/db";

// Cast the db as a mocked object for testing
const mockDb = dbModule.db as unknown as Record<string, jest.Mock>;

// ─── Mock the DB module ──────────────────────────────────────────────────────
jest.mock("@medbridge/db", () => ({
  db: {
    select:  jest.fn().mockReturnThis(),
    from:    jest.fn().mockReturnThis(),
    where:   jest.fn().mockReturnThis(),
    limit:   jest.fn().mockReturnThis(),
    offset:  jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    insert:  jest.fn().mockReturnThis(),
    values:  jest.fn().mockReturnThis(),
    update:  jest.fn().mockReturnThis(),
    set:     jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([]),
    transaction: jest.fn((cb) => cb({
      update: jest.fn().mockReturnThis(),
      set:    jest.fn().mockReturnThis(),
      where:  jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
    })),
  },
  clinics: { id: "id", name: "name", verificationStatus: "verification_status", createdAt: "created_at" },
  users:   { id: "id", clinicId: "clinic_id", role: "role" },
  clinicVerificationAudit: { id: "id" },
  clinicInvitations:      { id: "id" },
}));

const app = express();
app.use(express.json());
app.use("/api/v1/clinics", clinicRoutes);

describe("Clinics API", () => {
  describe("POST /api/v1/clinics/register", () => {
    test("returns 400 for missing fields", async () => {
      const res = await request(app)
        .post("/api/v1/clinics/register")
        .send({ name: "Test Clinic" });
      expect(res.status).toBe(400);
    });

    test("registers a clinic and links the user", async () => {
      (mockDb.returning).mockResolvedValueOnce([{ id: "clinic-123", name: "HealthFirst" }]);

      const res = await request(app)
        .post("/api/v1/clinics/register")
        .set("x-user-id", "user-456")
        .send({
          name: "HealthFirst",
          email: "contact@healthfirst.com",
          state: "Lagos",
          cacNumber: "RC-123456",
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe("clinic-123");
    });
  });

  describe("GET /api/v1/clinics/admin/queue", () => {
    test("denies access to non-admins", async () => {
      const res = await request(app)
        .get("/api/v1/clinics/admin/queue")
        .set("x-user-role", "PATIENT");
      expect(res.status).toBe(403);
    });

    test("returns queue for super admins", async () => {
      (mockDb.limit).mockResolvedValueOnce([{ id: "c1", name: "Clinic A" }]);
      (mockDb.select).mockResolvedValueOnce([{ count: 1 }]);

      const res = await request(app)
        .get("/api/v1/clinics/admin/queue")
        .set("x-user-role", "SUPER_ADMIN");

      expect(res.status).toBe(200);
      expect(res.body.clinics).toBeDefined();
    });
  });

  describe("POST /api/v1/clinics/invite", () => {
    test("requires verified clinic admin", async () => {
      // Mock user not having a clinic
      (mockDb.limit).mockResolvedValueOnce([]); 

      const res = await request(app)
        .post("/api/v1/clinics/invite")
        .set("x-user-id", "u1")
        .set("x-user-role", "CLINIC_ADMIN")
        .send({ email: "staff@test.com", role: "CLINICIAN" });

      expect(res.status).toBe(403);
    });
  });
});
