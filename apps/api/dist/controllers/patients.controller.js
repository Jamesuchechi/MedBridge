"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCaseDetail = exports.getMyPatients = void 0;
const db_1 = require("@medbridge/db");
const drizzle_orm_1 = require("drizzle-orm");
const consent_controller_1 = require("./consent.controller");
/**
 * GET /api/v1/patients
 * Returns cases handled by the doctor OR patients who have granted consent.
 */
const getMyPatients = async (req, res) => {
    const doctorId = req.headers["x-user-id"];
    if (!doctorId)
        return res.status(401).json({ error: "Unauthorized" });
    try {
        // 1. Get cases where doctor is the owner
        const ownCases = await db_1.db
            .select({
            id: db_1.clinicalCases.id,
            patientName: db_1.clinicalCases.patientName,
            patientAge: db_1.clinicalCases.patientAge,
            patientSex: db_1.clinicalCases.patientSex,
            chiefComplaint: db_1.clinicalCases.chiefComplaint,
            createdAt: db_1.clinicalCases.createdAt,
            isShared: (0, drizzle_orm_1.sql) `false`.as("is_shared"),
        })
            .from(db_1.clinicalCases)
            .where((0, drizzle_orm_1.eq)(db_1.clinicalCases.doctorId, doctorId));
        // 2. Get clinic records for patients who granted consent to this doctor
        const activeConsents = await db_1.db
            .select({ patientId: db_1.patientDoctorConsent.patientId })
            .from(db_1.patientDoctorConsent)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.patientDoctorConsent.doctorId, doctorId), (0, drizzle_orm_1.eq)(db_1.patientDoctorConsent.status, "active")));
        const patientIds = activeConsents.map(c => c.patientId);
        let sharedCases = [];
        if (patientIds.length > 0) {
            sharedCases = await db_1.db
                .select({
                id: db_1.clinicalCases.id,
                patientName: db_1.clinicalCases.patientName,
                patientAge: db_1.clinicalCases.patientAge,
                patientSex: db_1.clinicalCases.patientSex,
                chiefComplaint: db_1.clinicalCases.chiefComplaint,
                createdAt: db_1.clinicalCases.createdAt,
                isShared: (0, drizzle_orm_1.sql) `true`.as("is_shared"),
            })
                .from(db_1.clinicalCases)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(db_1.clinicalCases.patientId, patientIds), 
            // Don't duplicate if doctor is already the owner
            (0, drizzle_orm_1.sql) `${db_1.clinicalCases.doctorId} != ${doctorId}`));
        }
        const allCases = [...ownCases, ...sharedCases].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        res.json(allCases);
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
 * Get details of a specific case with consent check
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
            const hasConsent = await consent_controller_1.ConsentController.checkConsent(caseData.patientId, doctorId);
            if (hasConsent) {
                return res.json({
                    ...caseData,
                    vitals: caseData.vitals ? JSON.parse(caseData.vitals) : {},
                    analysis: caseData.analysis ? JSON.parse(caseData.analysis) : {},
                });
            }
        }
        return res.status(403).json({ error: "Access denied. Patient consent required." });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[GET CASE DETAIL ERROR]:", msg);
        res.status(500).json({ error: "Failed to fetch case detail", message: msg });
    }
};
exports.getCaseDetail = getCaseDetail;
