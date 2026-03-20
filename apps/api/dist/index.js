"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, "../../../.env") });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const db_1 = require("@medbridge/db");
const drizzle_orm_1 = require("drizzle-orm");
const profile_1 = __importDefault(require("./routes/profile"));
const app = (0, express_1.default)();
const port = process.env.PORT || 4000;
// ─── Middleware ──────────────────────────────────────────────────────────────
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((0, morgan_1.default)("dev"));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
});
app.use("/api/", limiter);
// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/v1/profile", profile_1.default);
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});
app.get("/api/db-test", async (req, res) => {
    try {
        const allUsers = await db_1.db.select().from(db_1.users).limit(1);
        res.status(200).json({ status: "connected", userCount: allUsers.length });
    }
    catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});
app.post("/api/auth/sync", async (req, res) => {
    const { id, email, name, role } = req.body;
    if (!id || !email) {
        return res.status(400).json({ error: "Missing id or email" });
    }
    try {
        // 1. Upsert user
        const [user] = await db_1.db
            .insert(db_1.users)
            .values({
            id,
            email,
            name: name || null,
            role: role?.toUpperCase() || "PATIENT",
            isVerified: true,
            updatedAt: new Date(),
        })
            .onConflictDoUpdate({
            target: db_1.users.id,
            set: {
                name: name || null,
                role: role?.toUpperCase() || "PATIENT",
                updatedAt: new Date(),
            },
        })
            .returning();
        // 2. Initialize health profile for PATIENTs
        if (user.role === "PATIENT") {
            const existing = await db_1.db
                .select()
                .from(db_1.healthProfiles)
                .where((0, drizzle_orm_1.eq)(db_1.healthProfiles.userId, user.id))
                .limit(1);
            if (existing.length === 0) {
                await db_1.db.insert(db_1.healthProfiles).values({
                    userId: user.id,
                });
            }
        }
        res.status(200).json({ status: "synced", user });
    }
    catch (err) {
        console.error("[SYNC ERROR]:", err);
        res.status(500).json({ error: "Sync failed", message: err.message });
    }
});
// ─── Server ──────────────────────────────────────────────────────────────────
app.listen(port, () => {
    console.log(`[API]: Server is running at http://localhost:${port}`);
});
exports.default = app;
