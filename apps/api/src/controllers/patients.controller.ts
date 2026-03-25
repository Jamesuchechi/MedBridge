import { Request, Response } from "express";
import { db, users, clinicPatients, patientClinicConsent } from "@medbridge/db";
import { eq, and, or, sql, desc, ilike } from "drizzle-orm";
import { RegistrationService } from "../services/registration.service";
import { addImportJob } from "../queues/import.queue";

export class PatientsController {
  /** Register a patient in the clinic. Links existing user or creates new one. */
  static async registerPatient(req: Request, res: Response) {
    const { clinicId } = req;
    const { email, phone } = req.body;

    if (!clinicId) return res.status(403).json({ error: "Clinic access required." });
    if (!email && !phone) return res.status(400).json({ error: "Email or phone required." });

    try {
      const user = await RegistrationService.performRegistration(clinicId, req.body);
      return res.status(201).json({ 
        message: "Patient processed successfully.",
        patient: user 
      });

    } catch (err) {
      console.error("[registerPatient]:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  /** List patients associated with the clinic. */
  static async listPatients(req: Request, res: Response) {
    const { clinicId } = req;
    const query = req.query.q as string;
    const page = parseInt(req.query.page as string || "1", 10);
    const limit = 20;
    const offset = (page - 1) * limit;

    if (!clinicId) return res.status(403).json({ error: "Clinic access required." });

    try {
      const data = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          status: clinicPatients.status,
          createdAt: clinicPatients.createdAt,
        })
        .from(clinicPatients)
        .innerJoin(users, eq(clinicPatients.patientId, users.id))
        .where(
          and(
            eq(clinicPatients.clinicId, clinicId),
            query ? or(ilike(users.name, `%${query}%`), ilike(users.email, `%${query}%`)) : undefined
          )
        )
        .limit(limit)
        .offset(offset)
        .orderBy(desc(clinicPatients.createdAt));

      const [{ count }] = await db
        .select({ count: sql`count(*)` })
        .from(clinicPatients)
        .where(eq(clinicPatients.clinicId, clinicId));

      return res.status(200).json({
        patients: data,
        pagination: {
          total: Number(count),
          page,
          pages: Math.ceil(Number(count) / limit),
        },
      });
    } catch (err) {
      console.error("[listPatients]:", err);
      return res.status(500).json({ error: "Failed to fetch patients." });
    }
  }

  /** Universal Import: Extracts patients from file and registers them in background. */
  static async importPatients(req: Request, res: Response) {
    const { clinicId } = req;
    const file = req.file;

    if (!clinicId) return res.status(403).json({ error: "Clinic access required." });
    if (!file) return res.status(400).json({ error: "No file uploaded." });

    try {
      // Add job to background queue
      await addImportJob({
        clinicId,
        fileBuffer: file.buffer.toString("base64"),
        mimeType: file.mimetype,
        filename: file.originalname,
      });

      return res.status(202).json({
        message: "Import started in background. Patients will appear in the directory shortly.",
        code: "IMPORT_QUEUED",
      });
    } catch (err) {
      console.error("[importPatients]:", err);
      return res.status(500).json({ error: "Failed to queue import." });
    }
  }

  /** Get detailed patient view for clinic staff. */
  static async getPatientDetail(req: Request, res: Response) {
    const { clinicId } = req;
    const { id: patientId } = req.params;

    if (!clinicId) return res.status(403).json({ error: "Clinic access required." });

    try {
      // 1. Verify link
      const link = await db.query.clinicPatients.findFirst({
        where: and(eq(clinicPatients.clinicId, clinicId), eq(clinicPatients.patientId, patientId)),
      });

      if (!link) return res.status(404).json({ error: "Patient not found in this clinic." });

      // 2. Fetch user and profile
      const user = await db.query.users.findFirst({
        where: eq(users.id, patientId),
        with: {
          healthProfile: true,
        }
      });

      // 3. Fetch consent status
      const consent = await db.query.patientClinicConsent.findFirst({
        where: and(eq(patientClinicConsent.clinicId, clinicId), eq(patientClinicConsent.patientId, patientId)),
      });

      return res.status(200).json({
        ...user,
        clinicLink: link,
        consent,
      });
    } catch (err) {
      console.error("[getPatientDetail]:", err);
      return res.status(500).json({ error: "Failed to fetch patient details." });
    }
  }
}
