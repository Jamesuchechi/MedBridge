import { Request, Response } from "express";
import { db, labs } from "@medbridge/db";
import { and, eq, ilike, or } from "drizzle-orm";

export class LabsController {
  /**
   * List all labs with optional filtering by state/lga
   */
  static async getLabs(req: Request, res: Response) {
    const { state, lga } = req.query;

    try {
      let query = db.select().from(labs);
      
      if (state && lga) {
        // @ts-expect-error - query builder type mismatch during conditional filtering
        query = query.where(and(eq(labs.state, String(state)), eq(labs.lga, String(lga))));
      } else if (state) {
        // @ts-expect-error - query builder type mismatch during conditional filtering
        query = query.where(eq(labs.state, String(state)));
      }

      const results = await query;
      return res.status(200).json(results);
    } catch (error) {
      console.error("Failed to fetch labs:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Get specific lab details
   */
  static async getLabDetails(req: Request, res: Response) {
    const { id } = req.params;

    try {
      const [lab] = await db.select().from(labs).where(eq(labs.id, id)).limit(1);
      if (!lab) return res.status(404).json({ error: "Lab not found" });
      return res.status(200).json(lab);
    } catch (error) {
      console.error("Failed to fetch lab details:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Search labs by name or location
   */
  static async searchLabs(req: Request, res: Response) {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Search query required" });

    try {
      const results = await db
        .select()
        .from(labs)
        .where(
          or(
            ilike(labs.name, `%${String(q)}%`),
            ilike(labs.address, `%${String(q)}%`),
            ilike(labs.state, `%${String(q)}%`)
          )
        );
      return res.status(200).json(results);
    } catch (error) {
      console.error("Failed to search labs:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}
