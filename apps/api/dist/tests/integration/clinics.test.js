"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const clinics_1 = __importDefault(require("../../routes/clinics"));
const dbModule = __importStar(require("@medbridge/db"));
// ─── Mock the DB module ──────────────────────────────────────────────────────
jest.mock("@medbridge/db", () => ({
    db: {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
        transaction: jest.fn((cb) => cb({
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            values: jest.fn().mockReturnThis(),
        })),
    },
    clinics: { id: "id", name: "name", verificationStatus: "verification_status", createdAt: "created_at" },
    users: { id: "id", clinicId: "clinic_id", role: "role" },
    clinicVerificationAudit: { id: "id" },
    clinicInvitations: { id: "id" },
}));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use("/api/v1/clinics", clinics_1.default);
describe("Clinics API", () => {
    describe("POST /api/v1/clinics/register", () => {
        test("returns 400 for missing fields", async () => {
            const res = await (0, supertest_1.default)(app)
                .post("/api/v1/clinics/register")
                .send({ name: "Test Clinic" });
            expect(res.status).toBe(400);
        });
        test("registers a clinic and links the user", async () => {
            dbModule.db.returning.mockResolvedValueOnce([{ id: "clinic-123", name: "HealthFirst" }]);
            const res = await (0, supertest_1.default)(app)
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
            const res = await (0, supertest_1.default)(app)
                .get("/api/v1/clinics/admin/queue")
                .set("x-user-role", "PATIENT");
            expect(res.status).toBe(403);
        });
        test("returns queue for super admins", async () => {
            dbModule.db.limit.mockResolvedValueOnce([{ id: "c1", name: "Clinic A" }]);
            dbModule.db.select.mockResolvedValueOnce([{ count: 1 }]);
            const res = await (0, supertest_1.default)(app)
                .get("/api/v1/clinics/admin/queue")
                .set("x-user-role", "SUPER_ADMIN");
            expect(res.status).toBe(200);
            expect(res.body.clinics).toBeDefined();
        });
    });
    describe("POST /api/v1/clinics/invite", () => {
        test("requires verified clinic admin", async () => {
            // Mock user not having a clinic
            dbModule.db.limit.mockResolvedValueOnce([]);
            const res = await (0, supertest_1.default)(app)
                .post("/api/v1/clinics/invite")
                .set("x-user-id", "u1")
                .set("x-user-role", "CLINIC_ADMIN")
                .send({ email: "staff@test.com", role: "CLINICIAN" });
            expect(res.status).toBe(403);
        });
    });
});
