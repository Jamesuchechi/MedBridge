import { Request, Response } from "express";
import { db, employers, users, employerEmployees, employerInvitations } from "@medbridge/db";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export class EmployerController {
  /** Register a new employer. Called by EMPLOYER admin at signup/onboarding. */
  static async registerEmployer(req: Request, res: Response) {
    const userId = req.headers["x-user-id"] as string;
    const { name, email, phone, address, state, lga, industry, size } = req.body;

    if (!name || !email || !state) {
      return res.status(400).json({ error: "Missing required fields (name, email, state)." });
    }

    try {
      // 1. Create employer
      const [newEmployer] = await db
        .insert(employers)
        .values({
          name,
          email,
          phone,
          address,
          state,
          lga,
          industry,
          size,
          verificationStatus: "pending",
        })
        .returning();

      // 2. Link user to employer and set role to EMPLOYER
      await db
        .update(users)
        .set({
          employerId: newEmployer.id,
          role: "EMPLOYER",
        })
        .where(eq(users.id, userId));

      return res.status(201).json(newEmployer);
    } catch (err) {
      console.error("[registerEmployer]:", err);
      return res.status(500).json({ error: "Failed to register employer." });
    }
  }

  /** Get employer detail for the current user. */
  static async getMyEmployer(req: Request, res: Response) {
    const userId = req.headers["x-user-id"] as string;
    
    try {
      // If req.employerId is set by middleware, use it. Otherwise find it from the user.
      const employerId = req.employerId || (await db.select({ employerId: users.employerId }).from(users).where(eq(users.id, userId)).limit(1))[0]?.employerId;

      if (!employerId) {
        return res.status(403).json({ error: "Not associated with an employer account." });
      }

      const [employer] = await db.select().from(employers).where(eq(employers.id, employerId)).limit(1);
      
      if (!employer) {
        return res.status(404).json({ error: "Employer record not found." });
      }

      return res.status(200).json(employer);
    } catch (err) {
      console.error("[getMyEmployer]:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  /** List employees for the employer. */
  static async getEmployees(req: Request, res: Response) {
    const { employerId } = req;
    if (!employerId) return res.status(403).json({ error: "Forbidden: No employer associated." });

    try {
      const employees = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          employeeIdNumber: employerEmployees.employeeIdNumber,
          department: employerEmployees.department,
          status: employerEmployees.status,
          joinedAt: employerEmployees.joinedAt,
        })
        .from(employerEmployees)
        .innerJoin(users, eq(employerEmployees.employeeId, users.id))
        .where(eq(employerEmployees.employerId, employerId))
        .orderBy(users.name);

      return res.status(200).json(employees);
    } catch (err) {
      console.error("[getEmployees]:", err);
      return res.status(500).json({ error: "Failed to fetch employees." });
    }
  }

  /** Invite an employee. */
  static async inviteEmployee(req: Request, res: Response) {
    const { employerId } = req;
    const { email, department, employeeIdNumber } = req.body;

    if (!employerId) return res.status(403).json({ error: "Forbidden: No employer associated." });
    if (!email) return res.status(400).json({ error: "Email is required." });

    try {
      const token = uuidv4();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 14); // 14 days for employees

      const [invitation] = await db.insert(employerInvitations).values({
        employerId,
        email,
        department,
        employeeIdNumber,
        token,
        expiresAt,
        status: "pending",
      }).returning();

      // Log/Console simulate email
      console.log(`[EMPLOYEE_INVITE]: Sent to ${email} for employer ${employerId}`);

      return res.status(201).json(invitation);
    } catch (err) {
      console.error("[inviteEmployee]:", err);
      return res.status(500).json({ error: "Failed to create invitation." });
    }
  }
}
