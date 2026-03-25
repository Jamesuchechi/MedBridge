import { db, users, clinicPatients, patientClinicConsent, healthProfiles } from "@medbridge/db";
import { eq, and, or } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { ExtractedPatient } from "./import.service";

export class RegistrationService {
  /** Internal helper for registration logic. Shared by API and Worker. */
  static async performRegistration(clinicId: string, p: Partial<ExtractedPatient>) {
    const { email, name, phone, dob, gender } = p;

    // 1. Check for existing user by email or phone
    let user = await db.query.users.findFirst({
      where: or(
        email ? eq(users.email, email) : undefined,
        phone ? eq(users.phone, phone) : undefined
      ),
    });

    if (!user) {
      // 2. Create new user if not found
      const [newUser] = await db.insert(users).values({
        email: email || `${uuidv4()}@medbridge.temp`,
        name: name || "Imported Patient",
        phone,
        role: "PATIENT",
        isVerified: false,
      }).returning();
      user = newUser;

      // 3. Create health profile
      await db.insert(healthProfiles).values({
        userId: newUser.id,
        dob,
        gender,
        phone,
      });
    }

    // 4. Link to clinic if not already linked
    const existingLink = await db.query.clinicPatients.findFirst({
      where: and(eq(clinicPatients.clinicId, clinicId), eq(clinicPatients.patientId, user.id)),
    });

    if (!existingLink) {
      await db.insert(clinicPatients).values({ clinicId, patientId: user.id });
      await db.insert(patientClinicConsent).values({ clinicId, patientId: user.id, status: "active" });
    }

    return user;
  }
}
