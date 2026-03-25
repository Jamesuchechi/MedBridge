import { Worker, Job } from "bullmq";
import { db, appointments, users, clinics } from "@medbridge/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { addHours } from "date-fns";
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const connection = new Redis(REDIS_URL);

/**
 * Reminder Worker:
 * Runs periodically (every hour) to find appointments happening in the next 24 hours
 * and sends reminders to patients.
 */
export const reminderWorker = new Worker(
  "appointment-reminders",
  async (_job: Job) => {
    console.log(`[ReminderWorker]: Checking for appointments to remind...`);

    // Look for appointments starting between 23 and 24 hours from now
    const now = new Date();
    const rangeStart = addHours(now, 23);
    const rangeEnd = addHours(now, 24);

    try {
      const upcoming = await db
        .select({
          id: appointments.id,
          startTime: appointments.startTime,
          patient: {
            name: users.name,
            email: users.email,
          },
          clinic: {
            name: clinics.name,
          }
        })
        .from(appointments)
        .innerJoin(users, eq(appointments.patientId, users.id))
        .innerJoin(clinics, eq(appointments.clinicId, clinics.id))
        .where(
          and(
            eq(appointments.status, "confirmed"),
            gte(appointments.startTime, rangeStart),
            lte(appointments.startTime, rangeEnd)
          )
        );

      console.log(`[ReminderWorker]: Found ${upcoming.length} appointments for reminder.`);

      for (const appt of upcoming) {
        // In a real app, send actual email/SMS here.
        // For now, we log and potentially create a notification record.
        console.log(`[REMINDER]: Sending reminder to ${appt.patient.name} (${appt.patient.email}) for appointment at ${appt.clinic.name} on ${appt.startTime}`);
        
        // Example: Create in-app notification
        // await db.insert(notifications).values({ ... });
      }

      return { processed: upcoming.length };
    } catch (err) {
      console.error("[ReminderWorker]: Error processing reminders:", err);
      throw err;
    }
  },
  { connection }
);

reminderWorker.on("completed", (job) => {
  console.log(`[ReminderWorker]: Job ${job.id} completed.`);
});

reminderWorker.on("failed", (job, err) => {
  console.error(`[ReminderWorker]: Job ${job?.id} failed with error ${err.message}`);
});
