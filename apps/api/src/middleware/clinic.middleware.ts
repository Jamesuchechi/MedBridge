import { Request, Response, NextFunction } from "express";
import { db, clinics, users } from "@medbridge/db";
import { eq } from "drizzle-orm";

/** User must have CLINIC_ADMIN or CLINIC_STAFF role. */
export const requireClinicAccess = (req: Request, res: Response, next: NextFunction) => {
  const role = (req.headers["x-user-role"] as string | undefined)?.toUpperCase();

  if (role !== "CLINIC_ADMIN" && role !== "CLINIC_STAFF") {
    return res.status(403).json({
      error:   "Clinic access required.",
      message: "This feature is only available to registered clinic administrators and staff.",
    });
  }
  next();
};

/** User must have CLINIC_ADMIN role. */
export const requireClinicAdmin = (req: Request, res: Response, next: NextFunction) => {
  const role = (req.headers["x-user-role"] as string | undefined)?.toUpperCase();

  if (role !== "CLINIC_ADMIN") {
    return res.status(403).json({
      error:   "Clinic admin access required.",
      message: "This feature is restricted to clinic administrators.",
    });
  }
  next();
};

/** Clinic must be approved. */
export const requireVerifiedClinic = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.headers["x-user-id"] as string | undefined;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Optimization: Join users and clinics to verify status in a single query
    const [result] = await db
      .select({
        clinicId:           users.clinicId,
        verificationStatus: clinics.verificationStatus,
      })
      .from(users)
      .innerJoin(clinics, eq(users.clinicId, clinics.id))
      .where(eq(users.id, userId))
      .limit(1);

    if (!result?.clinicId) {
      return res.status(403).json({
        error: "Not associated with an active clinic.",
        code:  "NO_CLINIC",
      });
    }

    // Attach to request for controllers to use
    req.clinicId     = result.clinicId;
    req.clinicStatus = result.verificationStatus;

    if (result.verificationStatus !== "approved") {
      const messages: Record<string, string> = {
        pending:  "Your clinic application is pending review. You'll receive an email when it's approved.",
        rejected: "Your clinic application was not approved. Please contact support for details.",
      };
      return res.status(403).json({
        error:   "Clinic verification required.",
        code:    "CLINIC_NOT_VERIFIED",
        status:  result.verificationStatus,
        message: messages[result.verificationStatus] || "Verification pending.",
      });
    }

    next();
  } catch (err) {
    console.error("[requireVerifiedClinic]:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
