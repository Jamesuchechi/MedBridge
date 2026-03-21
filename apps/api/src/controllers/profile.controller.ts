import { Request, Response } from "express";
import { db, healthProfiles, users } from "@medbridge/db";
import { eq } from "drizzle-orm";

export const getProfile = async (req: Request, res: Response) => {
  const userId = req.headers["x-user-id"] as string;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const [profile] = await db
      .select()
      .from(healthProfiles)
      .where(eq(healthProfiles.userId, userId))
      .limit(1);

    if (!profile) {
      // Return 200 with null values so frontend can still render the form
      return res.status(200).json({ userId });
    }

    res.status(200).json(profile);
  } catch (err: any) {
    console.error("[GET PROFILE ERROR]:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const upsertProfile = async (req: Request, res: Response) => {
  const userId = req.headers["x-user-id"] as string;
  const data = req.body;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // 1. Update user info if name provided
    if (data.firstName && data.lastName) {
      await db
        .update(users)
        .set({
          name: `${data.firstName} ${data.lastName}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }

    // 2. Upsert health profile
    const profileData = {
      userId,
      dob: data.dob || null,
      gender: data.sex || null,
      phone: data.phone || null,
      state: data.state || null,
      lga: data.lga || null,
      bloodGroup: data.bloodType || null,
      genotype: data.genotype || null,
      weight: data.weight || null,
      height: data.height || null,
      chronicConditions: JSON.stringify(data.chronicConditions || []),
      allergies: JSON.stringify(data.allergies || []),
      medications: JSON.stringify(data.medications || []),
      familyHistory: JSON.stringify(data.familyHistory || []),
      emergencyName: data.emergencyName || null,
      emergencyPhone: data.emergencyPhone || null,
      emergencyRelation: data.emergencyRelation || null,
      updatedAt: new Date(),
    };

    const [profile] = await db
      .insert(healthProfiles)
      .values(profileData)
      .onConflictDoUpdate({
        target: healthProfiles.userId, // Error here if userId is not a unique constraint/index, but we skip it for now or assume it is.
        set: profileData,
      })
      .returning();

    res.status(200).json({ status: "success", profile });
  } catch (err: any) {
    console.error("[UPSERT PROFILE ERROR]:", err);
    res.status(500).json({ error: "Failed to save profile", message: err.message });
  }
};
