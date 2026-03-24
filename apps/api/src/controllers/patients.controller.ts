import { Request, Response } from "express";
import { db, clinicalCases } from "@medbridge/db";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/v1/patients
 * For now, this returns the list of unique patients/cases handled by the doctor.
 */
export const getMyPatients = async (req: Request, res: Response) => {
  const doctorId = req.headers["x-user-id"] as string;
  if (!doctorId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const cases = await db
      .select({
        id: clinicalCases.id,
        patientName: clinicalCases.patientName,
        patientAge: clinicalCases.patientAge,
        patientSex: clinicalCases.patientSex,
        chiefComplaint: clinicalCases.chiefComplaint,
        createdAt: clinicalCases.createdAt,
      })
      .from(clinicalCases)
      .where(eq(clinicalCases.doctorId, doctorId))
      .orderBy(desc(clinicalCases.createdAt));

    res.json(cases);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GET MY PATIENTS ERROR]:", msg);
    res.status(500).json({ error: "Failed to fetch patients", message: msg });
  }
};

/**
 * GET /api/v1/patients/:id
 * Get details of a specific case
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
    if (caseData.doctorId !== doctorId) return res.status(403).json({ error: "Access denied" });

    res.json({
      ...caseData,
      vitals: caseData.vitals ? JSON.parse(caseData.vitals) : {},
      analysis: caseData.analysis ? JSON.parse(caseData.analysis) : {},
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GET CASE DETAIL ERROR]:", msg);
    res.status(500).json({ error: "Failed to fetch case detail", message: msg });
  }
};
