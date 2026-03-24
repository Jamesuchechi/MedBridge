import { Request, Response } from "express";
import { db, clinicalCases, patientDoctorConsent } from "@medbridge/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { ConsentController } from "./consent.controller";

interface SharedPatientCase {
  id: string;
  patientName: string;
  patientAge: string;
  patientSex: string;
  chiefComplaint: string;
  createdAt: Date;
  isShared: boolean;
}

/**
 * GET /api/v1/patients
 * Returns cases handled by the doctor OR patients who have granted consent.
 */
export const getMyPatients = async (req: Request, res: Response) => {
  const doctorId = req.headers["x-user-id"] as string;
  if (!doctorId) return res.status(401).json({ error: "Unauthorized" });

  try {
    // 1. Get cases where doctor is the owner
    const ownCases = await db
      .select({
        id: clinicalCases.id,
        patientName: clinicalCases.patientName,
        patientAge: clinicalCases.patientAge,
        patientSex: clinicalCases.patientSex,
        chiefComplaint: clinicalCases.chiefComplaint,
        createdAt: clinicalCases.createdAt,
        isShared: sql<boolean>`false`.as("is_shared"),
      })
      .from(clinicalCases)
      .where(eq(clinicalCases.doctorId, doctorId));

    // 2. Get clinic records for patients who granted consent to this doctor
    const activeConsents = await db
      .select({ patientId: patientDoctorConsent.patientId })
      .from(patientDoctorConsent)
      .where(
        and(
          eq(patientDoctorConsent.doctorId, doctorId),
          eq(patientDoctorConsent.status, "active")
        )
      );

    const patientIds = activeConsents.map(c => c.patientId);

    let sharedCases: SharedPatientCase[] = [];
    if (patientIds.length > 0) {
      sharedCases = await db
        .select({
          id: clinicalCases.id,
          patientName: clinicalCases.patientName,
          patientAge: clinicalCases.patientAge,
          patientSex: clinicalCases.patientSex,
          chiefComplaint: clinicalCases.chiefComplaint,
          createdAt: clinicalCases.createdAt,
          isShared: sql<boolean>`true`.as("is_shared"),
        })
        .from(clinicalCases)
        .where(
          and(
            inArray(clinicalCases.patientId, patientIds),
            // Don't duplicate if doctor is already the owner
            sql`${clinicalCases.doctorId} != ${doctorId}`
          )
        );
    }

    const allCases = [...ownCases, ...sharedCases].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.json(allCases);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GET MY PATIENTS ERROR]:", msg);
    res.status(500).json({ error: "Failed to fetch patients", message: msg });
  }
};

/**
 * GET /api/v1/patients/:id
 * Get details of a specific case with consent check
 */
export const getCaseDetail = async (req: Request, res: Response) => {
  const doctorId = req.headers["x-user-id"] as string;
  const { id } = req.params;

  try {
    const [caseData] = await db
      .select()
      .from(clinicalCases)
      .where(eq(clinicalCases.id, id))
      .limit(1);

    if (!caseData) return res.status(404).json({ error: "Case not found" });

    // Check ownership
    if (caseData.doctorId === doctorId) {
      return res.json({
        ...caseData,
        vitals: caseData.vitals ? JSON.parse(caseData.vitals) : {},
        analysis: caseData.analysis ? JSON.parse(caseData.analysis) : {},
      });
    }

    // Check consent if requester is not owner
    if (caseData.patientId) {
      const hasConsent = await ConsentController.checkConsent(caseData.patientId, doctorId);
      if (hasConsent) {
        return res.json({
          ...caseData,
          vitals: caseData.vitals ? JSON.parse(caseData.vitals) : {},
          analysis: caseData.analysis ? JSON.parse(caseData.analysis) : {},
        });
      }
    }

    return res.status(403).json({ error: "Access denied. Patient consent required." });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GET CASE DETAIL ERROR]:", msg);
    res.status(500).json({ error: "Failed to fetch case detail", message: msg });
  }
};
