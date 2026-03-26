import { Request, Response, NextFunction } from "express";
import { db, employers, users } from "@medbridge/db";
import { eq } from "drizzle-orm";

/** User must have EMPLOYER role. */
export const requireEmployerAccess = (req: Request, res: Response, next: NextFunction) => {
  const role = (req.headers["x-user-role"] as string | undefined)?.toUpperCase();

  if (role !== "EMPLOYER") {
    return res.status(403).json({
      error:   "Employer access required.",
      message: "This feature is only available to registered employer accounts.",
    });
  }
  next();
};

/** Employer must be approved. */
export const requireVerifiedEmployer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.headers["x-user-id"] as string | undefined;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const [result] = await db
      .select({
        employerId:           users.employerId,
        verificationStatus: employers.verificationStatus,
      })
      .from(users)
      .innerJoin(employers, eq(users.employerId, employers.id))
      .where(eq(users.id, userId))
      .limit(1);

    if (!result?.employerId) {
      return res.status(403).json({
        error: "Not associated with an active employer account.",
        code:  "NO_EMPLOYER",
      });
    }

    req.employerId     = result.employerId;
    req.employerStatus = result.verificationStatus;

    if (result.verificationStatus !== "approved") {
      const messages: Record<string, string> = {
        pending:  "Your employer account is pending review.",
        rejected: "Your employer account application was not approved.",
      };
      return res.status(403).json({
        error:   "Employer verification required.",
        code:    "EMPLOYER_NOT_VERIFIED",
        status:  result.verificationStatus,
        message: messages[result.verificationStatus] || "Verification pending.",
      });
    }

    next();
  } catch (err) {
    console.error("[requireVerifiedEmployer]:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
