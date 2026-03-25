"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analysisWorker = void 0;
const bullmq_1 = require("bullmq");
const db_1 = require("@medbridge/db");
const drizzle_orm_1 = require("drizzle-orm");
const axios_1 = __importDefault(require("axios"));
const queue_1 = require("../lib/queue");
const socket_1 = require("../lib/socket");
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
exports.analysisWorker = new bullmq_1.Worker("document-analysis", async (job) => {
    const { documentId, fileUrl, docType } = job.data;
    console.log(`[WORKER]: Analyzing document ${documentId}...`);
    try {
        // 1. Update status to processing
        await db_1.db
            .update(db_1.medicalDocuments)
            .set({ status: "processing" })
            .where((0, drizzle_orm_1.eq)(db_1.medicalDocuments.id, documentId));
        // 2. Call AI Service
        const response = await axios_1.default.post(`${AI_SERVICE_URL}/internal/document/analyze`, {
            fileUrl,
            docType,
        });
        const extraction = response.data;
        // 3. Update document with result
        const [updatedDoc] = await db_1.db
            .update(db_1.medicalDocuments)
            .set({
            status: "complete",
            extraction: JSON.stringify(extraction),
        })
            .where((0, drizzle_orm_1.eq)(db_1.medicalDocuments.id, documentId))
            .returning();
        if (updatedDoc) {
            (0, socket_1.emitToUser)(updatedDoc.userId, "document:analyzed", {
                ...updatedDoc,
                result: extraction,
            });
        }
        console.log(`[WORKER]: Document ${documentId} analyzed successfully.`);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[WORKER ERROR]: Failed to analyze document ${documentId}:`, message);
        await db_1.db
            .update(db_1.medicalDocuments)
            .set({ status: "failed" })
            .where((0, drizzle_orm_1.eq)(db_1.medicalDocuments.id, documentId));
        throw err; // Allow BullMQ to retry
    }
}, { connection: queue_1.connection });
exports.analysisWorker.on("completed", (job) => {
    console.log(`[WORKER]: Job ${job.id} completed.`);
});
exports.analysisWorker.on("failed", (job, err) => {
    console.error(`[WORKER]: Job ${job?.id} failed with error: ${err.message}`);
});
