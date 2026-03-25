import { Request, Response } from "express";
import { db, invoices, insuranceClaims } from "@medbridge/db";
import { eq, sql, desc } from "drizzle-orm";

export class BillingController {
  /**
   * Get high-level billing statistics for a clinic
   */
  static async getClinicStats(req: Request, res: Response) {
    const { clinicId } = req;
    if (!clinicId) return res.status(403).json({ error: "Clinic access required." });

    try {
      // 1. Get totals from invoices
      const [invoiceTotals] = await db
        .select({
          totalBilled: sql<string>`sum(${invoices.totalAmount})`,
          totalPaid: sql<string>`sum(${invoices.paidAmount})`,
          totalDue: sql<string>`sum(${invoices.dueAmount})`,
          count: sql<number>`count(*)`,
        })
        .from(invoices)
        .where(eq(invoices.clinicId, clinicId));

      // 2. Get insurance claim stats
      const [claimTotals] = await db
        .select({
          totalClaims: sql<number>`count(*)`,
          approvedAmount: sql<string>`sum(${insuranceClaims.approvedAmount})`,
          pendingClaims: sql<number>`count(*) FILTER (WHERE ${insuranceClaims.status} = 'submitted')`,
        })
        .from(insuranceClaims)
        .where(eq(insuranceClaims.clinicId, clinicId));

      return res.status(200).json({
        summary: {
          totalBilled: invoiceTotals?.totalBilled || "0.00",
          totalPaid: invoiceTotals?.totalPaid || "0.00",
          totalDue: invoiceTotals?.totalDue || "0.00",
          invoiceCount: Number(invoiceTotals?.count || 0),
        },
        insurance: {
          totalClaims: Number(claimTotals?.totalClaims || 0),
          approvedAmount: claimTotals?.approvedAmount || "0.00",
          pendingCount: Number(claimTotals?.pendingClaims || 0),
        }
      });
    } catch (error) {
      console.error("Failed to fetch clinic billing stats:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Get revenue breakdown by month
   */
  static async getRevenueInsights(req: Request, res: Response) {
    const { clinicId } = req;
    if (!clinicId) return res.status(403).json({ error: "Clinic access required." });

    try {
      const revenueByMonth = await db
        .select({
          month: sql<string>`to_char(${invoices.createdAt}, 'YYYY-MM')`,
          total: sql<string>`sum(${invoices.totalAmount})`,
          paid: sql<string>`sum(${invoices.paidAmount})`,
        })
        .from(invoices)
        .where(eq(invoices.clinicId, clinicId))
        .groupBy(sql`to_char(${invoices.createdAt}, 'YYYY-MM')`)
        .orderBy(desc(sql`to_char(${invoices.createdAt}, 'YYYY-MM')`));

      return res.status(200).json(revenueByMonth);
    } catch (error) {
      console.error("Failed to fetch revenue insights:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}
