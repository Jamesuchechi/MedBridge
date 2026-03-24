"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCaseDetail = exports.getMyPatients = void 0;
const db_1 = require("@medbridge/db");
const drizzle_orm_1 = require("drizzle-orm");
/**
 * GET /api/v1/patients
 * For now, this returns the list of unique patients/cases handled by the doctor.
 */
const getMyPatients = async (req, res) => {
    const doctorId = req.headers["x-user-id"];
    if (!doctorId)
        return res.status(401).json({ error: "Unauthorized" });
    try {
        const cases = await db_1.db
            .select({
            id: db_1.clinicalCases.id,
            patientName: db_1.clinicalCases.patientName,
            patientAge: db_1.clinicalCases.patientAge,
            patientSex: db_1.clinicalCases.patientSex,
            chiefComplaint: db_1.clinicalCases.chiefComplaint,
            createdAt: db_1.clinicalCases.createdAt,
        })
            .from(db_1.clinicalCases)
            .where((0, drizzle_orm_1.eq)(db_1.clinicalCases.doctorId, doctorId))
            .orderBy((0, drizzle_orm_1.desc)(db_1.clinicalCases.createdAt));
        res.json(cases);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[GET MY PATIENTS ERROR]:", msg);
        res.status(500).json({ error: "Failed to fetch patients", message: msg });
    }
};
exports.getMyPatients = getMyPatients;
/**
 * GET /api/v1/patients/:id
 * Get details of a specific case
 */
const getCaseDetail = async (req, res) => {
    const doctorId = req.headers["x-user-id"];
    const { id } = req.params;
    try {
        const [caseData] = await db_1.db
            .select()
            .from(db_1.clinicalCases)
            .where((0, drizzle_orm_1.eq)(db_1.clinicalCases.id, id))
            .limit(1);
        if (!caseData)
            return res.status(404).json({ error: "Case not found" });
        if (caseData.doctorId !== doctorId)
            return res.status(403).json({ error: "Access denied" });
        res.json({
            ...caseData,
            vitals: caseData.vitals ? JSON.parse(caseData.vitals) : {},
            analysis: caseData.analysis ? JSON.parse(caseData.analysis) : {},
        });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[GET CASE DETAIL ERROR]:", msg);
        res.status(500).json({ error: "Failed to fetch case detail", message: msg });
    }
};
exports.getCaseDetail = getCaseDetail;
