"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfileUploadUrl = exports.upsertProfile = exports.getProfile = void 0;
const db_1 = require("@medbridge/db");
const drizzle_orm_1 = require("drizzle-orm");
const supabase_1 = require("../config/supabase");
const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || "avatars";
const getProfile = async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    try {
        const [data] = await db_1.db
            .select({
            profile: db_1.healthProfiles,
            user: {
                avatarUrl: db_1.users.avatarUrl,
                name: db_1.users.name,
            }
        })
            .from(db_1.healthProfiles)
            .innerJoin(db_1.users, (0, drizzle_orm_1.eq)(db_1.healthProfiles.userId, db_1.users.id))
            .where((0, drizzle_orm_1.eq)(db_1.healthProfiles.userId, userId))
            .limit(1);
        if (!data) {
            // Still need to check if user exists even if profile doesn't
            const [u] = await db_1.db.select({ avatarUrl: db_1.users.avatarUrl }).from(db_1.users).where((0, drizzle_orm_1.eq)(db_1.users.id, userId)).limit(1);
            return res.status(200).json({ userId, avatarUrl: u?.avatarUrl });
        }
        res.status(200).json({
            ...data.profile,
            avatarUrl: data.user.avatarUrl,
        });
    }
    catch (err) {
        console.error("[GET PROFILE ERROR]:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getProfile = getProfile;
const upsertProfile = async (req, res) => {
    const userId = req.headers["x-user-id"];
    const data = req.body;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    try {
        // 1. Update user info if name provided
        if (data.firstName && data.lastName) {
            await db_1.db
                .update(db_1.users)
                .set({
                name: `${data.firstName} ${data.lastName}`,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(db_1.users.id, userId));
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
        const [profile] = await db_1.db
            .insert(db_1.healthProfiles)
            .values(profileData)
            .onConflictDoUpdate({
            target: db_1.healthProfiles.userId, // Error here if userId is not a unique constraint/index, but we skip it for now or assume it is.
            set: profileData,
        })
            .returning();
        res.status(200).json({ status: "success", profile });
    }
    catch (err) {
        console.error("[UPSERT PROFILE ERROR]:", err);
        res.status(500).json({ error: "Failed to save profile", message: err instanceof Error ? err.message : String(err) });
    }
};
exports.upsertProfile = upsertProfile;
const getProfileUploadUrl = async (req, res) => {
    const userId = req.headers["x-user-id"];
    const { fileName, type } = req.query;
    if (!userId)
        return res.status(401).json({ error: "Unauthorized" });
    if (!fileName || !type)
        return res.status(400).json({ error: "fileName and type (avatar|cover) are required" });
    const extension = fileName.split(".").pop();
    const path = `${userId}/${type}.${extension}`;
    try {
        const { data, error } = await supabase_1.supabase.storage
            .from(BUCKET_NAME)
            .createSignedUploadUrl(path);
        if (error)
            throw error;
        res.status(200).json({
            uploadUrl: data.signedUrl,
            fileUrl: `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${path}`,
            path,
        });
    }
    catch (err) {
        console.error("[GET PROFILE UPLOAD URL ERROR]:", err);
        res.status(500).json({ error: "Failed to generate upload URL", message: err instanceof Error ? err.message : String(err) });
    }
};
exports.getProfileUploadUrl = getProfileUploadUrl;
