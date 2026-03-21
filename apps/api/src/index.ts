import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "../../../.env") });

import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { db, users, healthProfiles } from "@medbridge/db";
import { eq } from "drizzle-orm";

import profileRoutes from "./routes/profile";
import symptomRoutes from "./routes/symptoms";

const app = express();
const port = process.env.PORT || 4000;

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use("/api/", limiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/symptoms", symptomRoutes);

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/db-test", async (req: Request, res: Response) => {
  try {
    const allUsers = await db.select().from(users).limit(1);
    res.status(200).json({ status: "connected", userCount: allUsers.length });
  } catch (err: any) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

app.post("/api/auth/sync", async (req: Request, res: Response) => {
  const { id, email, name, role } = req.body;

  if (!id || !email) {
    return res.status(400).json({ error: "Missing id or email" });
  }

  try {
    // 1. Upsert user
    const [user] = await db
      .insert(users)
      .values({
        id,
        email,
        name: name || null,
        role: (role?.toUpperCase() as any) || "PATIENT",
        isVerified: true,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          name: name || null,
          role: (role?.toUpperCase() as any) || "PATIENT",
          updatedAt: new Date(),
        },
      })
      .returning();

    // 2. Initialize health profile for PATIENTs
    if (user.role === "PATIENT") {
      const existing = await db
        .select()
        .from(healthProfiles)
        .where(eq(healthProfiles.userId, user.id))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(healthProfiles).values({
          userId: user.id,
        });
      }
    }

    res.status(200).json({ status: "synced", user });
  } catch (err: any) {
    console.error("[SYNC ERROR]:", err);
    res.status(500).json({ error: "Sync failed", message: err.message });
  }
});

// ─── Server ──────────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`[API]: Server is running at http://localhost:${port}`);
});

export default app;
