import { Queue } from "bullmq";
import { Redis } from "ioredis";

const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const importQueue = new Queue("patient-import", { connection });

export async function addImportJob(data: { clinicId: string; fileBuffer: string; mimeType: string; filename: string }) {
  await importQueue.add("process-import", data, {
    removeOnComplete: true,
    removeOnFail: 1000,
  });
}
