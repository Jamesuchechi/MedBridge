"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDocument = exports.getDocumentById = exports.getDocuments = exports.createDocument = exports.getUploadUrl = void 0;
const db_1 = require("@medbridge/db");
const drizzle_orm_1 = require("drizzle-orm");
const supabase_1 = require("../config/supabase");
const queue_1 = require("../lib/queue");
const zod_1 = require("zod");
const BUCKET_NAME = "medical-documents";
const createDocumentSchema = zod_1.z.object({
    fileName: zod_1.z.string().min(1),
    fileType: zod_1.z.string().min(1),
    docType: zod_1.z.enum(["lab_result", "prescription", "radiology", "report", "unknown"]),
    fileUrl: zod_1.z.string().url(),
});
const getUploadUrl = async (req, res) => {
    const userId = req.headers["x-user-id"];
    const { fileName } = req.query;
    if (!userId)
        return res.status(401).json({ error: "Unauthorized" });
    if (!fileName)
        return res.status(400).json({ error: "fileName is required" });
    const path = `${userId}/${Date.now()}_${fileName}`;
    try {
        const { data, error } = await supabase_1.supabase.storage
            .from(BUCKET_NAME)
            .createSignedUploadUrl(path);
        if (error)
            throw error;
        res.status(200).json({
            uploadUrl: data.signedUrl,
            fileUrl: `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${path}`,
            path,
        });
    }
    catch (err) {
        console.error("[GET UPLOAD URL ERROR]:", err);
        res.status(500).json({ error: "Failed to generate upload URL", message: err instanceof Error ? err.message : String(err) });
    }
};
exports.getUploadUrl = getUploadUrl;
const createDocument = async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId)
        return res.status(401).json({ error: "Unauthorized" });
    const validation = createDocumentSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ error: "Invalid request data", details: validation.error.format() });
    }
    const { docType, fileUrl } = validation.data;
    try {
        const [doc] = await db_1.db
            .insert(db_1.medicalDocuments)
            .values({
            userId,
            type: docType,
            fileUrl,
            status: "pending",
            createdAt: new Date(),
        })
            .returning();
        // Add to analysis queue
        await queue_1.documentAnalysisQueue.add("analyze-document", {
            documentId: doc.id,
            fileUrl,
            docType,
        });
        res.status(201).json(doc);
    }
    catch (err) {
        console.error("[CREATE DOCUMENT ERROR]:", err);
        res.status(500).json({ error: "Failed to create document record", message: err instanceof Error ? err.message : String(err) });
    }
};
exports.createDocument = createDocument;
const getDocuments = async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId)
        return res.status(401).json({ error: "Unauthorized" });
    try {
        const docs = await db_1.db
            .select()
            .from(db_1.medicalDocuments)
            .where((0, drizzle_orm_1.eq)(db_1.medicalDocuments.userId, userId))
            .orderBy((0, drizzle_orm_1.desc)(db_1.medicalDocuments.createdAt));
        const formatted = docs.map(d => ({
            ...d,
            result: d.extraction ? JSON.parse(d.extraction) : null,
        }));
        res.status(200).json(formatted);
    }
    catch (err) {
        console.error("[GET DOCUMENTS ERROR]:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getDocuments = getDocuments;
const getDocumentById = async (req, res) => {
    const userId = req.headers["x-user-id"];
    const { id } = req.params;
    if (!userId)
        return res.status(401).json({ error: "Unauthorized" });
    try {
        const [doc] = await db_1.db
            .select()
            .from(db_1.medicalDocuments)
            .where((0, drizzle_orm_1.eq)(db_1.medicalDocuments.id, id))
            .limit(1);
        if (!doc || doc.userId !== userId) {
            return res.status(404).json({ error: "Document not found" });
        }
        res.status(200).json({
            ...doc,
            result: doc.extraction ? JSON.parse(doc.extraction) : null,
        });
    }
    catch (err) {
        console.error("[GET DOCUMENT BY ID ERROR]:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getDocumentById = getDocumentById;
const deleteDocument = async (req, res) => {
    const userId = req.headers["x-user-id"];
    const { id } = req.params;
    if (!userId)
        return res.status(401).json({ error: "Unauthorized" });
    try {
        // Check ownership
        const [doc] = await db_1.db
            .select()
            .from(db_1.medicalDocuments)
            .where((0, drizzle_orm_1.eq)(db_1.medicalDocuments.id, id))
            .limit(1);
        if (!doc || doc.userId !== userId) {
            return res.status(404).json({ error: "Document not found" });
        }
        await db_1.db.delete(db_1.medicalDocuments).where((0, drizzle_orm_1.eq)(db_1.medicalDocuments.id, id));
        res.status(204).send();
    }
    catch (err) {
        console.error("[DELETE DOCUMENT ERROR]:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.deleteDocument = deleteDocument;
