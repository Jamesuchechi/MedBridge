import { Request, Response } from "express";
import { db, appointments, doctorAvailability, users } from "@medbridge/db";
import { eq, and, or, gte, lte, sql, desc, ne } from "drizzle-orm";
import { startOfDay, endOfDay, format, parse, addMinutes, isBefore, isAfter } from "date-fns";

export class AppointmentsController {
  /** Create a new appointment. Checks for conflicts and availability. */
  static async createAppointment(req: Request, res: Response) {
    const { clinicId } = req;
    const { patientId, doctorId, startTime, endTime, type, reason, notes } = req.body;

    if (!clinicId) return res.status(403).json({ error: "Clinic access required." });
    if (!patientId || !doctorId || !startTime || !endTime) {
      return res.status(400).json({ error: "Patient, Doctor, Start Time, and End Time are required." });
    }

    try {
      const start = new Date(startTime);
      const end = new Date(endTime);

      // 1. Check for conflicts (Overlapping appointments for the same doctor)
      const conflicts = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.doctorId, doctorId),
            eq(appointments.clinicId, clinicId),
            ne(appointments.status, "cancelled"),
            or(
              and(gte(appointments.startTime, start), lte(appointments.startTime, end)),
              and(gte(appointments.endTime, start), lte(appointments.endTime, end)),
              and(lte(appointments.startTime, start), gte(appointments.endTime, end))
            )
          )
        )
        .limit(1);

      if (conflicts.length > 0) {
        return res.status(409).json({ error: "The doctor has a conflicting appointment at this time." });
      }

      // 2. Create the appointment
      const [newAppointment] = await db.insert(appointments).values({
        clinicId,
        patientId,
        doctorId,
        startTime: start,
        endTime: end,
        type: type || "consultation",
        reason,
        notes,
        status: "pending",
      }).returning();

      return res.status(201).json(newAppointment);
    } catch (err) {
      console.error("[createAppointment]:", err);
      return res.status(500).json({ error: "Failed to create appointment." });
    }
  }

  /** List appointments with filters. */
  static async listAppointments(req: Request, res: Response) {
    const { clinicId } = req;
    const { doctorId, patientId, status, startDate, endDate } = req.query;

    if (!clinicId) return res.status(403).json({ error: "Clinic access required." });

    try {
      const filters = [eq(appointments.clinicId, clinicId)];
      if (doctorId) filters.push(eq(appointments.doctorId, doctorId as string));
      if (patientId) filters.push(eq(appointments.patientId, patientId as string));
      if (status) filters.push(eq(appointments.status, status as "pending" | "confirmed" | "completed" | "cancelled" | "no_show"));
      if (startDate) filters.push(gte(appointments.startTime, new Date(startDate as string)));
      if (endDate) filters.push(lte(appointments.endTime, new Date(endDate as string)));

      const data = await db
        .select({
          id: appointments.id,
          startTime: appointments.startTime,
          endTime: appointments.endTime,
          status: appointments.status,
          type: appointments.type,
          reason: appointments.reason,
          patient: {
            id: users.id,
            name: users.name,
          },
          doctor: {
            id: sql`d.id`,
            name: sql`d.name`,
          }
        })
        .from(appointments)
        .innerJoin(users, eq(appointments.patientId, users.id))
        .innerJoin(sql`${users} as d`, eq(appointments.doctorId, sql`d.id`))
        .where(and(...filters))
        .orderBy(desc(appointments.startTime));

      return res.status(200).json(data);
    } catch (err) {
      console.error("[listAppointments]:", err);
      return res.status(500).json({ error: "Failed to fetch appointments." });
    }
  }

  /** Update appointment status. */
  static async updateStatus(req: Request, res: Response) {
    const { clinicId } = req;
    const { id } = req.params;
    const { status } = req.body;

    if (!clinicId) return res.status(403).json({ error: "Clinic access required." });

    try {
      const [updated] = await db
        .update(appointments)
        .set({ status, updatedAt: new Date() })
        .where(and(eq(appointments.id, id), eq(appointments.clinicId, clinicId)))
        .returning();

      if (!updated) return res.status(404).json({ error: "Appointment not found." });

      return res.status(200).json(updated);
    } catch (err) {
      console.error("[updateStatus]:", err);
      return res.status(500).json({ error: "Failed to update appointment status." });
    }
  }

  /** Calculate available slots for a doctor on a specific date. */
  static async getAvailableSlots(req: Request, res: Response) {
    const { clinicId } = req;
    const { doctorId, date: dateStr } = req.query;

    if (!clinicId) return res.status(403).json({ error: "Clinic access required." });
    if (!doctorId || !dateStr) {
      return res.status(400).json({ error: "Doctor ID and Date are required." });
    }

    try {
      const targetDate = new Date(dateStr as string);
      const dayOfWeek = targetDate.getDay();

      // 1. Get doctor availability for this day
      const availability = await db
        .select()
        .from(doctorAvailability)
        .where(
          and(
            eq(doctorAvailability.doctorId, doctorId as string),
            eq(doctorAvailability.clinicId, clinicId),
            eq(doctorAvailability.dayOfWeek, dayOfWeek)
          )
        );

      // Default to 9 AM - 5 PM if no specific availability is set
      const slots = availability.length > 0 
        ? availability 
        : [{ startTime: "09:00", endTime: "17:00" }];

      // 2. Get existing bookings for this day
      const startOfTarget = startOfDay(targetDate);
      const endOfTarget = endOfDay(targetDate);

      const bookings = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.doctorId, doctorId as string),
            eq(appointments.clinicId, clinicId),
            ne(appointments.status, "cancelled"),
            gte(appointments.startTime, startOfTarget),
            lte(appointments.endTime, endOfTarget)
          )
        )
        .orderBy(appointments.startTime);

      // 3. Generate slots (30-minute intervals)
      const availableSlots: { start: string; end: string }[] = [];
      
      for (const avail of slots) {
        let current = parse(avail.startTime, "HH:mm", targetDate);
        const endDay = parse(avail.endTime, "HH:mm", targetDate);

        while (isBefore(current, endDay)) {
          const slotEnd = addMinutes(current, 30);
          
          // Check if this slot overlaps with any booking
          const isBooked = bookings.find(b => {
             return (
               (isBefore(current, b.endTime) && isAfter(slotEnd, b.startTime))
             );
          });

          if (!isBooked) {
            availableSlots.push({
              start: format(current, "yyyy-MM-dd'T'HH:mm:ss"),
              end: format(slotEnd, "yyyy-MM-dd'T'HH:mm:ss"),
            });
          }
          current = slotEnd;
        }
      }

      return res.status(200).json(availableSlots);
    } catch (err) {
      console.error("[getAvailableSlots]:", err);
      return res.status(500).json({ error: "Failed to calculate slots." });
    }
  }
}
