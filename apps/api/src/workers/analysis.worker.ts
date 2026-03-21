import { Worker, Job } from "bullmq";
import { db, medicalDocuments } from "@medbridge/db";
import { eq } from "drizzle-orm";
import axios from "axios";
import { connection } from "../lib/queue";
import { emitToUser } from "../lib/socket";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

export const analysisWorker = new Worker(
  "document-analysis",
  async (job: Job) => {
    const { documentId, fileUrl, docType } = job.data;

    console.log(`[WORKER]: Analyzing document ${documentId}...`);

    try {
      // 1. Update status to processing
      await db
        .update(medicalDocuments)
        .set({ status: "processing" })
        .where(eq(medicalDocuments.id, documentId));

      // 2. Call AI Service
      const response = await axios.post(`${AI_SERVICE_URL}/internal/document/analyze`, {
        fileUrl,
        docType,
      });

      const extraction = response.data;

      // 3. Update document with result
      const [updatedDoc] = await db
        .update(medicalDocuments)
        .set({
          status: "complete",
          extraction: JSON.stringify(extraction),
        })
        .where(eq(medicalDocuments.id, documentId))
        .returning();

      if (updatedDoc) {
        emitToUser(updatedDoc.userId, "document:analyzed", {
          ...updatedDoc,
          result: extraction,
        });
      }

      console.log(`[WORKER]: Document ${documentId} analyzed successfully.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[WORKER ERROR]: Failed to analyze document ${documentId}:`, message);
      
      await db
        .update(medicalDocuments)
        .set({ status: "failed" })
        .where(eq(medicalDocuments.id, documentId));
      
      throw err; // Allow BullMQ to retry
    }
  },
  { connection }
);

analysisWorker.on("completed", (job) => {
  console.log(`[WORKER]: Job ${job.id} completed.`);
});

analysisWorker.on("failed", (job, err) => {
  console.error(`[WORKER]: Job ${job?.id} failed with error: ${err.message}`);
});
