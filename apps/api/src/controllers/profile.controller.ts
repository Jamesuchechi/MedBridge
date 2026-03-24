import { Request, Response } from "express";
import { db, healthProfiles, users } from "@medbridge/db";
import { eq } from "drizzle-orm";
import { supabase } from "../config/supabase";

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || "avatars";

export const getProfile = async (req: Request, res: Response) => {
  const userId = req.headers["x-user-id"] as string;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const [data] = await db
      .select({
        profile: healthProfiles,
        user: {
          avatarUrl: users.avatarUrl,
          name: users.name,
        }
      })
      .from(healthProfiles)
      .innerJoin(users, eq(healthProfiles.userId, users.id))
      .where(eq(healthProfiles.userId, userId))
      .limit(1);

    if (!data) {
      // Still need to check if user exists even if profile doesn't
      const [u] = await db.select({ avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, userId)).limit(1);
      return res.status(200).json({ userId, avatarUrl: u?.avatarUrl });
    }

    res.status(200).json({
      ...data.profile,
      avatarUrl: data.user.avatarUrl,
    });
  } catch (err) {
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
      vaccinations: JSON.stringify(data.vaccinations || []),
      medicalHistory: JSON.stringify(data.medicalHistory || []),
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
  } catch (err) {
    console.error("[UPSERT PROFILE ERROR]:", err);
    res.status(500).json({ error: "Failed to save profile", message: err instanceof Error ? err.message : String(err) });
  }
};

export const getProfileUploadUrl = async (req: Request, res: Response) => {
  const userId = req.headers["x-user-id"] as string;
  const { fileName, type } = req.query;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!fileName || !type) return res.status(400).json({ error: "fileName and type (avatar|cover) are required" });

  const extension = (fileName as string).split(".").pop();
  const path = `${userId}/${type}.${extension}`;

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(path);

    if (error) throw error;

    res.status(200).json({
      uploadUrl: data.signedUrl,
      fileUrl: `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${path}`,
      path,
    });
  } catch (err) {
    console.error("[GET PROFILE UPLOAD URL ERROR]:", err);
    res.status(500).json({ error: "Failed to generate upload URL", message: err instanceof Error ? err.message : String(err) });
  }
};
