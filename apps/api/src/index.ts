import * as Sentry from "@sentry/node";
import "./env";

Sentry.init({
  dsn: process.env.SENTRY_DSN || "https://placeholder@sentry.io/medbridge-api",
  tracesSampleRate: 1.0,
});
import express, { Request, Response } from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { db, users, healthProfiles, UserRole } from "@medbridge/db";

import { eq } from "drizzle-orm";

import { initSocket } from "./lib/socket";
import profileRoutes from "./routes/profile";
import symptomRoutes from "./routes/symptoms";
import documentRoutes from "./routes/documents";
import pharmaciesRoutes from "./routes/pharmacies";
import drugRoutes from "./routes/drugs";
import doctorRoutes from "./routes/doctors";
import labsRoutes from "./routes/labs";
import billingRoutes from "./routes/billing";
import insuranceRoutes from "./routes/insurance";
import clinicRoutes from "./routes/clinics";
import copilotRoutes from "./routes/copilot";
import patientsRoutes from "./routes/patients";
import notificationRoutes from "./routes/notifications";
import referralRoutes from "./routes/referrals";
import appointmentsRoutes from "./routes/appointments";
import encounterRoutes from "./routes/encounters";
import prescriptionRoutes from "./routes/prescriptions";
import labOrderRoutes from "./routes/lab-orders";
import invoiceRoutes from "./routes/invoices";
import paymentRoutes from "./routes/payments";
import employerRoutes from "./routes/employer";
import { DoctorsController } from "./controllers/doctors.controller";
import { ConsultationsController } from "./controllers/consultations.controller";
import { ConsentController } from "./controllers/consent.controller";
import { analysisWorker } from "./workers/analysis.worker";

const app = express();
const port = process.env.PORT || 4000;

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use("/api/", limiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/symptoms", symptomRoutes);
app.use("/api/v1/documents", documentRoutes);
app.use("/api/v1/pharmacies", pharmaciesRoutes);
app.use("/api/v1/drugs", drugRoutes);
app.use("/api/v1/doctors", doctorRoutes);
app.use("/api/v1/clinics", clinicRoutes);
app.use("/api/v1/copilot", copilotRoutes);
app.use("/api/v1/patients", patientsRoutes);
app.use("/api/v1/labs", labsRoutes);
app.use("/api/v1/lab-orders", labOrderRoutes);
app.use("/api/v1/billing", billingRoutes); 
app.use("/api/v1/invoices", invoiceRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/insurance", insuranceRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/referrals", referralRoutes);
app.use("/api/v1/appointments", appointmentsRoutes);
app.use("/api/v1/encounters", encounterRoutes);
app.use("/api/v1/prescriptions", prescriptionRoutes);
app.use("/api/v1/employer", employerRoutes);


// --- DOCTORS ---
app.get("/api/v1/doctors/search", (req, res) => DoctorsController.searchDoctors(req, res));
app.get("/api/v1/doctors/:id", (req, res) => DoctorsController.getDoctorDetail(req, res));

// --- CONSULTATIONS ---
app.post("/api/v1/consultations", (req, res) => ConsultationsController.createRequest(req, res));
app.get("/api/v1/consultations", (req, res) => ConsultationsController.listRequests(req, res));
app.patch("/api/v1/consultations/:id/status", (req, res) => ConsultationsController.updateStatus(req, res));

// --- CONSENT ---
app.post("/api/v1/consent/grant", (req, res) => ConsentController.grantConsent(req, res));
app.post("/api/v1/consent/revoke", (req, res) => ConsentController.revokeConsent(req, res));
app.get("/api/v1/consent/doctors", (req, res) => ConsentController.listConsentedDoctors(req, res));

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/db-test", async (req: Request, res: Response) => {
  try {
    const allUsers = await db.select().from(users).limit(1);
    res.status(200).json({ status: "connected", userCount: allUsers.length });
  } catch (err) {
    res.status(500).json({ status: "error", message: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/auth/sync", async (req: Request, res: Response) => {
  const { id, email, name, role } = req.body;

  if (!id || !email) {
    return res.status(400).json({ error: "Missing id or email" });
  }

  try {
    // Helper to map role from auth metadata to DB enum
    const mapUserRole = (rawRole?: string): UserRole => {
      const r = (rawRole || "").toUpperCase();
      if (r === "DOCTOR") return "CLINICIAN";
      if (r === "CLINIC") return "CLINIC_ADMIN";
      const valid = ["PATIENT", "CLINICIAN", "CLINIC_STAFF", "CLINIC_ADMIN", "SUPER_ADMIN", "EMPLOYER"] as const;
      return (valid as readonly string[]).includes(r) ? (r as UserRole) : "PATIENT";
    };


    const finalRole = mapUserRole(role);

    // 1. Upsert user
    const [user] = await db
      .insert(users)
      .values({
        id,
        email,
        name: name || null,
        role: finalRole,
        isVerified: true,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          name: name || null,
          role: finalRole,
          updatedAt: new Date(),
        },
      })
      .returning();

    // 2. Initialize health profile for PATIENTs
    if (user.role === "PATIENT") {
      const existing = await db
        .select()
        .from(healthProfiles)
        .where(eq(healthProfiles.userId, user.id))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(healthProfiles).values({
          userId: user.id,
        });
      }
    }

    res.status(200).json({ status: "synced", user });
  } catch (err) {
    console.error("[SYNC ERROR]:", err);
    res.status(500).json({ error: "Sync failed", message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── Server ──────────────────────────────────────────────────────────────────
const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(port, () => {
  console.log(`[API]: Server is running at http://localhost:${port}`);
  console.log(`[API]: Worker "${analysisWorker.name}" is listening for jobs.`);
});

export default app;
