import { Worker, Job } from "bullmq";
import { Redis } from "ioredis";
import { ImportService } from "../services/import.service";
import { RegistrationService } from "../services/registration.service";

const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const importWorker = new Worker(
  "patient-import",
  async (job: Job) => {
    const { clinicId, fileBuffer, mimeType, filename } = job.data;
    
    // Convert base64 back to buffer
    const buffer = Buffer.from(fileBuffer, "base64");
    
    console.log(`[ImportWorker] Processing import for clinic ${clinicId}: ${filename}`);
    
    try {
      const extracted = await ImportService.extract(buffer, mimeType, filename);
      
      const results: { status: string; message?: string; id?: string }[] = [];
      const extractedList = extracted as Array<{ name?: string; email?: string; phone?: string }>;
      
      for (const p of extractedList) {
         if (!p.name && !p.email && !p.phone) continue;
         try {
           const result = await RegistrationService.performRegistration(clinicId, p);
           results.push({ ...p, status: "success", id: (result as { id: string }).id });
         } catch (e) {
           results.push({ ...p, status: "error", message: (e as Error).message });
         }
      }
      
      console.log(`[ImportWorker] Import completed: ${results.filter(r => r.status === "success").length} succeeded.`);
      return results;
    } catch (err) {
      console.error(`[ImportWorker] Critical failure for job ${job.id}:`, err);
      throw err;
    }
  },
  { connection }
);

importWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed!`);
});

importWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed: ${err.message}`);
});
