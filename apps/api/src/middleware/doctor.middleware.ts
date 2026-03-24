import { Request, Response, NextFunction } from "express";
import { db, doctorProfiles } from "@medbridge/db";
import { eq } from "drizzle-orm";

/** User must have CLINICIAN role (set in Supabase user_metadata at signup). */
export const requireDoctor = (req: Request, res: Response, next: NextFunction) => {
  const role = req.headers["x-user-role"] as string | undefined;

  if (role !== "CLINICIAN" && role !== "doctor") {
    return res.status(403).json({
      error:   "Clinician access required.",
      message: "This feature is only available to registered doctors on MedBridge.",
    });
  }
  next();
};

/** User must be a CLINICIAN with an approved, copilot-enabled doctor profile. */
export const requireVerifiedDoctor = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const role   = req.headers["x-user-role"] as string | undefined;
  const userId = req.headers["x-user-id"]   as string | undefined;

  if (role !== "CLINICIAN" && role !== "doctor") {
    return res.status(403).json({
      error:   "Clinician access required.",
      code:    "NOT_CLINICIAN",
    });
  }

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const [profile] = await db
      .select({
        verificationStatus: doctorProfiles.verificationStatus,
        isCopilotEnabled:   doctorProfiles.isCopilotEnabled,
      })
      .from(doctorProfiles)
      .where(eq(doctorProfiles.userId, userId))
      .limit(1);

    if (!profile) {
      return res.status(403).json({
        error:   "Doctor profile not found.",
        code:    "NO_PROFILE",
        message: "Please complete your doctor registration before accessing this feature.",
      });
    }

    if (profile.verificationStatus !== "approved") {
      const messages: Record<string, string> = {
        pending:      "Your application is pending review. You'll receive an email when it's processed.",
        under_review: "Your application is currently under review. This usually takes less than 24 hours.",
        rejected:     "Your application was not approved. Please check your email for details.",
        suspended:    "Your account has been suspended. Please contact support.",
      };
      return res.status(403).json({
        error:              "Verification required.",
        code:               "NOT_VERIFIED",
        verificationStatus: profile.verificationStatus,
        message:            messages[profile.verificationStatus] || "Verification pending.",
      });
    }

    if (!profile.isCopilotEnabled) {
      return res.status(403).json({
        error:   "Copilot access not yet enabled.",
        code:    "COPILOT_DISABLED",
        message: "Your account is approved but copilot access is being configured. Please contact support.",
      });
    }

    next();
  } catch (err) {
    console.error("[requireVerifiedDoctor]:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
