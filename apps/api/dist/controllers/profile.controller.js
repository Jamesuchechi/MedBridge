"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertProfile = exports.getProfile = void 0;
const db_1 = require("@medbridge/db");
const drizzle_orm_1 = require("drizzle-orm");
const getProfile = async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    try {
        const [profile] = await db_1.db
            .select()
            .from(db_1.healthProfiles)
            .where((0, drizzle_orm_1.eq)(db_1.healthProfiles.userId, userId))
            .limit(1);
        if (!profile) {
            return res.status(404).json({ error: "Profile not found" });
        }
        res.status(200).json(profile);
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
        res.status(500).json({ error: "Failed to save profile", message: err.message });
    }
};
exports.upsertProfile = upsertProfile;
